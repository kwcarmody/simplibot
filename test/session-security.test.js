const test = require('node:test');
const assert = require('node:assert/strict');
const { mapUserSettingsRecordToSettings } = require('../server/lib/session');
const { mapModelRecordToRuntimeSettings, mapModelRecordToSessionSettings } = require('../server/services/model-settings-cache');

test('mapUserSettingsRecordToSettings does not expose model api key in session settings', () => {
  const settings = mapUserSettingsRecordToSettings({
    model: 'model_123',
    expand: {
      model: {
        id: 'model_123',
        provider: 'OpenAI',
        modelId: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        baseUrl: 'https://api.openai.com',
        apiKey: 'super-secret-key',
      },
    },
  });

  assert.equal(settings.model.selectedId, 'model_123');
  assert.equal(settings.model.apiKey, '');
});

test('mapModelRecordToSessionSettings strips api key while runtime settings retain it', () => {
  const record = {
    id: 'model_123',
    provider: 'OpenAI',
    modelId: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    baseUrl: 'https://api.openai.com',
    apiKey: 'super-secret-key',
    adapterKey: 'default',
  };

  const sessionSettings = mapModelRecordToSessionSettings(record);
  const runtimeSettings = mapModelRecordToRuntimeSettings(record);

  assert.equal(sessionSettings.apiKey, '');
  assert.equal(runtimeSettings.apiKey, 'super-secret-key');
});
