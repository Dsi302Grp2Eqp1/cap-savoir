const service = require('../services/contenu');

// Express 5 transmet automatiquement les erreurs async au middleware erreurs.js.
async function obtenir(req, res) {
  res.json(await service.lireContenu(req.utilisateur, req.params.formationId));
}

module.exports = { obtenir };
