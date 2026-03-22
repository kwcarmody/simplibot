const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeJson } = require('../server/services/tool-definitions');

test('normalizeJson parses valid JSON strings', () => {
  const result = normalizeJson('{"enabled":true}', {});
  assert.deepEqual(result, { enabled: true });
});

test('normalizeJson returns fallback for invalid JSON strings', () => {
  const fallback = { fields: [] };
  const result = normalizeJson('{broken json', fallback);
  assert.deepEqual(result, fallback);
});

test('normalizeJson returns object values unchanged', () => {
  const input = { a: 1, b: 2 };
  const result = normalizeJson(input, {});
  assert.equal(result, input);
});

test('normalizeJson returns fallback for falsy values', () => {
  const fallback = { fields: [] };
  const result = normalizeJson('', fallback);
  assert.deepEqual(result, fallback);
});
