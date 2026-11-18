const router = require("express").Router();
const multer = require("multer");
const { formateur } = require("../middlewares/contexte-formateur");
const controller = require("../controllers/fichiers");
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
});
router.use(formateur);
router.post("/", upload.single("fichier"), controller.televerser);
router.get("/:utilisateurId/:fichierId", controller.telecharger);
module.exports = router;
