// Server-only cache for resolved model settings, including provider secrets.
// Secrets should not live in user sessions or be sent to the browser, but we
// also do not want to hit PocketBase on every single chat request. This cache
// keeps the secret-bearing model config in process memory for a short TTL.
const { createClient, getModelRecordById } = require('../pocketbase');

const MODEL_SETTINGS_CACHE_TTL_MS = Number.parseInt(process.env.MODEL_SETTINGS_CACHE_TTL_MS || `${5 * 60 * 1000}`, 10);
const modelSettingsCache = new Map();

function mapModelRecordToSessionSettings(record) {
  if (!record) {
    return null;
  }

  return {
    selectedId: record.id || '',
    provider: record.provider || 'None',
    model: record.modelId || '',
    modelName: record.name || record.modelId || '',
    endpoint: record.baseUrl || '',
    apiKey: '',
    adapterKey: record.adapterKey || '',
    apiType: record.apiType || '',
    contextWindow: Number.isFinite(Number(record.contextWindow)) ? Number(record.contextWindow) : 0,
    maxTokens: Number.isFinite(Number(record.maxTokens)) ? Number(record.maxTokens) : 0,
    thinking: Boolean(record.thinking),
    supportsTools: Boolean(record.supportsTools),
    input: record.input || '',
  };
}

function mapModelRecordToRuntimeSettings(record) {
  const base = mapModelRecordToSessionSettings(record);
  if (!base) {
    return null;
  }

  return {
    ...base,
    apiKey: record.apiKey || '',
  };
}

async function resolveModelSettingsForRequest({ authToken, modelId }) {
  const selectedModelId = String(modelId || '').trim();
  if (!selectedModelId) {
    return null;
  }

  const now = Date.now();
  const cached = modelSettingsCache.get(selectedModelId);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const client = createClient(authToken);
  const modelRecord = await getModelRecordById(client, selectedModelId);
  const resolved = mapModelRecordToRuntimeSettings(modelRecord);

  modelSettingsCache.set(selectedModelId, {
    value: resolved,
    expiresAt: now + MODEL_SETTINGS_CACHE_TTL_MS,
  });

  return resolved;
}

function invalidateModelSettingsCache(modelId) {
  const selectedModelId = String(modelId || '').trim();
  if (selectedModelId) {
    modelSettingsCache.delete(selectedModelId);
  }
}

module.exports = {
  invalidateModelSettingsCache,
  mapModelRecordToRuntimeSettings,
  mapModelRecordToSessionSettings,
  resolveModelSettingsForRequest,
};
