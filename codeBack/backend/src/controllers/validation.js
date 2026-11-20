const service = require('../services/validation');

async function lister(req, res, next) {
  try {
     res.json(await service.rechercher(req.query));
     } catch (e) { next(e); }
}
async function detail(req, res, next) {
  try { res.json(await service.detail(req.params.id)); } 
  catch (e) { next(e); }
}
async function traiter(req, res, next) {
  try { 
    res.json(await service.traiter(req.params.id, req.utilisateur, req.body)); }
    catch (e)
     { next(e); }
}

module.exports = { lister, detail, traiter };