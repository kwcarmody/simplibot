const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildModelHeaders,
  resolveChatEndpoint,
} = require('../server/services/model');

test('resolveChatEndpoint appends /api/chat for default chat APIs', () => {
  const result = resolveChatEndpoint('http://localhost:11434');
  assert.equal(result, 'http://localhost:11434/api/chat');
});

test('resolveChatEndpoint respects existing /api/chat path', () => {
  const result = resolveChatEndpoint('http://localhost:11434/api/chat');
  assert.equal(result, 'http://localhost:11434/api/chat');
});

test('resolveChatEndpoint respects OpenAI-style completions path', () => {
  const result = resolveChatEndpoint('https://example.com', 'openai-completions');
  assert.equal(result, 'https://example.com/v1/chat/completions');
});

test('buildModelHeaders includes auth header when API key exists', () => {
  const headers = buildModelHeaders({ provider: 'OpenAI', apiKey: 'secret-key' });
  assert.equal(headers.Authorization, 'Bearer secret-key');
  assert.equal(headers.Accept, 'application/json');
  assert.equal(headers['Content-Type'], 'application/json');
});

test('buildModelHeaders omits auth header when no API key exists', () => {
  const headers = buildModelHeaders({ provider: 'OpenAI', apiKey: '' });
  assert.equal(headers.Authorization, undefined);
  assert.equal(headers.Accept, 'application/json');
  assert.equal(headers['Content-Type'], 'application/json');
});
