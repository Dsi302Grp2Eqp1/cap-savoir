const mongoose = require('mongoose');
const models = require('../models');
const ErreurApi = require('../utils/erreur-api');

const Formation = models.Formation;
const Demande = models.Demande;

function verifierId(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw new ErreurApi(400, 'Identifiant invalide.');
  }
}

async function lister() {
  const demandes = await Demande.find({
    type: 'VALIDATION',
    typeValidation: 'MODIFICATION',
    statut: 'EN_ATTENTE'
  })
    .sort({ dateSoumission: 1 })
    .lean();

  const resultat = [];

  for (let i = 0; i < demandes.length; i++) {
    const d = demandes[i];
    const formation = await Formation.findById(d.formationId).select('titre').lean();

    if (formation) {
      d.titreActuel = formation.titre;
    } else {
      d.titreActuel = '(formation introuvable)';
    }

    resultat.push(d);
  }

  return resultat;
}

async function detail(id) {
  verifierId(id);

  const demande = await Demande.findOne({
    _id: id,
    type: 'VALIDATION',
    typeValidation: 'MODIFICATION'
  }).lean();

  if (!demande) {
    throw new ErreurApi(404, 'Modification introuvable.');
  }

  const formation = await Formation.findById(demande.formationId).select('-chapitres').lean();

  if (!formation) {
    throw new ErreurApi(404, 'Formation introuvable.');
  }

  return { demande: demande, formation: formation };
}

async function traiter(id, agent, donnees) {
  verifierId(id);

  const decision = donnees.decision;
  const commentaire = donnees.commentaire;

  if (decision !== 'accepter' && decision !== 'refuser') {
    throw new ErreurApi(400, 'Décision invalide.');
  }

  if (commentaire !== null && commentaire !== undefined) {
    if (typeof commentaire !== 'string') {
      throw new ErreurApi(400, 'Commentaire invalide.');
    }
    if (commentaire.length > 2000) {
      throw new ErreurApi(400, 'Commentaire invalide.');
    }
  }

  if (decision === 'refuser') {
    if (!commentaire || commentaire.trim() === '') {
      throw new ErreurApi(400, 'Un motif est obligatoire pour refuser.');
    }
  }

  const demande = await Demande.findOne({
    _id: id,
    type: 'VALIDATION',
    typeValidation: 'MODIFICATION'
  });

  if (!demande) {
    throw new ErreurApi(404, 'Modification introuvable.');
  }

  if (demande.statut !== 'EN_ATTENTE') {
    throw new ErreurApi(409, 'Cette modification est déjà traitée.');
  }

  if (decision === 'accepter') {
    const contenu = demande.contenuPropose;

    const formation = await Formation.findOneAndUpdate(
      { _id: demande.formationId, statut: 'PUBLIEE' },
      {
        titre: contenu.titre,
        description: contenu.description,
        categories: contenu.categories,
        prix: contenu.prix
      },
      { new: true }
    );

    if (!formation) {
      throw new ErreurApi(409, "La formation n'est plus publiée.");
    }

    demande.statut = 'ACCEPTEE';
  } else {
    demande.statut = 'REFUSEE';
  }

  if (commentaire) {
    demande.commentaire = commentaire.trim();
  } else {
    demande.commentaire = null;
  }

  demande.dateDecision = new Date();
  demande.agentId = agent._id;
  await demande.save();

  return { demande: demande };
}

module.exports = { lister, detail, traiter };