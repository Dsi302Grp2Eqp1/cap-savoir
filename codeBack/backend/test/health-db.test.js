const { test } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');

test('GET /health/db returns 503 when the database is not connected', async () => {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/health/db`);
    assert.strictEqual(res.status, 503);
    const body = await res.json();
    assert.strictEqual(body.ok, false);
    assert.strictEqual(body.connecte, false);
  } finally {
    server.close();
  }
});
