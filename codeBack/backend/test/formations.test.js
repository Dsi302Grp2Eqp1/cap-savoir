// Parcours HTTP avec modèles Mongoose réels et persistance simulée en mémoire.
// Aucun appel connect(), aucun serveur MongoDB, aucune base créée.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { Types } = require('mongoose');
const { Formation, Utilisateur } = require('../src/models');
const app = require('../src/app');

test('US08/09/10 : parcours HTTP sans base de données', async (t) => {
  const sauvegarde = { ...process.env };
  const repertoire = await fs.mkdtemp(path.join(os.tmpdir(), 'capsavoir-fichiers-test-'));
  process.env.UPLOAD_DIR = repertoire;
  const personne = {
    _id: new Types.ObjectId(),
    nom: 'Test',
    prenom: 'Formateur',
    roles: ['FORMATEUR'],
  };
  process.env.FORMATEUR_ID = String(personne._id);
  const documents = new Map();
  t.mock.method(Utilisateur, 'findById', (id) => ({
    select: async () => (id === String(personne._id) ? personne : null),
  }));
  t.mock.method(Formation, 'create', async (donnees) => {
    const doc = new Formation(donnees);
    await doc.save();
    return doc;
  });
  t.mock.method(Formation.prototype, 'save', async function () {
    await this.validate();
    documents.set(String(this._id), this);
    return this;
  });
  t.mock.method(Formation, 'findOne', async (filtre) => {
    const doc = documents.get(String(filtre._id));
    return doc && String(doc.formateur._id) === String(filtre['formateur._id']) ? doc : null;
  });
  t.mock.method(Formation, 'find', (filtre) => ({
    select: () => ({
      sort: () => ({
        limit: async () =>
          [...documents.values()].filter(
            (d) => String(d.formateur._id) === String(filtre['formateur._id']),
          ),
      }),
    }),
  }));
  const serveur = app.listen(0, '127.0.0.1');
  await once(serveur, 'listening');
  const base = `http://127.0.0.1:${serveur.address().port}`;
  async function requete(methode, url, body, statut = 200) {
    const reponse = await fetch(base + url, {
      method: methode,
      headers: body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {},
      body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    });
    assert.equal(reponse.status, statut, `${methode} ${url} : ${await reponse.clone().text()}`);
    return reponse.json();
  }
  async function upload(type, contenu, nom, statut = 201) {
    const data = new FormData();
    data.append('fichier', new Blob([contenu]), nom);
    return requete('POST', `/api/fichiers?type=${type}`, data, statut);
  }
  let formation, image;
  try {
    await t.test('configuration absente ou profil non formateur', async () => {
      delete process.env.FORMATEUR_ID;
      await requete('GET', '/api/formations', undefined, 503);
      process.env.FORMATEUR_ID = String(personne._id);
      personne.roles = ['APPRENANT'];
      await requete('GET', '/api/formations', undefined, 403);
      personne.roles = ['FORMATEUR'];
    });
    await t.test(
      'fichiers : contenu réel, mauvais format, texte vide, traversée et propriété',
      async () => {
        const png = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jO9sAAAAASUVORK5CYII=',
          'base64',
        );
        image = await upload('IMAGE', png, 'couverture.png');
        await upload('IMAGE', 'ceci est un faux fichier PNG', 'faux.png', 400);
        await upload('constructor', png, 'test.png', 400);
        await upload('TEXTE', '   ', 'vide.txt', 400);
        await upload('TEXTE', Buffer.from([0xc3, 0x28]), 'encodage-invalide.txt', 400);
        await upload('TEXTE', png, 'image-deguisee.txt', 400);
        await upload('PDF', png, 'faux.pdf', 400);
        assert.equal((await fetch(base + image.url)).status, 200);
        const autreId = String(new Types.ObjectId());
        await requete('GET', image.url.replace(String(personne._id), autreId), undefined, 404);
      },
    );
    await t.test(
      'US08 : formation en brouillon, champs validés et propriétés serveur protégées',
      async () => {
        const donnees = {
          titre: ' Node.js ',
          description: 'Apprendre Express',
          categories: ['Web', 'Web'],
          prix: 0,
          image,
        };
        await requete('POST', '/api/formations', { ...donnees, prix: -1 }, 400);
        await requete('POST', '/api/formations', { ...donnees, prix: '10' }, 400);
        await requete('POST', '/api/formations', { ...donnees, titre: '  ' }, 400);
        await requete('POST', '/api/formations', { ...donnees, categories: [] }, 400);
        await requete(
          'POST',
          '/api/formations',
          { ...donnees, image: { url: 'https://exemple.test/a.png' } },
          400,
        );
        formation = await requete(
          'POST',
          '/api/formations',
          {
            ...donnees,
            statut: 'PUBLIEE',
            formateur: { _id: new Types.ObjectId() },
            chapitres: [{ titre: 'injecté' }],
          },
          201,
        );
        assert.equal(formation.titre, 'Node.js');
        assert.equal(formation.statut, 'BROUILLON');
        assert.equal(formation.formateur._id, String(personne._id));
        assert.deepEqual(formation.categories, ['Web']);
        assert.equal(formation.chapitres.length, 0);
        assert.equal((await requete('GET', '/api/formations')).length, 1);
        await requete('GET', '/api/formations/invalide', undefined, 400);
      },
    );
    await t.test('US09 : ajout, modification et réorganisation des chapitres', async () => {
      const url = `/api/formations/${formation._id}/chapitres`;
      formation = await requete('POST', url, { titre: 'Introduction' }, 201);
      formation = await requete(
        'POST',
        url,
        { titre: 'Installation', description: 'Le poste de travail' },
        201,
      );
      const ids = formation.chapitres.map((c) => c._id);
      await requete('PUT', url + '/ordre', { ids: [ids[0], ids[0]] }, 400);
      await requete('PUT', url + '/ordre', { ids: [ids[0]] }, 400);
      formation = await requete('PUT', url + '/ordre', {
        ids: ids.toReversed(),
      });
      assert.equal(formation.chapitres[0].titre, 'Installation');
      assert.deepEqual(
        formation.chapitres.map((c) => c.ordre),
        [1, 2],
      );
      formation = await requete('PATCH', url + '/' + ids[0], {
        titre: 'Bienvenue',
        description: 'Objectifs',
      });
      assert.equal(formation.chapitres[1].titre, 'Bienvenue');
      await requete('POST', url, { titre: ' ' }, 400);
      await requete('PATCH', url + '/' + new Types.ObjectId(), { titre: 'Absent' }, 404);
    });
    await t.test(
      'US10 : documents, vidéos, PDF, textes et images associés au bon chapitre',
      async () => {
        const chapitre = formation.chapitres[0];
        const url = `/api/formations/${formation._id}/chapitres/${chapitre._id}/ressources`;
        const texte = await upload('TEXTE', 'Bienvenue dans ce chapitre pédagogique.', 'cours.txt');
        const pdf = await upload('PDF', '%PDF-1.4\n%%EOF\n', 'cours.pdf');
        const doc = await upload('DOCUMENT', '{\\rtf1\\ansi Un document}', 'cours.rtf');
        const mp4 = Buffer.from('000000186674797069736f6d0000000069736f6d6d703432', 'hex');
        const video = await upload('VIDEO', mp4, 'cours.mp4');
        // Archive ODP minimale contenant le champ mimetype.
        const odp = Buffer.from(
          'UEsDBBQAAAAIALGZcV0zJqyoNAAAAC8AAAAIAAAAbWltZXR5cGUBLwDQ/2FwcGxpY2F0aW9uL3ZuZC5vYXNpcy5vcGVuZG9jdW1lbnQucHJlc2VudGF0aW9uUEsBAhQAFAAAAAgAsZlxXTMmrKg0AAAALwAAAAgAAAAAAAAAAAAAAAAAAAAAAG1pbWV0eXBlUEsFBgAAAAABAAEANgAAAFoAAAAAAA==',
          'base64',
        );
        const presentation = await upload('PRESENTATION', odp, 'cours.odp');
        for (const [type, contenu] of [
          ['TEXTE', texte],
          ['PDF', pdf],
          ['DOCUMENT', doc],
          ['IMAGE', image],
          ['VIDEO', video],
          ['PRESENTATION', presentation],
        ]) {
          formation = await requete('POST', url, { titre: `Cours ${type}`, type, contenu }, 201);
        }
        assert.equal(formation.chapitres[0].ressources.length, 6);
        assert.equal(formation.chapitres[1].ressources.length, 0);
        await requete('POST', url, { titre: 'Erreur', type: 'VIDEO', contenu: pdf }, 400);
        await requete('POST', url, { titre: 'Erreur', type: 'constructor', contenu: pdf }, 400);
        const ids = formation.chapitres[0].ressources.map((r) => r._id);
        formation = await requete('PATCH', url + '/' + ids[0], { titre: 'Objectifs du cours' });
        assert.equal(formation.chapitres[0].ressources[0].titre, 'Objectifs du cours');
        assert.equal(formation.chapitres[0].ressources[0].type, 'TEXTE');
        await requete('PATCH', url + '/' + ids[0], { titre: ' ' }, 400);
        await requete('PATCH', url + '/' + new Types.ObjectId(), { titre: 'Absent' }, 404);
        await requete('PUT', url + '/ordre', { ids: Array(ids.length).fill(ids[0]) }, 400);
        formation = await requete('PUT', url + '/ordre', {
          ids: ids.toReversed(),
        });
        assert.equal(formation.chapitres[0].ressources[0].type, 'PRESENTATION');
        formation = await requete('DELETE', url + '/' + ids[0]);
        assert.deepEqual(
          formation.chapitres[0].ressources.map((r) => r.ordre),
          [1, 2, 3, 4, 5],
        );
      },
    );
    await t.test(
      'autre formateur exclu, brouillons seuls modifiables, suppression cohérente',
      async () => {
        const doc = documents.get(formation._id);
        doc.formateur._id = new Types.ObjectId();
        await requete('GET', `/api/formations/${formation._id}`, undefined, 404);
        doc.formateur._id = personne._id;
        doc.statut = 'PUBLIEE';
        await requete(
          'POST',
          `/api/formations/${formation._id}/chapitres`,
          { titre: 'Interdit' },
          409,
        );
        doc.statut = 'BROUILLON';
        formation = await requete(
          'DELETE',
          `/api/formations/${formation._id}/chapitres/${formation.chapitres[0]._id}`,
        );
        assert.equal(formation.chapitres.length, 1);
        assert.equal(formation.chapitres[0].ordre, 1);
        await requete('POST', '/api/formations', '{json invalide', 400);
      },
    );
  } finally {
    serveur.closeAllConnections();
    await new Promise((resolve) => serveur.close(resolve));
    await fs.rm(repertoire, { recursive: true, force: true });
    for (const nom of ['UPLOAD_DIR', 'FORMATEUR_ID']) {
      if (sauvegarde[nom] === undefined) delete process.env[nom];
      else process.env[nom] = sauvegarde[nom];
    }
  }
});
