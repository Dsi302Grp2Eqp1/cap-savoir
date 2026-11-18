const express = require('express');
const { Types } = require('mongoose');
const { Formation, Inscription } = require('../models');
const passerelle = require('../services/passerelle');

const router = express.Router();
const FRONT_URL = () => process.env.FRONT_URL || 'http://localhost:4200';
const REFERENCE = /^[0-9a-f]{24}$/;

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
if (process.env.NODE_ENV !== 'production') {
  router.get('/mock/:reference', (req, res) => {
    const { reference } = req.params;
    if (!REFERENCE.test(reference)) return res.sendStatus(400);
    res.send(`<h1>Passerelle fictive</h1>
      <p><a href="/api/paiements/mock/${reference}/CONFIRME">Payer</a></p>
      <p><a href="/api/paiements/mock/${reference}/ECHOUE">Annuler / échec</a></p>`);
  });

  router.get('/mock/:reference/:resultat', async (req, res) => {
    const { reference, resultat } = req.params;
    if (!REFERENCE.test(reference) || !['CONFIRME', 'ECHOUE'].includes(resultat)) {
      return res.sendStatus(400);
    }
    if (!passerelle.simuler(reference, resultat)) return res.sendStatus(404);
    await traiterNotification(reference); // simule l'appel du webhook par la passerelle
    // Retour de l'apprenant vers la page du frontend, qui lit ensuite /:paiementId/statut
    res.redirect(`${FRONT_URL()}/paiement/resultat?ref=${reference}`);
  });
}

// POST /api/paiements/checkout  { formationId }
// Nécessite l'authentification (US02) : elle doit renseigner req.utilisateur._id.
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
    reference: String(paiementId), montant: formation.prix, titre: formation.titre
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

// POST /api/paiements/webhook : public, appelé par la passerelle.
router.post('/webhook', async (req, res) => {
  const reference = req.body?.reference;
  if (typeof reference !== 'string') return res.sendStatus(400);
  res.sendStatus(await traiterNotification(reference));
});

// GET /api/paiements/:paiementId/statut : confirmation affichée à l'apprenant.
router.get('/:paiementId/statut', async (req, res) => {
  const apprenantId = req.utilisateur?._id;
  if (!apprenantId) return res.sendStatus(401);

  const { paiementId } = req.params;
  if (!Types.ObjectId.isValid(paiementId)) {
    return res.status(400).json({ erreur: 'paiementId invalide' });
  }
  // Un apprenant ne voit que ses propres paiements.
  const inscription = await Inscription.findOne(
    { apprenantId, 'paiements._id': paiementId }
  ).lean();
  if (!inscription) return res.sendStatus(404);

  const paiement = inscription.paiements.find(p => String(p._id) === paiementId);
  res.json({ paiement: paiement.statut, inscription: inscription.statut });
});

module.exports = router;