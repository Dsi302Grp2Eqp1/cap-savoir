const service = require('../services/formations');

// Express 5 transmet automatiquement les erreurs async au middleware erreurs.js.
async function lister(req, res) {
  const formations = await service.lister(req.utilisateur);
  res.json(formations);
}

async function obtenir(req, res) {
  const formation = await service.obtenir(req.utilisateur, req.params.formationId);
  res.json(formation);
}

async function creer(req, res) {
  const formation = await service.creer(req.utilisateur, req.body || {});
  res.status(201).json(formation);
}

async function ajouterChapitre(req, res) {
  const formation = await service.ajouterChapitre(
    req.utilisateur,
    req.params.formationId,
    req.body || {},
  );
  res.status(201).json(formation);
}

async function modifierChapitre(req, res) {
  const formation = await service.modifierChapitre(
    req.utilisateur,
    req.params.formationId,
    req.params.chapitreId,
    req.body || {},
  );
  res.json(formation);
}

async function supprimerChapitre(req, res) {
  const formation = await service.supprimerChapitre(
    req.utilisateur,
    req.params.formationId,
    req.params.chapitreId,
  );
  res.json(formation);
}

async function ordonnerChapitres(req, res) {
  const formation = await service.ordonnerChapitres(
    req.utilisateur,
    req.params.formationId,
    req.body?.ids,
  );
  res.json(formation);
}

async function ajouterRessource(req, res) {
  const formation = await service.ajouterRessource(
    req.utilisateur,
    req.params.formationId,
    req.params.chapitreId,
    req.body || {},
  );
  res.status(201).json(formation);
}

async function modifierRessource(req, res) {
  const formation = await service.modifierRessource(
    req.utilisateur,
    req.params.formationId,
    req.params.chapitreId,
    req.params.ressourceId,
    req.body || {},
  );
  res.json(formation);
}

async function supprimerRessource(req, res) {
  const formation = await service.supprimerRessource(
    req.utilisateur,
    req.params.formationId,
    req.params.chapitreId,
    req.params.ressourceId,
  );
  res.json(formation);
}

async function ordonnerRessources(req, res) {
  const formation = await service.ordonnerRessources(
    req.utilisateur,
    req.params.formationId,
    req.params.chapitreId,
    req.body?.ids,
  );
  res.json(formation);
}

module.exports = {
  lister,
  obtenir,
  creer,
  ajouterChapitre,
  modifierChapitre,
  supprimerChapitre,
  ordonnerChapitres,
  ajouterRessource,
  modifierRessource,
  supprimerRessource,
  ordonnerRessources,
};
