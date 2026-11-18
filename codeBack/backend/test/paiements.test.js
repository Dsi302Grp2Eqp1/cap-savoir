const { test } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const passerelle = require('../src/services/passerelle');

async function avecServeur(fn) {
  const server = app.listen(0);
  try { await fn(`http://127.0.0.1:${server.address().port}`); }
  finally { server.close(); }
}
const post = (url, corps) => fetch(url, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps)
});

test('checkout sans utilisateur authentifié : 401', () => avecServeur(async (base) => {
  assert.strictEqual((await post(`${base}/api/paiements/checkout`, {})).status, 401);
}));

test('statut sans utilisateur authentifié : 401', () => avecServeur(async (base) => {
  const res = await fetch(`${base}/api/paiements/${'a'.repeat(24)}/statut`);
  assert.strictEqual(res.status, 401);
}));

test('webhook : signature absente ou invalide : 400', () => avecServeur(async (base) => {
  assert.strictEqual((await post(`${base}/api/paiements/webhook`, {})).status, 400);
}));

// Les tests suivants simulent la passerelle : aucun appel à Stripe, aucune base de données.
test('webhook : événement ignoré : 200', (t) => avecServeur(async (base) => {
  t.mock.method(passerelle, 'lireEvenement', () => null);
  assert.strictEqual((await post(`${base}/api/paiements/webhook`, {})).status, 200);
}));

test('webhook : référence inconnue chez la passerelle : 404', (t) => avecServeur(async (base) => {
  t.mock.method(passerelle, 'lireEvenement', () => 'cs_inconnue');
  t.mock.method(passerelle, 'verifier', async () => null);
  assert.strictEqual((await post(`${base}/api/paiements/webhook`, {})).status, 404);
}));

test('webhook : paiement encore en cours chez la passerelle : 200', (t) => avecServeur(async (base) => {
  t.mock.method(passerelle, 'lireEvenement', () => 'cs_en_cours');
  t.mock.method(passerelle, 'verifier', async () => ({ montant: 20, statut: 'EN_ATTENTE' }));
  assert.strictEqual((await post(`${base}/api/paiements/webhook`, {})).status, 200);
}));

test('passerelle : sans clé Stripe, creerSession refuse avec 503', async () => {
  const cle = process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_SECRET_KEY;
  try {
    await assert.rejects(
      passerelle.creerSession({ paiementId: 'a'.repeat(24), montant: 20, titre: 'Test' }),
      { statut: 503 }
    );
  } finally {
    if (cle !== undefined) process.env.STRIPE_SECRET_KEY = cle;
  }
});
