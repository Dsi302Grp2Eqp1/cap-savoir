// Front-office (API JSON) : l'apprenant dépose sa demande et suit la décision.
const service = require('../services/demandes-formateur');

// US05 : multipart/form-data (champs domaineExpertise, experience + fichier cv).
async function deposer(req, res) {
  const demande = await service.deposer(req.utilisateur, req.body || {}, req.file);
  res.status(201).json(demande);
}

// US07
async function mesDemandes(req, res) {
  res.json(await service.mesDemandes(req.utilisateur));
}

module.exports = { deposer, mesDemandes };
