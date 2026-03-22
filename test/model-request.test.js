const test = require('node:test');
const assert = require('node:assert/strict');
const { requestChatCompletion } = require('../server/services/model');

function createJsonResponse({ ok = true, status = 200, body }) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

test('requestChatCompletion posts to resolved endpoint and returns assistant content', async (t) => {
  const originalFetch = global.fetch;
  let captured = null;

  global.fetch = async (url, options) => {
    captured = { url, options };
    return createJsonResponse({
      body: {
        message: { content: 'hello from model' },
      },
    });
  };

  t.after(() => {
    global.fetch = originalFetch;
  });

  const text = await requestChatCompletion({
    modelSettings: {
      provider: 'Ollama',
      model: 'llama3',
      endpoint: 'http://localhost:11434',
      apiKey: '',
    },
    messages: [{ role: 'user', content: 'Hi' }],
  });

  assert.equal(text, 'hello from model');
  assert.equal(captured.url, 'http://localhost:11434/api/chat');
  assert.equal(captured.options.method, 'POST');
  assert.match(captured.options.body, /"model":"llama3"/);
  assert.match(captured.options.body, /"messages":\[/);
});

test('requestChatCompletion includes think flag for default adapter when thinking is enabled', async (t) => {
  const originalFetch = global.fetch;
  let payload = null;

  global.fetch = async (_url, options) => {
    payload = JSON.parse(options.body);
    return createJsonResponse({
      body: {
        message: { content: 'thinking reply' },
      },
    });
  };

  t.after(() => {
    global.fetch = originalFetch;
  });

  await requestChatCompletion({
    modelSettings: {
      provider: 'Ollama',
      model: 'llama3',
      endpoint: 'http://localhost:11434',
      thinking: true,
    },
    messages: [{ role: 'user', content: 'Think harder' }],
  });

  assert.equal(payload.think, true);
});

test('requestChatCompletion throws model error message from failed response', async (t) => {
  const originalFetch = global.fetch;

  global.fetch = async () => createJsonResponse({
    ok: false,
    status: 401,
    body: {
      error: 'Authentication rejected',
    },
  });

  t.after(() => {
    global.fetch = originalFetch;
  });

  await assert.rejects(
    () => requestChatCompletion({
      modelSettings: {
        provider: 'OpenAI',
        model: 'gpt-4o-mini',
        endpoint: 'https://example.com',
        apiKey: 'bad-key',
        apiType: 'openai-completions',
      },
      messages: [{ role: 'user', content: 'Hi' }],
    }),
    /Authentication rejected/
  );
});

test('requestChatCompletion throws on empty model response', async (t) => {
  const originalFetch = global.fetch;

  global.fetch = async () => createJsonResponse({
    body: {
      choices: [{ message: { content: '' } }],
    },
  });

  t.after(() => {
    global.fetch = originalFetch;
  });

  await assert.rejects(
    () => requestChatCompletion({
      modelSettings: {
        provider: 'OpenAI',
        model: 'gpt-4o-mini',
        endpoint: 'https://example.com',
        apiKey: 'key',
        apiType: 'openai-completions',
      },
      messages: [{ role: 'user', content: 'Hi' }],
    }),
    /empty response/
  );
});
