const mongoose = require('mongoose');
const models = require('../models');
const ErreurApi = require('../utils/erreur-api');

const Formation = models.Formation;
const Demande = models.Demande;

function verifierTexte(valeur, champ, max) {
  if (typeof valeur !== 'string') {
    throw new ErreurApi(400, champ + ' invalide.');
  }

  if (valeur.trim() === '') {
    throw new ErreurApi(400, champ + ' invalide.');
  }

  if (valeur.length > max) {
    throw new ErreurApi(400, champ + ' invalide.');
  }

  return valeur.trim();
}

async function trouverFormation(utilisateur, formationId) {
  if (!mongoose.isValidObjectId(formationId)) {
    throw new ErreurApi(400, 'Identifiant invalide.');
  }

  const formation = await Formation.findOne({ _id: formationId, 'formateur._id': utilisateur._id });

  if (!formation) {
    throw new ErreurApi(404, 'Formation introuvable.');
  }

  return formation;
}

async function proposer(utilisateur, formationId, donnees) {
  const formation = await trouverFormation(utilisateur, formationId);

  if (formation.statut !== 'PUBLIEE') {
    throw new ErreurApi(409, 'Seule une formation publiée peut être modifiée par demande.');
  }

  const enAttente = await Demande.findOne({
    type: 'VALIDATION',
    typeValidation: 'MODIFICATION',
    formationId: formation._id,
    statut: 'EN_ATTENTE'
  });

  if (enAttente) {
    throw new ErreurApi(409, 'Une modification est déjà en attente de validation.');
  }

  const titre = verifierTexte(donnees.titre, 'Titre', 200);
  const description = verifierTexte(donnees.description, 'Description', 10000);

  if (!Array.isArray(donnees.categories)) {
    throw new ErreurApi(400, 'Choisissez entre 1 et 10 catégories.');
  }

  if (donnees.categories.length < 1 || donnees.categories.length > 10) {
    throw new ErreurApi(400, 'Choisissez entre 1 et 10 catégories.');
  }

  const categories = [];

  for (let i = 0; i < donnees.categories.length; i++) {
    const nom = verifierTexte(donnees.categories[i], 'Catégorie', 80);
    if (!categories.includes(nom)) {
      categories.push(nom);
    }
  }

  const prix = donnees.prix;

  if (!Number.isFinite(prix) || prix < 0 || prix > 1000000) {
    throw new ErreurApi(400, 'Prix invalide.');
  }

  const demande = await Demande.create({
    type: 'VALIDATION',
    typeValidation: 'MODIFICATION',
    formationId: formation._id,
    demandeur: {
      _id: utilisateur._id,
      nom: utilisateur.nom,
      prenom: utilisateur.prenom
    },
    dateSoumission: new Date(),
    statut: 'EN_ATTENTE',
    contenuPropose: {
      titre: titre,
      description: description,
      categories: categories,
      prix: prix
    }
  });

  return demande;
}

async function lister(utilisateur, formationId) {
  const formation = await trouverFormation(utilisateur, formationId);

  const demandes = await Demande.find({
    type: 'VALIDATION',
    typeValidation: 'MODIFICATION',
    formationId: formation._id
  })
    .sort({ dateSoumission: -1 })
    .limit(20);

  return demandes;
}

module.exports = { proposer, lister };