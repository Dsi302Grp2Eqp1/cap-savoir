const { isObjectIdOrHexString } = require('mongoose');
const { Formation } = require('../models');
const fichiers = require('./fichiers');
const ErreurApi = require('../utils/erreur-api');

// Vérifications communes aux titres, descriptions et catégories.
function validerTexte(valeur, champ, longueurMax) {
  if (typeof valeur !== 'string' || !valeur.trim() || valeur.length > longueurMax) {
    throw new ErreurApi(400, `${champ} invalide (maximum ${longueurMax} caractères).`);
  }
  return valeur.trim();
}

function validerDescriptionChapitre(description = '') {
  if (typeof description !== 'string' || description.length > 5000) {
    throw new ErreurApi(400, 'Description invalide (maximum 5000 caractères).');
  }
  return description.trim();
}

function validerCategories(categories) {
  if (!Array.isArray(categories) || categories.length < 1 || categories.length > 10) {
    throw new ErreurApi(400, 'Choisissez entre 1 et 10 catégories.');
  }

  const resultat = [];
  for (const categorie of categories) {
    const nom = validerTexte(categorie, 'Catégorie', 80);
    if (!resultat.includes(nom)) {
      resultat.push(nom);
    }
  }
  return resultat;
}

function verifierIdentifiant(id) {
  if (!isObjectIdOrHexString(id)) {
    throw new ErreurApi(400, 'Identifiant invalide.');
  }
}

// Lecture : on cherche toujours une formation du formateur courant.
async function lister(utilisateur) {
  return Formation.find({ 'formateur._id': utilisateur._id })
    .select('-chapitres')
    .sort({ _id: -1 })
    .limit(100);
}

async function obtenir(utilisateur, formationId) {
  verifierIdentifiant(formationId);
  const formation = await Formation.findOne({
    _id: formationId,
    'formateur._id': utilisateur._id,
  });
  if (!formation) {
    throw new ErreurApi(404, 'Formation introuvable.');
  }
  return formation;
}

async function obtenirBrouillon(utilisateur, formationId) {
  const formation = await obtenir(utilisateur, formationId);
  if (formation.statut !== 'BROUILLON') {
    throw new ErreurApi(409, 'Seuls les brouillons peuvent être modifiés.');
  }
  return formation;
}

// US08 : créer la formation avec un statut et un propriétaire définis ici.
async function creer(utilisateur, donnees) {
  const titre = validerTexte(donnees.titre, 'Titre', 200);
  const description = validerTexte(donnees.description, 'Description', 10000);
  const categories = validerCategories(donnees.categories);
  const prix = donnees.prix;

  if (!Number.isFinite(prix) || prix < 0 || prix > 1000000) {
    throw new ErreurApi(400, 'Prix invalide.');
  }

  const fichierImage = await fichiers.retrouver(utilisateur._id, donnees.image?.url, 'IMAGE');

  return Formation.create({
    titre,
    description,
    categories,
    prix,
    image: fichierImage.metadata,
    statut: 'BROUILLON',
    formateur: {
      _id: utilisateur._id,
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
    },
    chapitres: [],
  });
}

// Les chapitres et ressources sont des sous-documents Mongoose.
// Leur méthode id() permet de retrouver un élément dans son tableau.
function trouverSousDocument(tableau, id, nom) {
  verifierIdentifiant(id);
  const document = tableau.id(id);
  if (!document) {
    throw new ErreurApi(404, `${nom} introuvable.`);
  }
  return document;
}

function reordonner(tableau, identifiants) {
  const message = 'Fournir tous les identifiants une seule fois.';
  if (!Array.isArray(identifiants) || identifiants.length !== tableau.length) {
    throw new ErreurApi(400, message);
  }

  const resultat = [];
  const dejaVus = [];
  for (const id of identifiants) {
    if (typeof id !== 'string' || dejaVus.includes(id) || !tableau.id(id)) {
      throw new ErreurApi(400, message);
    }

    const document = tableau.id(id).toObject();
    document.ordre = resultat.length + 1;
    resultat.push(document);
    dejaVus.push(id);
  }
  return resultat;
}

