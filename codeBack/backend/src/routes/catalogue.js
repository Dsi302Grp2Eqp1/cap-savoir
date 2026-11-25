const router = require('express').Router();
const controller = require('../controllers/catalogue');

router.get('/', controller.rechercher);
router.get('/categories', controller.listerCategories);

module.exports = router;