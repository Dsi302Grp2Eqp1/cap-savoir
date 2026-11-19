const router = require('express').Router();
const { authentifier, exigerRole } = require('../middlewares/authentification');
const controller = require('../controllers/validation');

router.use(authentifier, exigerRole('AGENT'));
router.get('/formations', controller.lister);                // US39 + US40
router.get('/formations/:id', controller.detail);            // US39
router.patch('/formations/:id/traiter', controller.traiter); // US12

module.exports = router;