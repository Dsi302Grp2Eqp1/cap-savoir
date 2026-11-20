// US18 : logique métier du paiement. Les routes et le contrôleur ne font que l'appeler.
const { Types, isObjectIdOrHexString } = require('mongoose');
const { Formation, Inscription } = require('../models');
const passerelle = require('./passerelle');
const ErreurApi = require('../utils/erreur-api');

function verifierIdentifiant(id, champ) {
  if (!isObjectIdOrHexString(id)) throw new ErreurApi(400, `${champ} invalide.`);
}

// Une inscription par apprenant/formation (index unique). Deux requêtes simultanées
// peuvent provoquer une erreur de doublon (11000) : on relit alors l'inscription créée.
async function obtenirOuCreerInscription(apprenantId, formationId) {
  const requete = () => Inscription.findOneAndUpdate(
    { apprenantId, formationId },
    { $setOnInsert: { dateInscription: new Date(), statut: 'EN_ATTENTE_PAIEMENT',
                      paiements: [], chapitresConsultes: [] } },
    { upsert: true, returnDocument: 'after' }
  );
  try {
    return await requete();
  } catch (err) {
    if (err?.code !== 11000) throw err;
    return requete();
  }
}

// POST /checkout : le prix vient de la base, jamais du client.
async function creerCheckout(utilisateur, formationId) {
  verifierIdentifiant(formationId, 'formationId');

  const formation = await Formation.findOne({ _id: formationId, statut: 'PUBLIEE' }).lean();
  if (!formation) throw new ErreurApi(404, 'Formation introuvable.');
  if (formation.prix === 0) throw new ErreurApi(400, 'Formation gratuite : pas de paiement.');

  const inscription = await obtenirOuCreerInscription(utilisateur._id, formation._id);
  if (inscription.statut === 'ACTIVE') throw new ErreurApi(409, 'Déjà inscrit et payé.');

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

  return { url: session.url, paiementId };
}

// Idempotent : seul un paiement EN_ATTENTE au montant identique est modifié.
async function traiterNotification(reference) {
  const resultat = await passerelle.verifier(reference);
  if (!resultat) throw new ErreurApi(404, 'Paiement inconnu chez la passerelle.');
  // Paiement encore en cours chez la passerelle : rien à faire.
  if (resultat.statut !== 'CONFIRME' && resultat.statut !== 'ECHOUE') return;

  const maj = { $set: { 'paiements.$.statut': resultat.statut } };
  if (resultat.statut === 'CONFIRME') {
    maj.$set['paiements.$.datePaiement'] = new Date();
    maj.$set.statut = 'ACTIVE'; // activerAcces() du diagramme
  }
  await Inscription.updateOne(
    { paiements: { $elemMatch: {
        referenceTransaction: reference, statut: 'EN_ATTENTE', montant: resultat.montant } } },
    maj
  );
}

// Webhook : la signature est vérifiée par la passerelle, le corps n'est jamais cru tel quel.
async function traiterWebhook(corpsBrut, signature) {
  let reference;
  try {
    reference = passerelle.lireEvenement(corpsBrut, signature);
  } catch {
    throw new ErreurApi(400, 'Signature invalide.');
  }
  if (reference) await traiterNotification(reference); // null : événement ignoré
}

// GET /:paiementId/statut : un apprenant ne voit que ses propres paiements.
async function lireStatut(utilisateur, paiementId) {
  verifierIdentifiant(paiementId, 'paiementId');

  const lire = () => Inscription.findOne(
    { apprenantId: utilisateur._id, 'paiements._id': paiementId }
  ).lean();
  const trouver = (insc) =>
    insc.paiements.find((p) => String(p._id) === String(paiementId).toLowerCase());

  let inscription = await lire();
  if (!inscription) throw new ErreurApi(404, 'Paiement introuvable.');
  let paiement = trouver(inscription);

  // Sans webhook (exécution locale), on interroge la passerelle au retour de l'apprenant.
  if (paiement.statut === 'EN_ATTENTE') {
    try {
      await traiterNotification(paiement.referenceTransaction);
      inscription = await lire();
      paiement = trouver(inscription);
    } catch (err) {
      console.error('verification paiement', err.message); // on garde le statut actuel
    }
  }
  return { paiement: paiement.statut, inscription: inscription.statut };
}

module.exports = { creerCheckout, traiterWebhook, lireStatut };