// US09 : une fonction pour chaque action sur les chapitres.
async function ajouterChapitre(utilisateur, formationId, donnees) {
  const formation = await obtenirBrouillon(utilisateur, formationId);
  if (formation.chapitres.length >= 100) {
    throw new ErreurApi(400, 'Maximum 100 chapitres.');
  }

  formation.chapitres.push({
    titre: validerTexte(donnees.titre, 'Titre', 200),
    description: validerDescriptionChapitre(donnees.description),
    ordre: formation.chapitres.length + 1,
  });
  return formation.save();
}

async function modifierChapitre(utilisateur, formationId, chapitreId, donnees) {
  const formation = await obtenirBrouillon(utilisateur, formationId);
  const chapitre = trouverSousDocument(formation.chapitres, chapitreId, 'Chapitre');

  chapitre.titre = validerTexte(donnees.titre, 'Titre', 200);
  chapitre.description = validerDescriptionChapitre(donnees.description);
  return formation.save();
}

async function supprimerChapitre(utilisateur, formationId, chapitreId) {
  const formation = await obtenirBrouillon(utilisateur, formationId);
  const chapitre = trouverSousDocument(formation.chapitres, chapitreId, 'Chapitre');

  chapitre.deleteOne();
  // Après une suppression, les ordres restent 1, 2, 3... sans trou.
  formation.chapitres.forEach((element, index) => {
    element.ordre = index + 1;
  });
  return formation.save();
}

async function ordonnerChapitres(utilisateur, formationId, identifiants) {
  const formation = await obtenirBrouillon(utilisateur, formationId);
  formation.chapitres = reordonner(formation.chapitres, identifiants);
  return formation.save();
}

// US10 : chaque ressource appartient à un chapitre de la formation.
async function ajouterRessource(utilisateur, formationId, chapitreId, donnees) {
  const formation = await obtenirBrouillon(utilisateur, formationId);
  const chapitre = trouverSousDocument(formation.chapitres, chapitreId, 'Chapitre');
  if (chapitre.ressources.length >= 100) {
    throw new ErreurApi(400, 'Maximum 100 ressources par chapitre.');
  }

  const titre = validerTexte(donnees.titre, 'Titre', 200);
  if (!Object.hasOwn(fichiers.formats, donnees.type)) {
    throw new ErreurApi(400, 'Type de ressource invalide.');
  }
  const fichier = await fichiers.retrouver(utilisateur._id, donnees.contenu?.url, donnees.type);

  chapitre.ressources.push({
    titre,
    type: donnees.type,
    contenu: fichier.metadata,
    ordre: chapitre.ressources.length + 1,
  });
  return formation.save();
}

async function modifierRessource(utilisateur, formationId, chapitreId, ressourceId, donnees) {
  const formation = await obtenirBrouillon(utilisateur, formationId);
  const chapitre = trouverSousDocument(formation.chapitres, chapitreId, 'Chapitre');
  const ressource = trouverSousDocument(chapitre.ressources, ressourceId, 'Ressource');

  ressource.titre = validerTexte(donnees.titre, 'Titre', 200);
  return formation.save();
}

async function supprimerRessource(utilisateur, formationId, chapitreId, ressourceId) {
  const formation = await obtenirBrouillon(utilisateur, formationId);
  const chapitre = trouverSousDocument(formation.chapitres, chapitreId, 'Chapitre');
  const ressource = trouverSousDocument(chapitre.ressources, ressourceId, 'Ressource');

  ressource.deleteOne();
  chapitre.ressources.forEach((element, index) => {
    element.ordre = index + 1;
  });
  return formation.save();
}

async function ordonnerRessources(utilisateur, formationId, chapitreId, identifiants) {
  const formation = await obtenirBrouillon(utilisateur, formationId);
  const chapitre = trouverSousDocument(formation.chapitres, chapitreId, 'Chapitre');

  chapitre.ressources = reordonner(chapitre.ressources, identifiants);
  return formation.save();
}

module.exports = {
  lister,
  creer,
  obtenir,
  ajouterChapitre,
  modifierChapitre,
  supprimerChapitre,
  ordonnerChapitres,
  ajouterRessource,
  modifierRessource,
  supprimerRessource,
  ordonnerRessources,
};
