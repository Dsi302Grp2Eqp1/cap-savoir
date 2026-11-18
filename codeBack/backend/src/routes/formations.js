const router = require('express').Router();
const { authentifier, exigerRole } = require('../middlewares/authentification');
const controller = require('../controllers/formations');
// US03 : réservé aux formateurs connectés ; req.utilisateur est le formateur courant.
router.use(authentifier, exigerRole('FORMATEUR'));

// Formations
router.get('/', controller.lister);
router.post('/', controller.creer);
router.get('/:formationId', controller.obtenir);

// Chapitres
router.post('/:formationId/chapitres', controller.ajouterChapitre);
router.put('/:formationId/chapitres/ordre', controller.ordonnerChapitres);
router.patch('/:formationId/chapitres/:chapitreId', controller.modifierChapitre);
router.delete('/:formationId/chapitres/:chapitreId', controller.supprimerChapitre);

// Ressources d'un chapitre
router.post('/:formationId/chapitres/:chapitreId/ressources', controller.ajouterRessource);
router.put('/:formationId/chapitres/:chapitreId/ressources/ordre', controller.ordonnerRessources);
router.patch(
  '/:formationId/chapitres/:chapitreId/ressources/:ressourceId',
  controller.modifierRessource,
);
router.delete(
  '/:formationId/chapitres/:chapitreId/ressources/:ressourceId',
  controller.supprimerRessource,
);
module.exports = router;
