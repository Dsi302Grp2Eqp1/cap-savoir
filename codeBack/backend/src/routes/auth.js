const router = require('express').Router();
const { authentifier } = require('../middlewares/authentification');
const controller = require('../controllers/auth');

// Public
router.post('/inscription', controller.inscrire); // US01
router.post('/connexion', controller.connecter);   // US02

// Utilisateur connecté
router.post('/deconnexion', authentifier, controller.deconnecter); // US02
router.get('/moi', authentifier, controller.moi);                  // US03

module.exports = router;
