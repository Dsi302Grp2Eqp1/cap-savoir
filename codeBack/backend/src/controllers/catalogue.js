const service = require('../services/catalogue');

async function rechercher(req, res) {
  const resultat = await service.rechercher(req.query);
  res.json(resultat);
}

async function listerCategories(req, res) {
  const categories = await service.listerCategories();
  res.json(categories);
}

module.exports = { rechercher, listerCategories };