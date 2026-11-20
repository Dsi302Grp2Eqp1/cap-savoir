// US39 / US40 / US12 : routes agent avec modèles Mongoose réels et persistance simulée.
// Aucun appel connect(), aucun serveur MongoDB, aucune base créée.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { Types } = require('mongoose');
const { Utilisateur, Formation, Demande } = require('../src/models');
const { signer } = require('../src/utils/jeton');
const app = require('../src/app');

test('US39/40/12 : validation des formations par un agent', async (t) => {
  const sauvegarde = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'secret-de-test-uniquement';

  const agent = { _id: new Types.ObjectId(), nom: 'Agent', prenom: 'Test', roles: ['AGENT'] };
  const apprenant = { _id: new Types.ObjectId(), nom: 'App', prenom: 'Test', roles: ['APPRENANT'] };
  const comptes = new Map([[String(agent._id), agent], [String(apprenant._id), apprenant]]);
  t.mock.method(Utilisateur, 'findById', (id) => ({ select: async () => comptes.get(String(id)) ?? null }));

  const formateur = { _id: new Types.ObjectId(), nom: 'Ben Ali', prenom: 'Sami' };
  const nouvelleFormation = (titre, statut) => ({
    _id: new Types.ObjectId(), titre, description: 'D', categories: ['Web'], prix: 10,
    statut, formateur, chapitres: [], dateCreation: new Date(),
  });
  const formations = [
    nouvelleFormation('Node.js (avancé)', 'SOUMISE'),
    nouvelleFormation('Angular', 'PUBLIEE'),
    nouvelleFormation('Sans demande', 'SOUMISE'),
  ];
  const demandes = [];
  const memeId = (a, b) => String(a) === String(b);

  // Formation : filtre minimal suffisant pour les requêtes du service.
  let dernierFiltre;
  t.mock.method(Formation, 'find', (filtre) => {
    dernierFiltre = filtre;
    const resultat = formations.filter((f) =>
      (!filtre.statut || f.statut === filtre.statut) &&
      (!filtre.titre || filtre.titre.test(f.titre)) &&
      (!filtre.$or || filtre.$or.some((c) => Object.values(c)[0].test(f.formateur[Object.keys(c)[0].split('.')[1]]))));
    return { select: () => ({ sort: () => ({ lean: async () => resultat }) }) };
  });
  t.mock.method(Formation, 'findById', (id) => ({ lean: async () => formations.find((f) => memeId(f._id, id)) ?? null }));
  t.mock.method(Formation, 'findOne', async (filtre) =>
    formations.find((f) => memeId(f._id, filtre._id) && f.statut === filtre.statut) ?? null);
  t.mock.method(Formation, 'findOneAndUpdate', async (filtre, maj) => {
    const f = formations.find((x) => memeId(x._id, filtre._id) && x.statut === filtre.statut);
    if (!f) return null;
    Object.assign(f, maj);
    return f;
  });

  // Demande : vrais documents Mongoose (validation du schéma), stockés en mémoire.
  const chercherDemandes = (filtre) => demandes.filter((d) =>
    memeId(d.formationId, filtre.formationId) && (!filtre.statut || d.statut === filtre.statut));
  t.mock.method(Demande, 'findOne', (filtre) => {
    const trouvees = chercherDemandes(filtre);
    const premiere = trouvees[0] ?? null;
    return Object.assign(Promise.resolve(premiere), {
      sort: () => ({ lean: async () => (trouvees.at(-1) ? trouvees.at(-1).toObject() : null) }),
    });
  });
  t.mock.method(Demande, 'create', async (donnees) => {
    const d = new Demande(donnees);
    await d.validate();
    demandes.push(d);
    return d;
  });
  t.mock.method(Demande.prototype, 'save', async function () {
    await this.validate();
    return this;
  });
  // Demande déjà en attente pour la première formation.
  await Demande.create({
    type: 'VALIDATION', typeValidation: 'NOUVELLE_FORMATION', formationId: formations[0]._id,
    demandeur: formateur, statut: 'EN_ATTENTE',
  });

  const serveur = app.listen(0, '127.0.0.1');
  await once(serveur, 'listening');
  const base = `http://127.0.0.1:${serveur.address().port}/api/agent`;
  async function requete(methode, url, { body, qui = agent, statut = 200 } = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (qui) headers.Authorization = `Bearer ${signer(qui)}`;
    const r = await fetch(base + url, { method: methode, headers, body: body && JSON.stringify(body) });
    const texte = await r.text();
    assert.equal(r.status, statut, `${methode} ${url} : ${texte}`);
    return texte ? JSON.parse(texte) : null;
  }

  try {
    await t.test('accès réservé aux agents (401 / 403)', async () => {
      await requete('GET', '/formations', { qui: null, statut: 401 });
      await requete('GET', '/formations', { qui: apprenant, statut: 403 });
    });

    await t.test('US39/US40 : liste et recherche par titre, formateur et statut', async () => {
      assert.equal((await requete('GET', '/formations')).formations.length, 3);
      let r = await requete('GET', '/formations?statut=soumise');
      assert.equal(dernierFiltre.statut, 'SOUMISE');
      assert.equal(r.formations.length, 2);
      r = await requete('GET', '/formations?q=' + encodeURIComponent('(avancé)'));
      assert.deepEqual(r.formations.map((f) => f.titre), ['Node.js (avancé)'], 'caractères spéciaux échappés');
      r = await requete('GET', '/formations?formateur=sami');
      assert.equal(r.formations.length, 3);
      r = await requete('GET', '/formations?q=inexistante');
      assert.equal(r.formations.length, 0);
      assert.match(r.message, /Aucune formation/);
    });

    await t.test('US39 : détail en lecture seule', async () => {
      const r = await requete('GET', `/formations/${formations[2]._id}`);
      assert.equal(r.formation.titre, 'Sans demande');
      assert.equal(r.demande, null);
      assert.equal(demandes.length, 1, 'le GET ne crée aucune demande');
      await requete('GET', '/formations/invalide', { statut: 400 });
      await requete('GET', `/formations/${new Types.ObjectId()}`, { statut: 404 });
    });

    await t.test('US12 : décision et motif contrôlés', async () => {
      const url = `/formations/${formations[0]._id}/traiter`;
      await requete('PATCH', url, { body: {}, statut: 400 });
      await requete('PATCH', url, { body: { decision: 'valider' }, statut: 400 });
      await requete('PATCH', url, { body: { decision: 'refuser' }, statut: 400 });
      await requete('PATCH', url, { body: { decision: 'refuser', commentaire: '   ' }, statut: 400 });
      await requete('PATCH', url, { body: { decision: 'refuser', commentaire: 42 }, statut: 400 });
      assert.equal(formations[0].statut, 'SOUMISE', 'rien n\'a changé');
    });

    await t.test('US12 : acceptation → formation publiée, demande acceptée', async () => {
      const r = await requete('PATCH', `/formations/${formations[0]._id}/traiter`, { body: { decision: 'accepter' } });
      assert.equal(r.formation.statut, 'PUBLIEE');
      assert.equal(r.demande.statut, 'ACCEPTEE');
      assert.equal(r.demande.agentId, String(agent._id));
      assert.ok(r.demande.dateDecision);
      await requete('PATCH', `/formations/${formations[0]._id}/traiter`, { body: { decision: 'accepter' }, statut: 404 });
    });

    await t.test('US12 : refus avec motif → brouillon, demande créée si absente', async () => {
      const r = await requete('PATCH', `/formations/${formations[2]._id}/traiter`, {
        body: { decision: 'refuser', commentaire: ' Ajouter un quiz par chapitre ' },
      });
      assert.equal(r.formation.statut, 'BROUILLON');
      assert.equal(r.demande.statut, 'REFUSEE');
      assert.equal(r.demande.commentaire, 'Ajouter un quiz par chapitre');
      assert.equal(demandes.length, 2);
    });
  } finally {
    serveur.close();
    if (sauvegarde === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = sauvegarde;
  }
});
