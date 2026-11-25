const service = require('../services/modifications-agent');

async function lister(req, res) {
  res.json(await service.lister());
}

async function detail(req, res) {
  res.json(await service.detail(req.params.id));
}

async function traiter(req, res) {
  res.json(await service.traiter(req.params.id, req.utilisateur, req.body || {}));
}

module.exports = { lister, detail, traiter };