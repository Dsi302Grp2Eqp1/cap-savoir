const router = require('express').Router();
const multer = require('multer');
const { authentifier, exigerRole } = require('../middlewares/authentification');
const { TAILLE_MAX } = require('../utils/stockage-cv');
const ErreurApi = require('../utils/erreur-api');
const controller = require('../controllers/demandes-formateur');

// Un seul fichier (cv) et deux champs texte ; le contenu est vérifié par le service.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: TAILLE_MAX, files: 1, fields: 2 },
}).single('cv');

// Messages d'erreur propres au CV (le middleware commun parle des ressources de 50 Mo).
function televerserCv(req, res, next) {
  upload(req, res, (err) => {
    if (err?.code === 'LIMIT_FILE_SIZE') return next(new ErreurApi(413, 'CV trop volumineux (maximum 5 Mo).'));
    if (err?.name === 'MulterError') return next(new ErreurApi(400, 'Envoyez un seul fichier PDF dans le champ cv.'));
    next(err);
  });
}

router.use(authentifier, exigerRole('APPRENANT'));

router.post('/', televerserCv, controller.deposer); // US05
router.get('/moi', controller.mesDemandes);                 // US07

module.exports = router;
