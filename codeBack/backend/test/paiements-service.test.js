// US18 : tests de la logique de paiement (services/paiements.js).
// Base de données et passerelle simulées : aucun appel réseau, aucune connexion MongoDB.
const { test } = require('node:test');
const assert = require('node:assert');
const { Types } = require('mongoose');
const { Formation, Inscription } = require('../src/models');
const passerelle = require('../src/services/passerelle');
const service = require('../src/services/paiements');

const id = () => new Types.ObjectId();
const apprenant = { _id: id() };
const formation = { _id: id(), titre: 'Formation test', prix: 20, statut: 'PUBLIEE' };
const lean = (valeur) => () => ({ lean: async () => valeur });
const inscriptionDe = (statutPaiement, statutInscription, paiementId) => ({
  statut: statutInscription,
  paiements: [{ _id: paiementId, statut: statutPaiement, referenceTransaction: 'cs_test_1' }],
});

test('checkout : identifiant de formation invalide : 400', async () => {
  await assert.rejects(service.creerCheckout(apprenant, 'pas-un-id'), { statut: 400 });
});

test('checkout : formation introuvable ou non publiée : 404', async (t) => {
  t.mock.method(Formation, 'findOne', lean(null));
  await assert.rejects(service.creerCheckout(apprenant, String(formation._id)), { statut: 404 });
});

test('checkout : formation gratuite : 400', async (t) => {
  t.mock.method(Formation, 'findOne', lean({ ...formation, prix: 0 }));
  await assert.rejects(service.creerCheckout(apprenant, String(formation._id)), { statut: 400 });
});

test('checkout : déjà payé : 409, sans appeler la passerelle', async (t) => {
  t.mock.method(Formation, 'findOne', lean(formation));
  t.mock.method(Inscription, 'findOneAndUpdate', async () => ({ _id: id(), statut: 'ACTIVE' }));
  const creer = t.mock.method(passerelle, 'creerSession', async () => ({}));
  await assert.rejects(service.creerCheckout(apprenant, String(formation._id)), { statut: 409 });
  assert.strictEqual(creer.mock.callCount(), 0);
});

test('checkout : le montant vient de la formation et le paiement est enregistré EN_ATTENTE', async (t) => {
  t.mock.method(Formation, 'findOne', lean(formation));
  t.mock.method(Inscription, 'findOneAndUpdate', async () => ({ _id: id(), statut: 'EN_ATTENTE_PAIEMENT' }));
  const creer = t.mock.method(passerelle, 'creerSession',
    async () => ({ reference: 'cs_test_1', moyen: 'CARTE', url: 'https://paiement.test/cs_test_1' }));
  const maj = t.mock.method(Inscription, 'updateOne', async () => ({}));

  const res = await service.creerCheckout(apprenant, String(formation._id));

  assert.strictEqual(res.url, 'https://paiement.test/cs_test_1');
  assert.strictEqual(creer.mock.calls[0].arguments[0].montant, 20);
  const paiement = maj.mock.calls[0].arguments[1].$push.paiements;
  assert.strictEqual(paiement.statut, 'EN_ATTENTE');
  assert.strictEqual(paiement.montant, 20);
  assert.strictEqual(paiement.referenceTransaction, 'cs_test_1');
  assert.strictEqual(String(paiement._id), String(res.paiementId));
});

test('checkout : deux requêtes simultanées (erreur 11000) : l\'inscription est relue', async (t) => {
  let appels = 0;
  t.mock.method(Formation, 'findOne', lean(formation));
  t.mock.method(Inscription, 'findOneAndUpdate', async () => {
    appels++;
    if (appels === 1) throw Object.assign(new Error('doublon'), { code: 11000 });
    return { _id: id(), statut: 'EN_ATTENTE_PAIEMENT' };
  });
  t.mock.method(passerelle, 'creerSession', async () => ({ reference: 'cs_test_2', moyen: 'CARTE', url: 'https://paiement.test' }));
  t.mock.method(Inscription, 'updateOne', async () => ({}));

  await service.creerCheckout(apprenant, String(formation._id));
  assert.strictEqual(appels, 2);
});

test('webhook : paiement confirmé : inscription ACTIVE, uniquement si EN_ATTENTE au même montant', async (t) => {
  t.mock.method(passerelle, 'lireEvenement', () => 'cs_ok');
  t.mock.method(passerelle, 'verifier', async () => ({ montant: 20, statut: 'CONFIRME' }));
  const maj = t.mock.method(Inscription, 'updateOne', async () => ({}));

  await service.traiterWebhook(Buffer.from('{}'), 'signature');

  const [filtre, modif] = maj.mock.calls[0].arguments;
  assert.deepStrictEqual(filtre, {
    paiements: { $elemMatch: { referenceTransaction: 'cs_ok', statut: 'EN_ATTENTE', montant: 20 } },
  });
  assert.strictEqual(modif.$set.statut, 'ACTIVE');
  assert.strictEqual(modif.$set['paiements.$.statut'], 'CONFIRME');
  assert.ok(modif.$set['paiements.$.datePaiement'] instanceof Date);
});

test('webhook : paiement échoué : aucun accès accordé', async (t) => {
  t.mock.method(passerelle, 'lireEvenement', () => 'cs_ko');
  t.mock.method(passerelle, 'verifier', async () => ({ montant: 20, statut: 'ECHOUE' }));
  const maj = t.mock.method(Inscription, 'updateOne', async () => ({}));

  await service.traiterWebhook(Buffer.from('{}'), 'signature');

  const modif = maj.mock.calls[0].arguments[1];
  assert.strictEqual(modif.$set['paiements.$.statut'], 'ECHOUE');
  assert.strictEqual(modif.$set.statut, undefined);
});

test('statut : un apprenant ne lit que ses propres paiements (404 sinon)', async (t) => {
  const lecture = t.mock.method(Inscription, 'findOne', lean(null));
  const paiementId = String(id());

  await assert.rejects(service.lireStatut(apprenant, paiementId), { statut: 404 });
  assert.strictEqual(lecture.mock.calls[0].arguments[0].apprenantId, apprenant._id);
});

test('statut : paiement EN_ATTENTE : la passerelle est interrogée puis l\'état relu', async (t) => {
  const paiementId = id();
  const lectures = [
    inscriptionDe('EN_ATTENTE', 'EN_ATTENTE_PAIEMENT', paiementId),
    inscriptionDe('CONFIRME', 'ACTIVE', paiementId),
  ];
  t.mock.method(Inscription, 'findOne', () => ({ lean: async () => lectures.shift() }));
  t.mock.method(passerelle, 'verifier', async () => ({ montant: 20, statut: 'CONFIRME' }));
  t.mock.method(Inscription, 'updateOne', async () => ({}));

  const res = await service.lireStatut(apprenant, String(paiementId));
  assert.deepStrictEqual(res, { paiement: 'CONFIRME', inscription: 'ACTIVE' });
});