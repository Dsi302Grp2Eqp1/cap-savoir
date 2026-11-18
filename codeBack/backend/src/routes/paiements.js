const express = require('express');
const { Types } = require('mongoose');
const { Formation, Inscription } = require('../models');
const passerelle = require('../services/passerelle');
const { authentifier, exigerRole } = require('../middlewares/authentification');

const router = express.Router();

// US02 / US03 : seul un apprenant connecté peut payer et consulter ses paiements.
// Le webhook Stripe n'est pas ici : il est monté dans app.js, sans authentification.
router.use(authentifier, exigerRole('APPRENANT'));



// Traite la notification de la passerelle. Idempotent. Retourne un code HTTP.
async function traiterNotification(reference) {
  const resultat = await passerelle.verifier(reference);
  if (!resultat) return 404;
  // Paiement encore en cours chez la passerelle : rien à faire.
  if (resultat.statut !== 'CONFIRME' && resultat.statut !== 'ECHOUE') return 200;

  const confirme = resultat.statut === 'CONFIRME';
  const maj = { $set: { 'paiements.$.statut': resultat.statut } };
  if (confirme) {
    maj.$set['paiements.$.datePaiement'] = new Date();
    maj.$set.statut = 'ACTIVE'; // activerAcces() du diagramme
  }
  // Ne traite qu'un paiement EN_ATTENTE dont le montant correspond.
  await Inscription.updateOne(
    { paiements: { $elemMatch: {
        referenceTransaction: reference, statut: 'EN_ATTENTE', montant: resultat.montant } } },
    maj
  );
  return 200;
}

// --- MOCK (désactivé en production) : page de la fausse passerelle ---


// POST /api/paiements/checkout  { formationId }
// Authentification (US02) assurée par router.use ci-dessus : req.utilisateur._id.
router.post('/checkout', async (req, res) => {
  const apprenantId = req.utilisateur?._id;
  if (!apprenantId) return res.sendStatus(401);

  const { formationId } = req.body ?? {};
  if (!Types.ObjectId.isValid(formationId)) {
    return res.status(400).json({ erreur: 'formationId invalide' });
  }

  // Le prix vient de la base, jamais du client.
  const formation = await Formation.findOne({ _id: formationId, statut: 'PUBLIEE' }).lean();
  if (!formation) return res.status(404).json({ erreur: 'Formation introuvable' });
  if (formation.prix === 0) {
    return res.status(400).json({ erreur: 'Formation gratuite : pas de paiement' });
  }

  const inscription = await Inscription.findOneAndUpdate(
    { apprenantId, formationId },
    { $setOnInsert: { dateInscription: new Date(), statut: 'EN_ATTENTE_PAIEMENT',
                      paiements: [], chapitresConsultes: [] } },
    { upsert: true, returnDocument: 'after' }
  );
  if (inscription.statut === 'ACTIVE') {
    return res.status(409).json({ erreur: 'Déjà inscrit et payé' });
  }

  const paiementId = new Types.ObjectId();
  const session = await passerelle.creerSession({
    paiementId: String(paiementId), montant: formation.prix, titre: formation.titre
  });

  await Inscription.updateOne({ _id: inscription._id }, {
    $set: { statut: 'EN_ATTENTE_PAIEMENT' },
    $push: { paiements: {
      _id: paiementId, montant: formation.prix, moyen: session.moyen,
      referenceTransaction: session.reference, statut: 'EN_ATTENTE'
    } }
  });

  res.status(201).json({ url: session.url, paiementId });
});

// Appelé par Stripe (route montée dans app.js avec le corps brut).
async function webhook(req, res) {
  let reference;
  try {
    reference = passerelle.lireEvenement(req.body, req.headers['stripe-signature']);
  } catch {
    return res.sendStatus(400); // signature invalide
  }
  if (!reference) return res.sendStatus(200); // événement ignoré
  res.sendStatus(await traiterNotification(reference));
}

// GET /api/paiements/:paiementId/statut : confirmation affichée à l'apprenant.
router.get('/:paiementId/statut', async (req, res) => {
  const apprenantId = req.utilisateur?._id;
  if (!apprenantId) return res.sendStatus(401);

  const { paiementId } = req.params;
  if (!Types.ObjectId.isValid(paiementId)) {
    return res.status(400).json({ erreur: 'paiementId invalide' });
  }
  // Un apprenant ne voit que ses propres paiements.
  const lire = () => Inscription.findOne(
    { apprenantId, 'paiements._id': paiementId }
  ).lean();
  const trouver = (insc) => insc.paiements.find(p => String(p._id) === paiementId);

  let inscription = await lire();
  if (!inscription) return res.sendStatus(404);
  let paiement = trouver(inscription);

  // Hors cours : sans webhook (exécution locale), on interroge la passerelle
  // au retour de l'apprenant. Même vérification serveur à serveur que le webhook.
  if (paiement.statut === 'EN_ATTENTE') {
    try {
      await traiterNotification(paiement.referenceTransaction);
      inscription = await lire();
      paiement = trouver(inscription);
    } catch (err) {
      console.error('verification paiement', err.message); // on garde le statut actuel
    }
  }
  res.json({ paiement: paiement.statut, inscription: inscription.statut });
});

module.exports = router;
module.exports.webhook = webhook;
