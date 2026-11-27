// Accès à la collection Utilisateur (P1 : US01, US02, US03, US38).
// Les services n'appellent jamais le modèle directement : toutes les requêtes sont ici.
const { Utilisateur } = require('../models');

const CHAMPS_SESSION = 'nom prenom email roles dateCreation versionJeton';

function creer(donnees) {
  return Utilisateur.create(donnees);
}

// Le hachage n'est pas lu par défaut (select: false) : il est demandé explicitement.
function trouverParEmailAvecMotDePasse(email) {
  return Utilisateur.findOne({ email }).select('+motDePasse');
}

// Utilisateur relu à chaque requête authentifiée (rôles et version du jeton à jour).
function trouverPourSession(id) {
  return Utilisateur.findById(id).select(CHAMPS_SESSION);
}

function incrementerVersionJeton(id) {
  return Utilisateur.updateOne({ _id: id }, { $inc: { versionJeton: 1 } });
}

// US38 : un formateur accepté garde son rôle APPRENANT et reçoit FORMATEUR.
function devenirFormateur(id, domaineExpertise) {
  return Utilisateur.updateOne(
    { _id: id },
    { $addToSet: { roles: 'FORMATEUR' }, $set: { domaineExpertise } },
  );
}

module.exports = {
  creer,
  trouverParEmailAvecMotDePasse,
  trouverPourSession,
  incrementerVersionJeton,
  devenirFormateur,
};
