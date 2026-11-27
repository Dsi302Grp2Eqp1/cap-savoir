// Accès aux demandes formateur de la collection Demande (US05, US06, US07, US38).
// Les demandes de validation de formation (type VALIDATION) ne sont jamais lues ici.
const { Demande } = require('../models');

const TYPE = 'FORMATEUR';

function creer(donnees) {
  return Demande.create({ ...donnees, type: TYPE });
}

// US05 : une seule demande EN_ATTENTE par utilisateur.
function trouverEnAttente(utilisateurId) {
  return Demande.findOne({ type: TYPE, 'demandeur._id': utilisateurId, statut: 'EN_ATTENTE' }).lean();
}

// US07 : demandes de l'utilisateur, la plus récente d'abord.
function listerParDemandeur(utilisateurId) {
  return Demande.find({ type: TYPE, 'demandeur._id': utilisateurId })
    .sort({ dateSoumission: -1 })
    .lean();
}

// US06 : liste de l'agent, filtrée par statut si besoin (les plus anciennes d'abord).
function lister(statut) {
  const filtre = { type: TYPE };
  if (statut) filtre.statut = statut;
  return Demande.find(filtre).sort({ dateSoumission: 1 }).lean();
}

function trouverParId(id) {
  return Demande.findOne({ _id: id, type: TYPE }).lean();
}

// US38 : la décision n'est enregistrée que si la demande est encore EN_ATTENTE.
// Renvoie null si elle a déjà été traitée (même en cas de double clic simultané).
function enregistrerDecision(id, decision) {
  return Demande.findOneAndUpdate(
    { _id: id, type: TYPE, statut: 'EN_ATTENTE' },
    { $set: decision },
    { returnDocument: 'after' },
  ).lean();
}

module.exports = { creer, trouverEnAttente, listerParDemandeur, lister, trouverParId, enregistrerDecision };
