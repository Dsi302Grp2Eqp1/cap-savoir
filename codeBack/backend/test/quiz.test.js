// US22 / US23 / US24 : quiz avec modèles Mongoose réels et persistance simulée en mémoire.
// Aucun appel connect(), aucun serveur MongoDB, aucune base créée.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { Types } = require('mongoose');
const { Utilisateur, Formation, Quiz, Inscription, Tentative } = require('../src/models');
const { signer } = require('../src/utils/jeton');
const app = require('../src/app');

test('US22/23/24 : création, passage et correction des quiz', async (t) => {
  const sauvegarde = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'secret-de-test-uniquement';

  const personne = (nom, roles) => ({ _id: new Types.ObjectId(), nom, prenom: nom, roles });
  const formateur = personne('Formateur', ['FORMATEUR']);
  const autreFormateur = personne('Autre', ['FORMATEUR']);
  const inscrit = personne('Inscrit', ['APPRENANT']);
  const nonInscrit = personne('NonInscrit', ['APPRENANT']);
  const comptes = new Map([formateur, autreFormateur, inscrit, nonInscrit].map((c) => [String(c._id), c]));
  t.mock.method(Utilisateur, 'findById', (id) => ({ select: async () => comptes.get(String(id)) ?? null }));

  const memeId = (a, b) => String(a) === String(b);
  const image = { nom: 'i.png', format: 'image/png', taille: 1, url: '/i.png' };
  const nouvelleFormation = (statut) => new Formation({
    titre: 'F', description: 'D', categories: ['Web'], prix: 10, image, statut,
    formateur: { _id: formateur._id, nom: 'Formateur', prenom: 'Formateur' },
    chapitres: [{ titre: 'C1', ordre: 1, ressources: [] }],
  });
  const brouillon = nouvelleFormation('BROUILLON');
  const publiee = nouvelleFormation('PUBLIEE');
  const formations = [brouillon, publiee];
  t.mock.method(Formation, 'findOne', async (f) =>
    formations.find((x) => memeId(x._id, f._id) && memeId(x.formateur._id, f['formateur._id'])) ?? null);

  const quiz = [];
  t.mock.method(Quiz, 'findOne', async (f) =>
    quiz.find((q) => memeId(q.chapitreId, f.chapitreId) && (!f.formationId || memeId(q.formationId, f.formationId))) ?? null);
  t.mock.method(Quiz, 'findById', async (id) => quiz.find((q) => memeId(q._id, id)) ?? null);
  t.mock.method(Quiz, 'create', async (donnees) => {
    const q = new Quiz(donnees);
    await q.validate();
    quiz.push(q);
    return q;
  });
  t.mock.method(Quiz.prototype, 'save', async function () {
    await this.validate();
    return this;
  });

  // Seul « inscrit » a une inscription ACTIVE à la formation brouillon (cas de test).
  t.mock.method(Inscription, 'findOne', async (f) =>
    memeId(f.apprenantId, inscrit._id) && memeId(f.formationId, brouillon._id) && f.statut === 'ACTIVE'
      ? { _id: new Types.ObjectId() } : null);

  const tentatives = [];
  t.mock.method(Tentative, 'findOne', async (f) =>
    tentatives.filter((x) => memeId(x.apprenantId, f.apprenantId) && memeId(x.quizId, f.quizId))
      .sort((a, b) => b.numeroTentative - a.numeroTentative)[0] ?? null);
  t.mock.method(Tentative, 'create', async (donnees) => {
    const x = new Tentative(donnees);
    await x.validate();
    tentatives.push(x);
    return x;
  });
  t.mock.method(Tentative, 'findById', async (id) => tentatives.find((x) => memeId(x._id, id)) ?? null);

  const serveur = app.listen(0, '127.0.0.1');
  await once(serveur, 'listening');
  const base = `http://127.0.0.1:${serveur.address().port}/api`;
  async function requete(methode, url, qui, { body, statut = 200 } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (qui) headers.Authorization = `Bearer ${signer(qui)}`;
    const r = await fetch(base + url, { method: methode, headers, body: body && JSON.stringify(body) });
    const texte = await r.text();
    assert.equal(r.status, statut, `${methode} ${url} : ${texte}`);
    return texte ? JSON.parse(texte) : null;
  }

  const contenuQuiz = {
    titre: ' Quiz 1 ', scoreMinimum: 50, questions: [
      { enonce: 'Q1', points: 1, propositions: [{ texte: 'a', estCorrecte: true }, { texte: 'b', estCorrecte: false }] },
      { enonce: 'Q2', points: 3, propositions: [{ texte: 'c', estCorrecte: false }, { texte: 'd', estCorrecte: true }] },
    ],
  };
  const urlQuiz = (f) => `/formations/${f._id}/chapitres/${f.chapitres[0]._id}/quiz`;
  let cree;

  try {
    await t.test('US22 : rôles et validation du contenu', async () => {
      await requete('PUT', urlQuiz(brouillon), null, { body: contenuQuiz, statut: 401 });
      await requete('PUT', urlQuiz(brouillon), inscrit, { body: contenuQuiz, statut: 403 });
      const sansBonne = { ...contenuQuiz, questions: [{ enonce: 'Q', points: 1, propositions: [{ texte: 'a', estCorrecte: false }, { texte: 'b', estCorrecte: false }] }] };
      await requete('PUT', urlQuiz(brouillon), formateur, { body: sansBonne, statut: 400 });
      await requete('PUT', urlQuiz(brouillon), formateur, { body: { ...contenuQuiz, questions: [] }, statut: 400 });
      await requete('PUT', urlQuiz(brouillon), formateur, { body: { ...contenuQuiz, scoreMinimum: 120 }, statut: 400 });
    });

    await t.test('US22 : création sur un brouillon, refus hors brouillon et pour un autre formateur', async () => {
      cree = await requete('PUT', urlQuiz(brouillon), formateur, { body: contenuQuiz });
      assert.equal(cree.titre, 'Quiz 1');
      assert.equal(cree.questions.length, 2);
      await requete('PUT', urlQuiz(publiee), formateur, { body: contenuQuiz, statut: 409 });
      await requete('PUT', urlQuiz(brouillon), autreFormateur, { body: contenuQuiz, statut: 404 });
    });

    await t.test('US22 : seul le formateur propriétaire lit le quiz (bonnes réponses)', async () => {
      const lu = await requete('GET', urlQuiz(brouillon), formateur);
      assert.equal(lu.questions[0].propositions[0].estCorrecte, true);
      await requete('GET', urlQuiz(brouillon), autreFormateur, { statut: 404 });
    });

    await t.test('US23 : passage réservé aux inscrits, sans les bonnes réponses', async () => {
      const passage = await requete('GET', `/quiz/${cree._id}/passer`, inscrit);
      assert.equal(passage.questions.length, 2);
      assert.equal(passage.questions[0].propositions[0].estCorrecte, undefined);
      await requete('GET', `/quiz/${cree._id}/passer`, nonInscrit, { statut: 403 });
      await requete('GET', `/quiz/${cree._id}/passer`, formateur, { statut: 403 });
      await requete('GET', '/quiz/pas-un-id/passer', inscrit, { statut: 400 });
    });

    await t.test('US23/US24 : réponses contrôlées, correction et tentatives numérotées', async () => {
      const [q1, q2] = cree.questions;
      const url = `/quiz/${cree._id}/tentatives`;
      const repondre = (p1, p2) => ({ reponses: [
        { questionId: q1._id, propositionId: q1.propositions[p1]._id },
        { questionId: q2._id, propositionId: q2.propositions[p2]._id },
      ] });

      await requete('POST', url, nonInscrit, { body: repondre(0, 1), statut: 403 });
      let r = await requete('POST', url, inscrit, { body: { reponses: [repondre(0, 1).reponses[0]] }, statut: 400 });
      assert.match(r.erreur, /toutes les questions/);
      r = await requete('POST', url, inscrit, {
        body: { reponses: [{ questionId: q1._id, propositionId: q2.propositions[0]._id }, repondre(0, 1).reponses[1]] },
        statut: 400,
      });
      assert.match(r.erreur, /Réponse invalide/);
      assert.equal(tentatives.length, 0, 'aucune tentative enregistrée pour une soumission refusée');

      // 1 point sur 4 → 25 % < 50 % : non validée.
      r = await requete('POST', url, inscrit, { body: repondre(0, 0), statut: 201 });
      assert.deepEqual([r.tentative.numeroTentative, r.tentative.score, r.tentative.valide], [1, 25, false]);
      assert.equal(r.tentative.reponses[0].estCorrecte, true);
      assert.equal(r.tentative.reponses[1].pointsObtenus, 0);
      // 4 points sur 4 → 100 % : validée, tentative n° 2.
      r = await requete('POST', url, inscrit, { body: repondre(0, 1), statut: 201 });
      assert.deepEqual([r.tentative.numeroTentative, r.tentative.score, r.tentative.valide], [2, 100, true]);
    });

    await t.test('US24 : résultat visible uniquement par son apprenant', async () => {
      const id = tentatives[0]._id;
      const r = await requete('GET', `/tentatives/${id}/resultat`, inscrit);
      assert.equal(r.tentative.score, 25);
      await requete('GET', `/tentatives/${id}/resultat`, nonInscrit, { statut: 403 });
    });
  } finally {
    serveur.close();
    if (sauvegarde === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = sauvegarde;
  }
});
