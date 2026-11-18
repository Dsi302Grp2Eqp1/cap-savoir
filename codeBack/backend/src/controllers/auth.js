const service = require('../services/auth');

// Express 5 transmet automatiquement les erreurs async au middleware erreurs.js.
async function inscrire(req, res) {
  const utilisateur = await service.inscrire(req.body || {});
  res.status(201).json(utilisateur);
}

async function connecter(req, res) {
  const session = await service.connecter(req.body || {});
  res.json(session);
}

async function deconnecter(req, res) {
  await service.deconnecter(req.utilisateur);
  res.sendStatus(204);
}

// US03 : le frontend lit les rôles ici pour choisir l'espace et les menus.
async function moi(req, res) {
  res.json(service.profilPublic(req.utilisateur));
}

module.exports = { inscrire, connecter, deconnecter, moi };
