const mongoose = require('mongoose');
const models = require('../models');
const ErreurApi = require('../utils/erreur-api');

const Formation = models.Formation;
const Inscription = models.Inscription;

async function inscrire(apprenantId, formationId) {
  if (!formationId) {
    throw new ErreurApi(400, 'Formation invalide.');
  }

  if (!mongoose.isValidObjectId(formationId)) {
    throw new ErreurApi(400, 'Formation invalide.');
  }

  const formation = await Formation.findOne({ _id: formationId, statut: 'PUBLIEE' });

  if (!formation) {
    throw new ErreurApi(404, 'Formation introuvable.');
  }

  const existante = await Inscription.findOne({ apprenantId: apprenantId, formationId: formationId });

  if (existante) {
    if (existante.statut !== 'ANNULEE') {
      throw new ErreurApi(409, 'Vous êtes déjà inscrit à cette formation.');
    }

    existante.statut = 'EN_ATTENTE_PAIEMENT';
    existante.dateInscription = new Date();
    await existante.save();
    return existante;
  }

  const inscription = await Inscription.create({
    apprenantId: apprenantId,
    formationId: formationId,
    dateInscription: new Date(),
    statut: 'EN_ATTENTE_PAIEMENT',
    paiements: [],
    chapitresConsultes: []
  });

  return inscription;
}

module.exports = { inscrire };