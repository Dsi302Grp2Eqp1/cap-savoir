const router = require('express').Router();
const { authentifier, exigerRole } = require('../middlewares/authentification');
const controller = require('../controllers/contenu');

// US19 : réservé aux apprenants connectés ; l'accès exige une inscription ACTIVE.
router.use(authentifier, exigerRole('APPRENANT'));
router.get('/:formationId', controller.obtenir);

module.exports = router;
