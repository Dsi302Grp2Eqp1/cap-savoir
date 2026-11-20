const service = require('../services/paiements');

// Express 5 transmet automatiquement les erreurs async au middleware erreurs.js.
async function checkout(req, res) {
  const resultat = await service.creerCheckout(req.utilisateur, req.body?.formationId);
  res.status(201).json(resultat);
}

async function statut(req, res) {
  res.json(await service.lireStatut(req.utilisateur, req.params.paiementId));
}

// Appelé par Stripe : req.body est le corps brut (express.raw monté dans app.js).
async function webhook(req, res) {
  await service.traiterWebhook(req.body, req.headers['stripe-signature']);
  res.sendStatus(200);
}

module.exports = { checkout, statut, webhook };