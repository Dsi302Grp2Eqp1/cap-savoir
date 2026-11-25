const service = require('../services/modifications');

async function proposer(req, res) {
  const demande = await service.proposer(req.utilisateur, req.params.formationId, req.body || {});
  res.status(201).json(demande);
}

async function lister(req, res) {
  const demandes = await service.lister(req.utilisateur, req.params.formationId);
  res.json(demandes);
}

module.exports = { proposer, lister };