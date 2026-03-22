const test = require('node:test');
const assert = require('node:assert/strict');
const {
  execute,
  shouldAutoExecute,
  validateConfig,
  validateInvocationInput,
} = require('../server/services/tools/web-search');

function createJsonResponse({ ok = true, status = 200, body }) {
  return {
    ok,
    status,
    json: async () => body,
  };
}

test('validateConfig rejects missing base URL', () => {
  assert.equal(validateConfig({ provider: 'Brave', apiKey: 'token' }), 'Base URL is required.');
});

test('validateInvocationInput rejects empty query', () => {
  assert.equal(validateInvocationInput({ query: '   ' }), 'A search query is required.');
});

test('shouldAutoExecute is true for strong search intent and false for greeting', () => {
  assert.equal(shouldAutoExecute({ latestUserMessage: 'find open source CRM tools', input: { query: 'find open source CRM tools' } }), true);
  assert.equal(shouldAutoExecute({ latestUserMessage: 'hey', input: { query: 'hey' } }), false);
});

test('execute calls configured search endpoint and normalizes results', async (t) => {
  const originalFetch = global.fetch;
  let capturedUrl = '';
  let capturedHeaders = null;

  global.fetch = async (url, options) => {
    capturedUrl = url;
    capturedHeaders = options.headers;
    return createJsonResponse({
      body: {
        web: {
          results: [
            {
              title: 'Open Source CRM Guide',
              url: 'https://example.com/crm-guide',
              description: 'A guide to open source CRM tools.',
              extra_snippets: ['Compares several community-maintained CRM options.'],
            },
          ],
        },
      },
    });
  };

  t.after(() => {
    global.fetch = originalFetch;
  });

  const result = await execute({
    input: { query: 'find open source CRM tools' },
    config: {
      baseUrl: 'https://search.example.com',
      provider: 'Brave',
      apiKey: 'token-123',
    },
    latestUserMessage: 'find open source CRM tools',
  });

  assert.match(capturedUrl, /^https:\/\/search\.example\.com\/res\/v1\/web\/search\?/);
  assert.match(capturedUrl, /count=5/);
  assert.match(capturedUrl, /extra_snippets=true/);
  assert.equal(capturedHeaders['X-Subscription-Token'], 'token-123');
  assert.equal(result.provider, 'Brave');
  assert.equal(result.resultCount, 1);
  assert.equal(result.results[0].source, 'example.com');
  assert.equal(result.results[0].extraSnippets[0], 'Compares several community-maintained CRM options.');
});

test('execute appends wikipedia site filter for encyclopedic searches', async (t) => {
  const originalFetch = global.fetch;
  let capturedUrl = '';

  global.fetch = async (url) => {
    capturedUrl = url;
    return createJsonResponse({ body: { web: { results: [] } } });
  };

  t.after(() => {
    global.fetch = originalFetch;
  });

  await execute({
    input: {
      query: 'who is the mayor of Charlotte?',
      searchMode: 'encyclopedic_fact',
    },
    config: {
      baseUrl: 'https://search.example.com',
      provider: 'Brave',
      apiKey: 'token-123',
    },
    latestUserMessage: 'who is the mayor of Charlotte?',
  });

  assert.match(decodeURIComponent(capturedUrl), /site:wikipedia.org/);
});

test('execute throws useful error on failed search response', async (t) => {
  const originalFetch = global.fetch;

  global.fetch = async () => createJsonResponse({
    ok: false,
    status: 500,
    body: {
      message: 'Search provider exploded',
    },
  });

  t.after(() => {
    global.fetch = originalFetch;
  });

  await assert.rejects(
    () => execute({
      input: { query: 'find open source CRM tools' },
      config: {
        baseUrl: 'https://search.example.com',
        provider: 'Brave',
        apiKey: 'token-123',
      },
      latestUserMessage: 'find open source CRM tools',
    }),
    /Search provider exploded/
  );
});
