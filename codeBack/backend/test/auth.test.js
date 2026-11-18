// US01 / US02 / US03 : parcours HTTP avec modèles Mongoose réels et persistance simulée en mémoire.
// Aucun appel connect(), aucun serveur MongoDB, aucune base créée.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
const bcrypt = require('bcryptjs');
const { Utilisateur } = require('../src/models');
const app = require('../src/app');
const { authentifier, exigerRole } = require('../src/middlewares/authentification');
const erreurs = require('../src/middlewares/erreurs');

// Petite application de test pour vérifier exigerRole sur une route protégée.
const appRoles = express();
appRoles.get('/agent', authentifier, exigerRole('AGENT'), (req, res) => res.json({ ok: true }));
appRoles.use(erreurs);

test('US01/02/03 : inscription, connexion, rôles et déconnexion', async (t) => {
  const sauvegarde = { ...process.env };
  process.env.JWT_SECRET = 'secret-de-test-uniquement';
  const comptes = new Map(); // _id -> document

  t.mock.method(Utilisateur, 'create', async (donnees) => {
    const doc = new Utilisateur(donnees);
    await doc.validate();
    if ([...comptes.values()].some((c) => c.email === doc.email)) {
      throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
    }
    comptes.set(String(doc._id), doc);
    return doc;
  });
  t.mock.method(Utilisateur, 'findOne', (filtre) => ({
    select: async () => [...comptes.values()].find((c) => c.email === filtre.email) ?? null,
  }));
  t.mock.method(Utilisateur, 'findById', (id) => ({
    select: async () => comptes.get(String(id)) ?? null,
  }));
  t.mock.method(Utilisateur, 'updateOne', async (filtre, maj) => {
    const doc = comptes.get(String(filtre._id));
    if (doc && maj.$inc?.versionJeton) doc.versionJeton += maj.$inc.versionJeton;
    return { modifiedCount: doc ? 1 : 0 };
  });

  const serveur = app.listen(0, '127.0.0.1');
  const serveurRoles = appRoles.listen(0, '127.0.0.1');
  await Promise.all([once(serveur, 'listening'), once(serveurRoles, 'listening')]);
  const base = `http://127.0.0.1:${serveur.address().port}`;
  const baseRoles = `http://127.0.0.1:${serveurRoles.address().port}`;

  async function requete(methode, url, { body, jeton, statut = 200, racine = base } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (jeton) headers.Authorization = `Bearer ${jeton}`;
    const reponse = await fetch(racine + url, {
      method: methode,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const texte = await reponse.text();
    assert.equal(reponse.status, statut, `${methode} ${url} : ${texte}`);
    return texte ? JSON.parse(texte) : null;
  }

  const compte = { nom: 'Ben Salah', prenom: 'Amine', email: ' Amine.Test@Example.com ', motDePasse: 'Secret123' };
  let jeton;

  try {
    await t.test('US01 : création du compte apprenant', async () => {
      const cree = await requete('POST', '/api/auth/inscription', { body: compte, statut: 201 });
      assert.equal(cree.email, 'amine.test@example.com');
      assert.deepEqual(cree.roles, ['APPRENANT']);
      assert.ok(cree.dateCreation, 'date de création enregistrée automatiquement');
      assert.equal(cree.motDePasse, undefined, 'le hachage n\'est jamais renvoyé');

      const stocke = comptes.get(String(cree._id));
      assert.notEqual(stocke.motDePasse, compte.motDePasse, 'mot de passe stocké haché');
      assert.ok(await bcrypt.compare(compte.motDePasse, stocke.motDePasse));
    });

    await t.test('US01 : champs obligatoires et email déjà utilisé', async () => {
      const r = await requete('POST', '/api/auth/inscription', {
        body: { ...compte, email: 'AMINE.test@example.com' },
        statut: 409,
      });
      assert.match(r.erreur, /déjà utilisé/);
      await requete('POST', '/api/auth/inscription', { body: { ...compte, email: 'pas-un-email' }, statut: 400 });
      await requete('POST', '/api/auth/inscription', { body: { ...compte, nom: '  ' }, statut: 400 });
      await requete('POST', '/api/auth/inscription', { body: { ...compte, email: 'b@ex.com', motDePasse: 'court1' }, statut: 400 });
      await requete('POST', '/api/auth/inscription', { body: { ...compte, email: 'c@ex.com', motDePasse: 'sanschiffre' }, statut: 400 });
      await requete('POST', '/api/auth/inscription', { body: {}, statut: 400 });
    });

    await t.test('US02 : identifiants invalides sans révéler le champ fautif', async () => {
      const mauvaisMdp = await requete('POST', '/api/auth/connexion', {
        body: { email: compte.email, motDePasse: 'Mauvais123' },
        statut: 401,
      });
      const emailInconnu = await requete('POST', '/api/auth/connexion', {
        body: { email: 'inconnu@example.com', motDePasse: compte.motDePasse },
        statut: 401,
      });
      assert.equal(mauvaisMdp.erreur, emailInconnu.erreur, 'même message dans les deux cas');
      await requete('POST', '/api/auth/connexion', { body: {}, statut: 401 });
    });

    await t.test('US02 : connexion valide et profil', async () => {
      const session = await requete('POST', '/api/auth/connexion', {
        body: { email: 'AMINE.TEST@example.com', motDePasse: compte.motDePasse },
      });
      assert.ok(session.jeton);
      assert.equal(session.utilisateur.motDePasse, undefined);
      jeton = session.jeton;

      const moi = await requete('GET', '/api/auth/moi', { jeton });
      assert.equal(moi.email, 'amine.test@example.com');
      assert.deepEqual(moi.roles, ['APPRENANT']);
    });

    await t.test('US02 : jeton absent, modifié ou signé avec une autre clé', async () => {
      await requete('GET', '/api/auth/moi', { statut: 401 });
      await requete('GET', '/api/auth/moi', { jeton: `${jeton}x`, statut: 401 });
      const jwt = require('jsonwebtoken');
      const faux = jwt.sign({ v: 0 }, 'autre-cle', { subject: [...comptes.keys()][0] });
      await requete('GET', '/api/auth/moi', { jeton: faux, statut: 401 });
    });

    await t.test('US03 : accès refusé (403) à l\'espace d\'un autre rôle', async () => {
      await requete('GET', '/agent', { racine: baseRoles, statut: 401 });
      await requete('GET', '/agent', { racine: baseRoles, jeton, statut: 403 });
      // Le rôle est relu en base : un changement de rôle s'applique sans reconnexion.
      [...comptes.values()][0].roles = ['APPRENANT', 'AGENT'];
      await requete('GET', '/agent', { racine: baseRoles, jeton });
      [...comptes.values()][0].roles = ['APPRENANT'];
    });

    await t.test('US02 : la déconnexion invalide la session', async () => {
      await requete('POST', '/api/auth/deconnexion', { jeton, statut: 204 });
      await requete('GET', '/api/auth/moi', { jeton, statut: 401 });
      await requete('POST', '/api/auth/deconnexion', { jeton, statut: 401 });
    });

    await t.test('configuration : JWT_SECRET absent', async () => {
      delete process.env.JWT_SECRET;
      await requete('POST', '/api/auth/connexion', {
        body: { email: compte.email, motDePasse: compte.motDePasse },
        statut: 503,
      });
      process.env.JWT_SECRET = 'secret-de-test-uniquement';
    });
  } finally {
    serveur.close();
    serveurRoles.close();
    process.env = sauvegarde;
  }
});

test('exigerRole refuse un rôle inconnu à la déclaration', () => {
  assert.throws(() => exigerRole('ADMIN'), /rôle\(s\) invalide/);
  assert.throws(() => exigerRole(), /rôle\(s\) invalide/);
});
