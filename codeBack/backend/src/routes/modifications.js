const router = require('express').Router();
const { authentifier, exigerRole } = require('../middlewares/authentification');
const controller = require('../controllers/modifications');

router.use(authentifier, exigerRole('FORMATEUR'));

router.post('/:formationId', controller.proposer);
router.get('/:formationId', controller.lister);

module.exports = router;