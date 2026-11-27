const router = require('express').Router();
const { authentifier, exigerRole } = require('../middlewares/authentification');
const controller = require('../controllers/modifications-agent');

router.use(authentifier, exigerRole('AGENT'));

router.get('/', controller.lister);
router.get('/:id', controller.detail);
router.patch('/:id/traiter', controller.traiter);

module.exports = router;