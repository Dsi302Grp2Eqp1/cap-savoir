const express = require('express');
const controller = require('../controllers/paiements');
const { authentifier, exigerRole } = require('../middlewares/authentification');

const router = express.Router();

// US02 / US03 : seul un apprenant connecté peut payer et consulter ses paiements.
// Le webhook Stripe n'est pas ici : il est monté dans app.js, sans authentification,
// avant express.json() (Stripe signe le corps brut).
router.use(authentifier, exigerRole('APPRENANT'));

router.post('/checkout', controller.checkout);           // US18
router.get('/:paiementId/statut', controller.statut);    // US18

module.exports = router;