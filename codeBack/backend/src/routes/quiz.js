// Routes quiz — P4 (US22, US23, US24 — Business Value Haute)
const router = require('express').Router();
const { authentifier, exigerRole } = require('../middlewares/authentification');
const ctrl = require('../controllers/quiz');

// ─── US22 : Routes formateur ─────────────────────────────────────────────────
// Créer/modifier le quiz d'un chapitre
router.put(
  '/formations/:formationId/chapitres/:chapitreId/quiz',
  authentifier,
  exigerRole('FORMATEUR'),
  ctrl.creerOuModifierQuiz,
);

// Lire le quiz d'un chapitre (formateur)
router.get(
  '/formations/:formationId/chapitres/:chapitreId/quiz',
  authentifier,
  exigerRole('FORMATEUR'),
  ctrl.obtenirQuiz,
);

// ─── US23 + US24 : Routes apprenant ──────────────────────────────────────────
// Obtenir le quiz pour le passage (bonnes réponses masquées)
router.get(
  '/quiz/:quizId/passer',
  authentifier,
  exigerRole('APPRENANT'),
  ctrl.obtenirQuizPassage,
);

// Soumettre une tentative (correction auto + calcul score US24)
router.post(
  '/quiz/:quizId/tentatives',
  authentifier,
  exigerRole('APPRENANT'),
  ctrl.soumettreTentative,
);

// Consulter le score d'une tentative (US24)
router.get(
  '/tentatives/:tentativeId/resultat',
  authentifier,
  exigerRole('APPRENANT'),
  ctrl.obtenirResultat,
);

module.exports = router;
