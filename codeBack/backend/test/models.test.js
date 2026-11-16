// Tests des modèles Mongoose sans base de données (validation uniquement).
const { test } = require('node:test');
const assert = require('node:assert');
const { Types } = require('mongoose');
const models = require('../src/models');
const { Utilisateur, Formation, Quiz, Demande, Inscription, Tentative, Certificat } = models;

const id = () => new Types.ObjectId();
const fichier = { nom: 'image.png', format: 'image/png', taille: 10, url: 'https://example.test/image.png' };
const personne = { _id: id(), nom: 'Test', prenom: 'Formateur' };
const erreurs = (doc) => Object.keys(doc.validateSync()?.errors ?? {});

test('7 collections avec les noms du diagramme', () => {
  const noms = Object.values(models).map(m => m.collection.collectionName).sort();
  assert.deepStrictEqual(noms, ['Certificat', 'Demande', 'Formation', 'Inscription', 'Quiz', 'Tentative', 'Utilisateur']);
});

test('aucun index incompatible avec Cosmos DB (text, collation, partiel)', () => {
  for (const Model of Object.values(models)) {
    for (const [champs, opts] of Model.schema.indexes()) {
      assert.ok(!Object.values(champs).includes('text'), `index text sur ${Model.modelName}`);
      assert.ok(!opts.collation, `collation sur ${Model.modelName}`);
      assert.ok(!opts.partialFilterExpression, `index partiel sur ${Model.modelName}`);
    }
  }
});

test('Utilisateur : valide, email en minuscules, rejets', () => {
  const u = new Utilisateur({ nom: 'A', prenom: 'B', email: ' Eleve@Example.TEST ', motDePasse: 'hash', roles: ['APPRENANT'] });
  assert.deepStrictEqual(erreurs(u), []);
  assert.strictEqual(u.email, 'eleve@example.test');
  assert.ok(erreurs(new Utilisateur({ nom: 'A', prenom: 'B', email: 'pas-un-email', motDePasse: 'h', roles: ['APPRENANT'] })).includes('email'));
  assert.ok(erreurs(new Utilisateur({ nom: 'A', prenom: 'B', email: 'a@b.c', motDePasse: 'h', roles: [] })).includes('roles'));
  assert.ok(erreurs(new Utilisateur({ nom: 'A', prenom: 'B', email: 'a@b.c', motDePasse: 'h', roles: ['ADMIN'] })).length > 0);
  assert.ok(erreurs(new Utilisateur({ nom: 'A', prenom: 'B', email: 'a@b.c', motDePasse: 'h', roles: ['AGENT', 'AGENT'] })).includes('roles'));
});

test('Formation : brouillon sans chapitre accepté, statut et catégories contrôlés', () => {
  const base = { titre: 'T', description: 'D', categories: ['web'], prix: 0, image: fichier, statut: 'BROUILLON', formateur: personne };
  assert.deepStrictEqual(erreurs(new Formation(base)), []);
  assert.ok(erreurs(new Formation({ ...base, statut: 'INCONNU' })).includes('statut'));
  assert.ok(erreurs(new Formation({ ...base, categories: [] })).includes('categories'));
  assert.ok(erreurs(new Formation({ ...base, prix: -1 })).includes('prix'));
  const f = new Formation({ ...base, chapitres: [{ titre: 'C1', ordre: 1, ressources: [{ titre: 'R', type: 'VIDEO', contenu: fichier, ordre: 1 }] }] });
  assert.deepStrictEqual(erreurs(f), []);
  assert.ok(f.chapitres[0]._id && f.chapitres[0].ressources[0]._id, 'sous-documents avec _id');
});

test('Quiz : au moins 1 question et 2 propositions', () => {
  const props = [{ texte: 'oui', estCorrecte: true }, { texte: 'non', estCorrecte: false }];
  const base = { formationId: id(), chapitreId: id(), titre: 'Q', scoreMinimum: 50 };
  assert.deepStrictEqual(erreurs(new Quiz({ ...base, questions: [{ enonce: 'E', points: 1, propositions: props }] })), []);
  assert.ok(erreurs(new Quiz({ ...base, questions: [] })).includes('questions'));
  assert.ok(erreurs(new Quiz({ ...base, questions: [{ enonce: 'E', points: 1, propositions: [props[0]] }] })).some(e => e.includes('propositions')));
  assert.ok(erreurs(new Quiz({ ...base, scoreMinimum: 120, questions: [{ enonce: 'E', points: 1, propositions: props }] })).includes('scoreMinimum'));
});

test('Demande : champs obligatoires selon le type', () => {
  const formateur = { type: 'FORMATEUR', demandeur: personne, cv: fichier, experience: '5 ans', domaineExpertise: 'Web' };
  assert.deepStrictEqual(erreurs(new Demande(formateur)), []);
  assert.ok(erreurs(new Demande({ type: 'FORMATEUR', demandeur: personne })).includes('cv'));
  assert.deepStrictEqual(erreurs(new Demande({ type: 'VALIDATION', demandeur: personne, formationId: id(), typeValidation: 'MODIFICATION' })), []);
  assert.ok(erreurs(new Demande({ type: 'VALIDATION', demandeur: personne })).includes('formationId'));
});

test('Inscription, Tentative, Certificat : documents valides et rejets', () => {
  assert.deepStrictEqual(erreurs(new Inscription({ apprenantId: id(), formationId: id(), statut: 'ACTIVE' })), []);
  assert.ok(erreurs(new Inscription({ apprenantId: id(), formationId: id(), statut: 'X' })).includes('statut'));
  assert.deepStrictEqual(erreurs(new Tentative({ apprenantId: id(), quizId: id(), numeroTentative: 1 })), []);
  assert.ok(erreurs(new Tentative({ apprenantId: id(), quizId: id(), numeroTentative: 1.5 })).includes('numeroTentative'));
  assert.deepStrictEqual(erreurs(new Certificat({ apprenantId: id(), formationId: id(), identifiantUnique: 'C-1', codeQR: 'https://v' })), []);
  assert.ok(erreurs(new Certificat({ apprenantId: id(), formationId: id() })).includes('identifiantUnique'));
});
