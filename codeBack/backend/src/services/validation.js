const { isObjectIdOrHexString } = require('mongoose');
const { Formation, Demande } = require('../models');
const ErreurApi = require('../utils/erreur-api');

const STATUTS = ['BROUILLON', 'SOUMISE', 'PUBLIEE', 'ARCHIVEE'];

// Vérifie qu'un identifiant MongoDB est valide.
function verifierIdentifiant(id) {
  if (!isObjectIdOrHexString(id)) {
    throw new ErreurApi(400, 'Identifiant invalide.');
  }
}

// Empêche les caractères spéciaux d'une recherche d'être pris pour une expression.
function echapper(texte) {
  return texte.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Cherche la demande en attente d'une formation.
// Si la formation est SOUMISE mais n'a pas de demande, on la crée ici.
async function trouverDemandeEnAttente(formationId) {
  const demande = await Demande.findOne({
    type: 'VALIDATION',
    typeValidation: 'NOUVELLE_FORMATION',
    formationId: formationId,
    statut: 'EN_ATTENTE',
  });
  if (demande) {
    return demande;
  }

  const formation = await Formation.findOne({ _id: formationId, statut: 'SOUMISE' });
  if (!formation) {
    return null;
  }

  return Demande.create({
    type: 'VALIDATION',
    typeValidation: 'NOUVELLE_FORMATION',
    formationId: formationId,
    demandeur: formation.formateur,
    statut: 'EN_ATTENTE',
  });
}

// US39 + US40 : liste des formations, avec recherche par titre, formateur et statut.
// Sans statut, on renvoie toutes les formations.
async function rechercher(criteres) {
  const { q, formateur, statut } = criteres || {};
  const filtre = {};

  if (statut && statut.trim()) {
    const statutMajuscule = statut.trim().toUpperCase();
    
    filtre.statut = statutMajuscule;
  }

  if (q && q.trim()) {
    filtre.titre = new RegExp(echapper(q.trim()), 'i');
  }

  if (formateur && formateur.trim()) {
    const motif = new RegExp(echapper(formateur.trim()), 'i');
    filtre.$or = [{ 'formateur.nom': motif }, { 'formateur.prenom': motif }];
  }

  const formations = await Formation.find(filtre)
    .select('-chapitres')
    .sort({ _id: -1 })
    .lean();

  if (formations.length === 0) {
    return { formations: [], message: 'Aucune formation ne correspond à votre recherche.' };
  }
  return { formations: formations, message: null };
}

// US39 : détail d'une formation avec sa demande de validation.
async function detail(formationId) {
  verifierIdentifiant(formationId);

  const formation = await Formation.findById(formationId).lean();
  if (!formation) {
    throw new ErreurApi(404, 'Formation introuvable.');
  }
  // Lecture seule : la dernière demande de validation (en attente ou traitée).
  // La demande manquante d'une formation SOUMISE est créée au traitement (traiter).
  const demande = await Demande.findOne({ type: 'VALIDATION', formationId: formationId })
    .sort({ dateSoumission: -1 })
    .lean();

  return { formation: formation, demande: demande || null };
}

// US12 : accepter ou refuser une formation soumise.
async function traiter(formationId, agent, donnees) {
  verifierIdentifiant(formationId);

  const decision = donnees && donnees.decision;
  const commentaire = donnees && donnees.commentaire;
  if (decision !== 'accepter' && decision !== 'refuser') {
    throw new ErreurApi(400, 'Décision invalide : "accepter" ou "refuser".');
  }
  if (commentaire != null && (typeof commentaire !== 'string' || commentaire.length > 2000)) {
    throw new ErreurApi(400, 'Commentaire invalide (maximum 2000 caractères).');
  }
  if (decision === 'refuser' && (!commentaire || !commentaire.trim())) {
    throw new ErreurApi(400, 'Un motif est obligatoire pour refuser.');
  }

  const demande = await trouverDemandeEnAttente(formationId);
  if (!demande) {
    throw new ErreurApi(404, 'Aucune demande de validation en attente pour cette formation.');
  }

  const accepte = decision === 'accepter';

  // 1) On met à jour la demande 
  demande.statut = accepte ? 'ACCEPTEE' : 'REFUSEE';
  demande.commentaire = commentaire ? commentaire.trim() : null;
  demande.dateDecision = new Date();
  demande.agentId = agent._id;
  await demande.validate();

    // 2) On met à jour la formation si elle est encore SOUMISE.
  const formation = await Formation.findOneAndUpdate(
    { _id: formationId, statut: 'SOUMISE' },
    { statut: accepte ? 'PUBLIEE' : 'BROUILLON' },
    { new: true },
  );
  if (!formation) {
    throw new ErreurApi(409, "Cette formation n'est pas en attente de validation.");
  }

  // 3) On sauvegarde la demande.
  await demande.save();

  return { formation: formation, demande: demande };
}

module.exports = { rechercher, detail, traiter };