const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');

test('app module loads successfully', () => {
  assert.ok(app);
  assert.equal(typeof app.listen, 'function');
});

test('app can listen on an ephemeral port', async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());

  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  const address = server.address();
  assert.ok(address);
  assert.equal(typeof address.port, 'number');
  assert.ok(address.port > 0);
});

test('unknown route responds without crashing', async (t) => {
  const server = app.listen(0);
  t.after(() => server.close());

  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/definitely-not-a-real-route`);

  assert.notEqual(response.status, 500);
  assert.ok(response.status >= 200 && response.status < 500);
});
