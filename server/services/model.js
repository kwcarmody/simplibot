const { buildChatMessages } = require('../prompts/chat');

function resolveChatEndpoint(endpoint) {
  const normalizedEndpoint = endpoint.replace(/\/+$/, '');
  return /\/(api\/chat|v1\/chat\/completions)$/i.test(normalizedEndpoint)
    ? normalizedEndpoint
    : `${normalizedEndpoint}/api/chat`;
}

function buildModelHeaders({ provider, apiKey }) {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  if (provider === 'Ollama-Cloud' && apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  return headers;
}

async function testModelConnection({ provider, model, endpoint, apiKey }) {
  const response = await fetch(resolveChatEndpoint(endpoint), {
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

async function generateChatReply({ modelSettings, memorySettings, chatMessages }) {
  const payload = {
    model: modelSettings.model,
    stream: false,
    messages: buildChatMessages({ memorySettings, chatMessages }),
  };

  const response = await fetch(resolveChatEndpoint(modelSettings.endpoint), {
    method: 'POST',
    headers: buildModelHeaders({ provider: modelSettings.provider, apiKey: modelSettings.apiKey }),
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || data?.message || `Model request failed with ${response.status}.`);
  }

  const content = data?.message?.content || data?.choices?.[0]?.message?.content || '';
  if (!content) {
    throw new Error('Model returned an empty response.');
  }

  return String(content).trim();
}

module.exports = {
  buildModelHeaders,
  generateChatReply,
  resolveChatEndpoint,
  testModelConnection,
};
