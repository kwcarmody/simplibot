const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../server');

async function startServer(t) {
  const server = app.listen(0);
  t.after(() => server.close());

  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  return server;
}

test('POST /chat/send returns 401 when unauthenticated', async (t) => {
  const server = await startServer(t);
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/chat/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: 'hello' }),
  });

  const data = await response.json();
  assert.equal(response.status, 401);
  assert.equal(data.ok, false);
  assert.equal(data.error, 'Sign in required.');
});

test('POST /chat/send returns 400 for empty message when authenticated session exists', async (t) => {
  const originalSession = app.request.session;
  app.request.session = {
    auth: {
      token: 'test-token',
      user: { id: 'user_1' },
    },
  };
  t.after(() => {
    app.request.session = originalSession;
  });

  const server = await startServer(t);
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/chat/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message: '   ' }),
  });

  const data = await response.json();
  assert.equal(response.status, 400);
  assert.equal(data.ok, false);
  assert.equal(data.error, 'Type a message first.');
});

test('POST /chat/reset returns 401 when unauthenticated', async (t) => {
  const server = await startServer(t);
  const { port } = server.address();

  const response = await fetch(`http://127.0.0.1:${port}/chat/reset`, {
    method: 'POST',
  });

  const data = await response.json();
  assert.equal(response.status, 401);
  assert.equal(data.ok, false);
  assert.equal(data.error, 'Sign in required.');
});
