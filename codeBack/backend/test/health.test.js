const { test } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');

test('GET /health returns 200', async () => {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    assert.strictEqual(res.status, 200);
    for (const origine of ['http://localhost:4200', 'http://127.0.0.1:4200']) {
      const reponse = await fetch(`http://127.0.0.1:${port}/health`, {
        headers: { Origin: origine }
      });
      assert.strictEqual(reponse.status, 200);
      assert.strictEqual(reponse.headers.get('access-control-allow-origin'), origine);
    }
  } finally {
    server.close();
  }
});
