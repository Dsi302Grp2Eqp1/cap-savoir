// US19 : tests du service d'accès au contenu (base de données simulée).
const { test } = require('node:test');
const assert = require('node:assert');
const { Types } = require('mongoose');
const { Formation, Inscription } = require('../src/models');
const service = require('../src/services/contenu');

const id = () => new Types.ObjectId();
const apprenant = { _id: id() };
const lean = (valeur) => () => ({ lean: async () => valeur });

test('contenu : identifiant invalide : 400', async () => {
  await assert.rejects(service.lireContenu(apprenant, 'pas-un-id'), { statut: 400 });
});

test('contenu : sans inscription ACTIVE : 403, la formation n\'est pas lue', async (t) => {
  const lecture = t.mock.method(Inscription, 'findOne', lean(null));
  const formation = t.mock.method(Formation, 'findById', lean({}));

  await assert.rejects(service.lireContenu(apprenant, String(id())), { statut: 403 });

  assert.strictEqual(lecture.mock.calls[0].arguments[0].statut, 'ACTIVE');
  assert.strictEqual(lecture.mock.calls[0].arguments[0].apprenantId, apprenant._id);
  assert.strictEqual(formation.mock.callCount(), 0);
});

test('contenu : inscription ACTIVE mais formation supprimée : 404', async (t) => {
  t.mock.method(Inscription, 'findOne', lean({ statut: 'ACTIVE' }));
  t.mock.method(Formation, 'findById', lean(null));
  await assert.rejects(service.lireContenu(apprenant, String(id())), { statut: 404 });
});

test('contenu : chapitres et ressources triés, sans le fichier', async (t) => {
  const formation = {
    _id: id(),
    titre: 'Formation test',
    chapitres: [
      { _id: id(), titre: 'B', ordre: 2, ressources: [] },
      {
        _id: id(), titre: 'A', description: 'd', ordre: 1,
        ressources: [
          { _id: id(), titre: 'R2', type: 'PDF', ordre: 2, contenu: { url: 'secret' } },
          { _id: id(), titre: 'R1', type: 'VIDEO', ordre: 1, contenu: { url: 'secret' } },
        ],
      },
    ],
  };
  t.mock.method(Inscription, 'findOne', lean({ statut: 'ACTIVE' }));
  t.mock.method(Formation, 'findById', lean(formation));

  const res = await service.lireContenu(apprenant, String(formation._id));

  assert.deepStrictEqual(res.chapitres.map((c) => c.titre), ['A', 'B']);
  assert.deepStrictEqual(res.chapitres[0].ressources.map((r) => r.titre), ['R1', 'R2']);
  assert.strictEqual(res.chapitres[0].ressources[0].contenu, undefined);
});
