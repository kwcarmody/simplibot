const test = require('node:test');
const assert = require('node:assert/strict');
const {
  generateChatReply,
  handleSearchFlow,
  handleTaskFlow,
} = require('../server/services/model/chat-orchestrator');

function createBaseContext(overrides = {}) {
  return {
    modelSettings: { model: 'llama3', provider: 'Ollama', endpoint: 'http://localhost:11434' },
    memorySettings: { botName: 'Pikori', botDescription: 'Helpful assistant' },
    chatMessages: [{ role: 'user', text: 'hello' }],
    tools: [],
    conversationContext: {},
    toolContext: {},
    latestUserMessage: 'hello',
    adapter: {
      buildMessages() { return []; },
      parseAssistantResponse() { return { type: 'text', text: 'ok' }; },
    },
    adapterKey: 'default',
    now: new Date('2026-03-22T14:00:00Z'),
    requestChatCompletion: async () => 'ok',
    logToolDebug() {},
    ...overrides,
  };
}

test('handleTaskFlow returns null when todo-manager prompt definition is unavailable', async () => {
  const result = await handleTaskFlow(createBaseContext({
    tools: [{ toolKey: 'web-search', enabled: true, promptDefinition: { toolKey: 'web-search' } }],
    latestUserMessage: 'add a task to call mom',
    chatMessages: [{ role: 'user', text: 'add a task to call mom' }],
  }));

  assert.equal(result, null);
});

test('handleSearchFlow answers internal meta questions locally', async () => {
  const result = await handleSearchFlow(createBaseContext({
    tools: [{ toolKey: 'web-search', enabled: true, promptDefinition: { toolKey: 'web-search', description: 'Search web', inputs: [] } }],
    latestUserMessage: 'what are grounded facts in this app?',
    chatMessages: [{ role: 'user', text: 'what are grounded facts in this app?' }],
  }));

  assert.match(result.text, /grounded facts are the reduced evidence snippets/i);
  assert.equal(result.debug.renderedBy, 'search-intent-local');
});

test('generateChatReply falls back to default flow for plain chat text', async () => {
  const result = await generateChatReply({
    modelSettings: { model: 'llama3', provider: 'Ollama', endpoint: 'http://localhost:11434' },
    memorySettings: { botName: 'Pikori', botDescription: 'Helpful assistant' },
    chatMessages: [{ role: 'user', text: 'hello there' }],
    tools: [],
    conversationContext: {},
    toolContext: {},
    requestChatCompletion: async () => 'hello back',
    logToolDebug() {},
  });

  assert.equal(result.text, 'hello back');
  assert.equal(result.debug.toolAttempted, false);
});
