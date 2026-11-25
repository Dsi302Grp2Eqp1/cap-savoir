const service = require('../services/inscriptions');

async function inscrire(req, res) {
  const inscription = await service.inscrire(req.utilisateur._id, req.body.formationId);
  res.status(201).json(inscription);
}

module.exports = { inscrire };