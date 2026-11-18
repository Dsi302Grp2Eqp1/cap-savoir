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

test('webhook : 400 sans référence, 404 si référence inconnue', () => avecServeur(async (base) => {
  assert.strictEqual((await post(`${base}/api/paiements/webhook`, {})).status, 400);
  assert.strictEqual((await post(`${base}/api/paiements/webhook`, { reference: 'inconnue' })).status, 404);
}));

test('page mock : référence invalide refusée', () => avecServeur(async (base) => {
  assert.strictEqual((await fetch(`${base}/api/paiements/mock/pas-valide`)).status, 400);
}));

test('passerelle mock : EN_ATTENTE puis CONFIRME ou ECHOUE', async () => {
  const ref = 'b'.repeat(24);
  await passerelle.creerSession({ reference: ref, montant: 20 });
  assert.strictEqual((await passerelle.verifier(ref)).statut, 'EN_ATTENTE');
  assert.ok(passerelle.simuler(ref, 'ECHOUE'));
  assert.strictEqual((await passerelle.verifier(ref)).statut, 'ECHOUE');
  assert.strictEqual(passerelle.simuler('c'.repeat(24), 'CONFIRME'), false);
});