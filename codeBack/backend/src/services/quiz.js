// US22 : création/modification de quiz par un formateur.
// US23 : passage d'un quiz par un apprenant (nouvelle tentative numérotée).
// US24 : correction automatique + enregistrement du score.
const { isObjectIdOrHexString } = require('mongoose');
const { Quiz, Tentative, Formation, Inscription } = require('../models');
const ErreurApi = require('../utils/erreur-api');

function verifierIdentifiant(id) {
  if (!isObjectIdOrHexString(id)) throw new ErreurApi(400, 'Identifiant invalide.');
}

// ─── US22 ────────────────────────────────────────────────────────────────────

function validerQuestions(questions) {
  if (!Array.isArray(questions) || questions.length < 1) {
    throw new ErreurApi(400, 'Un quiz doit contenir au moins une question.');
  }
  for (const q of questions) {
    if (!q.enonce || typeof q.enonce !== 'string' || !q.enonce.trim()) {
      throw new ErreurApi(400, 'Chaque question doit avoir un énoncé.');
    }
    if (!Number.isFinite(q.points) || q.points < 0) {
      throw new ErreurApi(400, 'Les points doivent être un nombre >= 0.');
    }
    if (!Array.isArray(q.propositions) || q.propositions.length < 2) {
      throw new ErreurApi(400, 'Chaque question doit avoir au moins 2 propositions.');
    }
    const correctes = q.propositions.filter((p) => p.estCorrecte === true);
    if (correctes.length !== 1) {
      throw new ErreurApi(400, 'Chaque question doit avoir exactement une bonne réponse.');
    }
    for (const p of q.propositions) {
      if (!p.texte || typeof p.texte !== 'string' || !p.texte.trim()) {
        throw new ErreurApi(400, 'Chaque proposition doit avoir un texte.');
      }
    }
  }
}

async function creerOuModifierQuiz(utilisateur, formationId, chapitreId, donnees) {
  verifierIdentifiant(formationId);
  verifierIdentifiant(chapitreId);

  // Vérifier que la formation appartient au formateur
  const formation = await Formation.findOne({
    _id: formationId,
    'formateur._id': utilisateur._id,
  });
  if (!formation) throw new ErreurApi(404, 'Formation introuvable.');
  // Comme les chapitres (US09) : une formation soumise ou publiée n'est plus modifiable,
  // sinon le quiz changerait sans nouvelle validation de l'agent (US12/US13).
  if (formation.statut !== 'BROUILLON') {
    throw new ErreurApi(409, 'Seuls les brouillons peuvent être modifiés.');
  }

  const chapitre = formation.chapitres.id(chapitreId);
  if (!chapitre) throw new ErreurApi(404, 'Chapitre introuvable.');

  const titre = (donnees.titre || '').trim();
  if (!titre) throw new ErreurApi(400, 'Titre du quiz requis.');

  const scoreMinimum = Number(donnees.scoreMinimum);
  if (!Number.isFinite(scoreMinimum) || scoreMinimum < 0 || scoreMinimum > 100) {
    throw new ErreurApi(400, 'scoreMinimum doit être entre 0 et 100.');
  }

  validerQuestions(donnees.questions || []);

  const quizExistant = await Quiz.findOne({ chapitreId });

  const payload = {
    formationId,
    chapitreId,
    titre,
    scoreMinimum,
    questions: (donnees.questions || []).map((q) => ({
      enonce: q.enonce.trim(),
      points: q.points,
      explication: (q.explication || '').trim() || undefined,
      propositions: q.propositions.map((p) => ({
        texte: p.texte.trim(),
        estCorrecte: Boolean(p.estCorrecte),
      })),
    })),
  };

  if (quizExistant) {
    Object.assign(quizExistant, payload);
    return quizExistant.save();
  }
  return Quiz.create(payload);
}

async function obtenirQuiz(utilisateur, formationId, chapitreId) {
  verifierIdentifiant(formationId);
  verifierIdentifiant(chapitreId);
  // Le quiz contient les bonnes réponses : seul le formateur propriétaire peut le lire.
  const formation = await Formation.findOne({
    _id: formationId,
    'formateur._id': utilisateur._id,
  });
  if (!formation) throw new ErreurApi(404, 'Formation introuvable.');
  const quiz = await Quiz.findOne({ formationId, chapitreId });
  if (!quiz) throw new ErreurApi(404, 'Aucun quiz pour ce chapitre.');
  return quiz;
}

// ─── US23 : Passer un quiz / US24 : Correction automatique ──────────────────

// US23 : seul un apprenant inscrit (paiement confirmé) peut passer le quiz.
async function verifierInscriptionActive(utilisateur, formationId) {
  const inscription = await Inscription.findOne({
    apprenantId: utilisateur._id,
    formationId,
    statut: 'ACTIVE',
  });
  if (!inscription) {
    throw new ErreurApi(403, 'Vous devez être inscrit à cette formation pour passer ce quiz.');
  }
}

