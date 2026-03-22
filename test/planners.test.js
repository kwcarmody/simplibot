const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSearchPlannerMessages, repairWebSearchToolCall } = require('../server/services/model/planners/search-planner');
const { buildTaskPlannerMessages } = require('../server/services/model/planners/todo-planner');

test('buildSearchPlannerMessages includes JSON-only web-search tool call instructions', () => {
  const messages = buildSearchPlannerMessages({
    memorySettings: { botName: 'Pikori', botDescription: 'Helpful assistant' },
    latestUserMessage: 'who is the mayor of Charlotte?',
    webSearchToolDefinition: {
      description: 'Search the web',
      inputs: [{ key: 'query', description: 'Search query', required: true }],
    },
    searchIntent: { mode: 'encyclopedic_fact' },
    now: new Date('2026-03-22T14:00:00Z'),
  });

  assert.equal(messages.length, 2);
  assert.match(messages[0].content, /"tool":"web-search"/);
  assert.match(messages[0].content, /encyclopedic_fact/);
  assert.match(messages[0].content, /official primary sources/i);
});

test('buildTaskPlannerMessages includes todo-manager tool-call instructions and follow-up rules', () => {
  const messages = buildTaskPlannerMessages({
    memorySettings: { botName: 'Pikori', botDescription: 'Helpful assistant' },
    latestUserMessage: 'remind me to call mom tomorrow',
    todoToolDefinition: {
      description: 'Manage todos',
      inputs: [{ key: 'operations', description: 'Operations array', required: true }],
    },
    chatMessages: [
      { role: 'user', text: 'remind me to call mom' },
      { role: 'assistant', text: 'What time or day would you like?' },
    ],
    now: new Date('2026-03-22T14:00:00Z'),
  });

  assert.equal(messages.length, 2);
  assert.match(messages[0].content, /"tool":"todo-manager"/);
  assert.match(messages[0].content, /ask one concise follow-up question/i);
  assert.match(messages[0].content, /Recent conversation:/i);
});

test('repairWebSearchToolCall forces JSON-only repaired tool call', async () => {
  const parsed = await repairWebSearchToolCall({
    modelSettings: { model: 'llama3' },
    latestUserMessage: 'concerts in Charlotte this weekend',
    adapter: {
      parseAssistantResponse(value) {
        return JSON.parse(value);
      },
    },
    plannerResponse: 'There are probably some concerts.',
    searchIntent: { mode: 'regional_live' },
    requestChatCompletion: async ({ messages }) => {
      assert.match(messages[0].content, /Respond with only one valid JSON tool call/i);
      assert.match(messages[0].content, /Preserve local, temporal, and regional constraints/i);
      return JSON.stringify({
        type: 'tool_call',
        tool: 'web-search',
        input: { query: 'concerts Charlotte weekend' },
      });
    },
  });

  assert.equal(parsed.type, 'tool_call');
  assert.equal(parsed.tool, 'web-search');
  assert.equal(parsed.input.query, 'concerts Charlotte weekend');
});
