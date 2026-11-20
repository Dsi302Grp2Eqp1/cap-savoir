// Contrôleur quiz — P4 (US22, US23, US24)
const service = require('../services/quiz');

// US22 — Formateur : créer ou modifier le quiz d'un chapitre
async function creerOuModifierQuiz(req, res) {
  const quiz = await service.creerOuModifierQuiz(
    req.utilisateur,
    req.params.formationId,
    req.params.chapitreId,
    req.body || {},
  );
  res.status(200).json(quiz);
}

// Obtenir le quiz d'un chapitre
async function obtenirQuiz(req, res) {
  const quiz = await service.obtenirQuiz(
    req.utilisateur,
    req.params.formationId,
    req.params.chapitreId,
  );
  res.json(quiz);
}

// US23 — Apprenant : quiz à passer (bonnes réponses masquées)
async function obtenirQuizPassage(req, res) {
  res.json(await service.obtenirQuizPassage(req.utilisateur, req.params.quizId));
}

// US23 + US24 — Apprenant : soumettre une tentative et recevoir le score
async function soumettreTentative(req, res) {
  const { tentative, quiz } = await service.soumettreTentative(
    req.utilisateur,
    req.params.quizId,
    req.body || {},
  );
  res.status(201).json({ tentative, quiz: { _id: quiz._id, titre: quiz.titre, scoreMinimum: quiz.scoreMinimum } });
}

// US24 — Apprenant : obtenir le résultat d'une tentative
async function obtenirResultat(req, res) {
  const resultat = await service.obtenirResultat(
    req.utilisateur,
    req.params.tentativeId,
  );
  res.json(resultat);
}

module.exports = {
  creerOuModifierQuiz,
  obtenirQuiz,
  obtenirQuizPassage,
  soumettreTentative,
  obtenirResultat,
};
