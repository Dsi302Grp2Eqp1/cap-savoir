const router = require("express").Router();
const multer = require("multer");
const { authentifier, exigerRole } = require("../middlewares/authentification");
const controller = require("../controllers/fichiers");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
});
// US03 : réservé aux formateurs connectés ; req.utilisateur est le formateur courant.
router.use(authentifier, exigerRole("FORMATEUR"));
router.post("/", upload.single("fichier"), controller.televerser);
router.get("/:utilisateurId/:fichierId", controller.telecharger);
module.exports = router;
