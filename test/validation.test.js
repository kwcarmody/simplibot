const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateConfiguredChatModel,
  validateMemorySettings,
  validateModelSettings,
} = require('../server/lib/validation');

test('validateConfiguredChatModel rejects missing provider', () => {
  const result = validateConfiguredChatModel({
    provider: '',
    model: 'llama3',
    endpoint: 'http://localhost:11434',
    apiKey: '',
  });

  assert.equal(result, 'Configure a model in Settings before using Chat.');
});

test('validateConfiguredChatModel rejects missing model', () => {
  const result = validateConfiguredChatModel({
    provider: 'Ollama',
    model: '',
    endpoint: 'http://localhost:11434',
    apiKey: '',
  });

  assert.equal(result, 'Complete the model configuration in Settings before using Chat.');
});

test('validateConfiguredChatModel rejects missing endpoint', () => {
  const result = validateConfiguredChatModel({
    provider: 'Ollama',
    model: 'llama3',
    endpoint: '',
    apiKey: '',
  });

  assert.equal(result, 'Complete the model configuration in Settings before using Chat.');
});

test('validateConfiguredChatModel requires API key for Ollama-Cloud', () => {
  const result = validateConfiguredChatModel({
    provider: 'Ollama-Cloud',
    model: 'llama3',
    endpoint: 'https://example.com',
    apiKey: '',
  });

  assert.equal(result, 'Add the API Token in Settings before using Chat.');
});

test('validateModelSettings rejects missing selected model', () => {
  const result = validateModelSettings({ modelId: '' });
  assert.equal(result, 'Choose a model before saving.');
});

test('validateModelSettings accepts valid selected model input', () => {
  const result = validateModelSettings({ modelId: 'model_123' });
  assert.equal(result, '');
});

test('validateMemorySettings rejects invalid maxSize', () => {
  const result = validateMemorySettings({
    maxSize: 0,
    userName: 'Kevin',
    botName: 'Pikori',
    botDescription: 'Helpful bot',
  });

  assert.equal(result, 'Memory max size must be a positive whole number.');
});

test('validateMemorySettings rejects missing userName', () => {
  const result = validateMemorySettings({
    maxSize: 10,
    userName: '',
    botName: 'Pikori',
    botDescription: 'Helpful bot',
  });

  assert.equal(result, 'User name is required.');
});

test('validateMemorySettings rejects missing botName', () => {
  const result = validateMemorySettings({
    maxSize: 10,
    userName: 'Kevin',
    botName: '',
    botDescription: 'Helpful bot',
  });

  assert.equal(result, 'Bot name is required.');
});

test('validateMemorySettings rejects missing botDescription', () => {
  const result = validateMemorySettings({
    maxSize: 10,
    userName: 'Kevin',
    botName: 'Pikori',
    botDescription: '',
  });

  assert.equal(result, 'Bot description is required.');
});

test('validateMemorySettings accepts valid config', () => {
  const result = validateMemorySettings({
    maxSize: 10,
    userName: 'Kevin',
    botName: 'Pikori',
    botDescription: 'Helpful bot',
  });

  assert.equal(result, '');
});
