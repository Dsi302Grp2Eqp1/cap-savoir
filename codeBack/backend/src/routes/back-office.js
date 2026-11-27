// Back-office agent (EJS). Monté sur /backoffice dans app.js.
const express = require('express');
const { exigerAgent } = require('../middlewares/back-office');
const controller = require('../controllers/back-office');

const LIBELLES = { EN_ATTENTE: 'En attente', ACCEPTEE: 'Acceptée', REFUSEE: 'Refusée' };
const FORMAT_DATE = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'Africa/Tunis',
});

const router = express.Router();
router.use(express.urlencoded({ extended: false, limit: '20kb' }));
router.use((req, res, next) => {
  res.locals.libelles = LIBELLES;
  res.locals.formaterDate = (date) => (date ? FORMAT_DATE.format(new Date(date)) : '');
  next();
});

// Public
router.get('/', (req, res) => res.redirect('/backoffice/demandes'));
router.get('/connexion', controller.pageConnexion);
router.post('/connexion', controller.connecter);

// Agent connecté
router.use(exigerAgent);
router.post('/deconnexion', controller.deconnecter);
router.get('/demandes', controller.listerDemandes);               // US06
router.get('/demandes/:id', controller.detailDemande);            // US06
router.get('/demandes/:id/cv', controller.telechargerCv);         // US06
router.post('/demandes/:id/accepter', controller.accepter);       // US38
router.post('/demandes/:id/refuser', controller.refuser);         // US38

// Les erreurs du back-office s'affichent dans une page, pas en JSON.
// eslint-disable-next-line no-unused-vars
router.use((err, req, res, next) => {
  const statut = err.statut || (err.name === 'CastError' ? 404 : 500);
  if (statut === 500) console.error(err);
  res.status(statut).render('back-office/erreur', {
    statut,
    message: statut === 500 ? 'Erreur interne du serveur.' : err.message,
  });
});

module.exports = router;
