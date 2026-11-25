const router = require('express').Router();
const { authentifier, exigerRole } = require('../middlewares/authentification');
const controller = require('../controllers/inscriptions');

router.use(authentifier, exigerRole('APPRENANT'));

router.post('/', controller.inscrire);

module.exports = router;