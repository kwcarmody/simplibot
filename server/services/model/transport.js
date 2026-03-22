const { resolveModelAdapterKey } = require('./adapters');
const { extractAssistantContent } = require('./response-extraction');

const MODEL_REQUEST_TIMEOUT_MS = Number.parseInt(process.env.PIKORI_MODEL_TIMEOUT_MS || '45000', 10);

async function fetchWithTimeout(url, options = {}, timeoutMs = MODEL_REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeoutError = new Error(`Model request timed out after ${timeoutMs}ms.`);
      timeoutError.code = 'MODEL_TIMEOUT';
      throw timeoutError;
    }

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function resolveChatEndpoint(endpoint, apiType = '') {
  const normalizedEndpoint = endpoint.replace(/\/+$/, '');
  if (String(apiType || '').trim().toLowerCase() === 'openai-completions') {
    return /\/v1\/chat\/completions$/i.test(normalizedEndpoint)
      ? normalizedEndpoint
      : `${normalizedEndpoint}/v1/chat/completions`;
  }
  return /\/(api\/chat|v1\/chat\/completions)$/i.test(normalizedEndpoint)
    ? normalizedEndpoint
    : `${normalizedEndpoint}/api/chat`;
}

function buildModelHeaders({ provider, apiKey }) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  return headers;
}

async function requestChatCompletion({ modelSettings, messages, logToolDebug = () => {} }) {
  const adapterKey = resolveModelAdapterKey(modelSettings);
  const payload = {
    model: modelSettings.model,
    stream: false,
    messages,
  };

  if (adapterKey === 'default' && modelSettings.thinking) {
    payload.think = true;
  }

  const response = await fetchWithTimeout(resolveChatEndpoint(modelSettings.endpoint, modelSettings.apiType), {
    method: 'POST',
    headers: buildModelHeaders({ provider: modelSettings.provider, apiKey: modelSettings.apiKey }),
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || data?.message || `Model request failed with ${response.status}.`);
  }

  const content = extractAssistantContent(data, adapterKey);
  if (!content) {
    logToolDebug('model-empty-response', {
      model: modelSettings.model,
      endpoint: resolveChatEndpoint(modelSettings.endpoint, modelSettings.apiType),
      adapter: adapterKey,
      responseKeys: data && typeof data === 'object' ? Object.keys(data) : [],
      choiceKeys: data?.choices?.[0] && typeof data.choices[0] === 'object' ? Object.keys(data.choices[0]) : [],
      messageKeys: data?.choices?.[0]?.message && typeof data?.choices?.[0]?.message === 'object'
        ? Object.keys(data.choices[0].message)
        : [],
    });
    throw new Error('Model returned an empty response.');
  }

  logToolDebug('model-response', {
    model: modelSettings.model,
    endpoint: resolveChatEndpoint(modelSettings.endpoint, modelSettings.apiType),
    lastMessageRole: messages[messages.length - 1]?.role || '',
    content,
  });

  return String(content).trim();
}

async function testModelConnection({ provider, model, endpoint, apiKey, apiType = '' }) {
  const response = await fetchWithTimeout(resolveChatEndpoint(endpoint, apiType), {
    method: 'POST',
    headers: buildModelHeaders({ provider, apiKey }),
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: 'Respond with OK' }],
      stream: false,
    }),
  });

  if (response.ok) return true;
  if (response.status === 401 || response.status === 403) {
    throw new Error(`Authentication rejected by model endpoint (${response.status}).`);
  }
  throw new Error(`Endpoint responded with ${response.status}.`);
}

module.exports = {
  buildModelHeaders,
  fetchWithTimeout,
  requestChatCompletion,
  resolveChatEndpoint,
  testModelConnection,
};
