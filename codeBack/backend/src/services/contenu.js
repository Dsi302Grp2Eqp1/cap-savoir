// US19 : accès au contenu d'une formation après paiement confirmé.
const { isObjectIdOrHexString } = require('mongoose');
const { Formation, Inscription } = require('../models');
const ErreurApi = require('../utils/erreur-api');

function verifierIdentifiant(id) {
  if (!isObjectIdOrHexString(id)) throw new ErreurApi(400, 'Identifiant invalide.');
}

function trier(tableau) {
  return [...tableau].sort((a, b) => a.ordre - b.ordre);
}

// L'accès dépend uniquement de l'inscription lue en base, jamais du navigateur.
async function lireContenu(utilisateur, formationId) {
  verifierIdentifiant(formationId);

  const inscription = await Inscription.findOne({
    apprenantId: utilisateur._id,
    formationId,
    statut: 'ACTIVE',
  }).lean();
  if (!inscription) throw new ErreurApi(403, 'Accès refusé : paiement non confirmé.');

  const formation = await Formation.findById(formationId).lean();
  if (!formation) throw new ErreurApi(404, 'Formation introuvable.');

  // Les fichiers (champ contenu) ne sont pas renvoyés : ils relèvent de US21.
  return {
    formationId: formation._id,
    titre: formation.titre,
    chapitres: trier(formation.chapitres).map((chapitre) => ({
      _id: chapitre._id,
      titre: chapitre.titre,
      description: chapitre.description,
      ordre: chapitre.ordre,
      ressources: trier(chapitre.ressources).map((ressource) => ({
        _id: ressource._id,
        titre: ressource.titre,
        type: ressource.type,
        ordre: ressource.ordre,
      })),
    })),
  };
}

module.exports = { lireContenu };