// US23 : quiz à passer, sans les bonnes réponses.
async function obtenirQuizPassage(utilisateur, quizId) {
  verifierIdentifiant(quizId);
  const quiz = await Quiz.findById(quizId);
  if (!quiz) throw new ErreurApi(404, 'Quiz introuvable.');
  await verifierInscriptionActive(utilisateur, quiz.formationId);

  return {
    _id: quiz._id,
    titre: quiz.titre,
    scoreMinimum: quiz.scoreMinimum,
    formationId: quiz.formationId,
    chapitreId: quiz.chapitreId,
    questions: quiz.questions.map((q) => ({
      _id: q._id,
      enonce: q.enonce,
      points: q.points,
      propositions: q.propositions.map((p) => ({
        _id: p._id,
        texte: p.texte,
      })),
    })),
  };
}

// Chaque question doit avoir une réponse choisie parmi ses propres propositions.
function verifierReponses(quiz, reponses) {
  if (!Array.isArray(reponses)) throw new ErreurApi(400, 'Réponses invalides.');
  for (const question of quiz.questions) {
    const reponse = reponses.find(
      (r) => r && r.questionId && r.questionId.toString() === question._id.toString(),
    );
    if (!reponse || !reponse.propositionId) {
      throw new ErreurApi(400, 'Répondez à toutes les questions avant de soumettre.');
    }
    if (
      !isObjectIdOrHexString(reponse.propositionId) ||
      !question.propositions.id(reponse.propositionId)
    ) {
      throw new ErreurApi(400, 'Réponse invalide pour une question.');
    }
  }
}

async function soumettreTentative(utilisateur, quizId, donnees) {
  verifierIdentifiant(quizId);
  const quiz = await Quiz.findById(quizId);
  if (!quiz) throw new ErreurApi(404, 'Quiz introuvable.');

  // Vérifier que l'apprenant est inscrit à la formation (accès autorisé)
  await verifierInscriptionActive(utilisateur, quiz.formationId);
  verifierReponses(quiz, donnees.reponses || []);

  // Numéro de tentative = max existant + 1
  const derniereT = await Tentative.findOne(
    { apprenantId: utilisateur._id, quizId },
    { numeroTentative: 1 },
    { sort: { numeroTentative: -1 } },
  );
  const numeroTentative = derniereT ? derniereT.numeroTentative + 1 : 1;

  // US24 : correction automatique
  const reponsesApprenant = donnees.reponses || [];
  let pointsTotal = 0;
  let pointsMax = 0;

  const reponsesCorrigees = quiz.questions.map((question) => {
    pointsMax += question.points;
    const repApprenant = reponsesApprenant.find(
      (r) => r.questionId && r.questionId.toString() === question._id.toString(),
    );

    const propId = repApprenant?.propositionId;
    const proposition = propId ? question.propositions.id(propId) : null;

    const estCorrecte = proposition ? proposition.estCorrecte : false;
    const pointsObtenus = estCorrecte ? question.points : 0;
    pointsTotal += pointsObtenus;

    return {
      questionId: question._id,
      propositionId: propId || null,
      estCorrecte,
      pointsObtenus,
    };
  });

  const score = pointsMax > 0 ? Math.round((pointsTotal / pointsMax) * 100) : 0;
  const valide = score >= quiz.scoreMinimum;

  const tentative = await Tentative.create({
    apprenantId: utilisateur._id,
    quizId,
    numeroTentative,
    dateDebut: new Date(),
    dateFin: new Date(),
    score,
    valide,
    reponses: reponsesCorrigees,
  });

  return { tentative, quiz };
}

// US24 : Obtenir le résultat d'une tentative
async function obtenirResultat(utilisateur, tentativeId) {
  verifierIdentifiant(tentativeId);
  const tentative = await Tentative.findById(tentativeId, {
    score: 1,
    valide: 1,
    numeroTentative: 1,
    apprenantId: 1,
    quizId: 1,
    dateDebut: 1,
    dateFin: 1,
  });
  if (!tentative) throw new ErreurApi(404, 'Tentative introuvable.');
  if (tentative.apprenantId.toString() !== utilisateur._id.toString()) {
    throw new ErreurApi(403, 'Accès non autorisé.');
  }

  const quiz = await Quiz.findById(tentative.quizId, { titre: 1, scoreMinimum: 1 });
  if (!quiz) throw new ErreurApi(404, 'Quiz introuvable.');

  return { tentative, quiz };
}

module.exports = {
  creerOuModifierQuiz,
  obtenirQuiz,
  obtenirQuizPassage,
  soumettreTentative,
  obtenirResultat,
};
