const test = require('node:test');
const assert = require('node:assert/strict');
const {
  compactComparisonText,
  getSignificantTokens,
  isLikelyTaskActionRequest,
  isLikelyTaskFollowup,
  isSuspiciousPhiTaskToolCall,
  normalizeComparisonText,
  shouldRetryForMissingTaskToolCall,
} = require('../server/services/model/policies/task-policy');

test('normalizeComparisonText lowercases and strips punctuation', () => {
  assert.equal(normalizeComparisonText('Remind me, Tomorrow at 4 PM!'), 'remind me tomorrow at 4 pm');
});

test('compactComparisonText removes spaces after normalization', () => {
  assert.equal(compactComparisonText('Wed at 4 PM'), 'wedat4pm');
});

test('getSignificantTokens removes short/common task words', () => {
  assert.deepEqual(getSignificantTokens('remind me to call Kevin tomorrow about invoices'), ['call', 'kevin', 'about', 'invoices']);
});

test('isLikelyTaskActionRequest detects todo-style prompts when todo-manager is enabled', () => {
  const result = isLikelyTaskActionRequest({
    tools: [{ toolKey: 'todo-manager', enabled: true }],
    latestUserMessage: 'add a task to call mom tomorrow',
  });

  assert.equal(result, true);
});

test('isLikelyTaskActionRequest is false when todo-manager is unavailable', () => {
  const result = isLikelyTaskActionRequest({
    tools: [{ toolKey: 'web-search', enabled: true }],
    latestUserMessage: 'add a task to call mom tomorrow',
  });

  assert.equal(result, false);
});

test('isLikelyTaskFollowup detects answer to prior task follow-up question', () => {
  const result = isLikelyTaskFollowup({
    tools: [{ toolKey: 'todo-manager', enabled: true }],
    chatMessages: [
      { role: 'user', text: 'remind me to call mom' },
      { role: 'assistant', text: 'What time or day would you like?' },
      { role: 'user', text: 'tomorrow at 4 pm' },
    ],
  });

  assert.equal(result, true);
});

test('isSuspiciousPhiTaskToolCall rejects mismatched created task content', () => {
  const result = isSuspiciousPhiTaskToolCall({
    latestUserMessage: 'remind me to call mom tomorrow',
    toolCall: {
      tool: 'todo-manager',
      input: {
        operations: [
          {
            action: 'create_task',
            title: 'Buy plane tickets',
            dueDateText: 'next month',
          },
        ],
      },
    },
  });

  assert.equal(result, true);
});

test('isSuspiciousPhiTaskToolCall allows matching created task content', () => {
  const result = isSuspiciousPhiTaskToolCall({
    latestUserMessage: 'remind me to call mom tomorrow at 4 pm',
    toolCall: {
      tool: 'todo-manager',
      input: {
        operations: [
          {
            action: 'create_task',
            title: 'call mom',
            dueDateText: 'tomorrow at 4 pm',
          },
        ],
      },
    },
  });

  assert.equal(result, false);
});

test('shouldRetryForMissingTaskToolCall detects synthetic task side-effect text', () => {
  const result = shouldRetryForMissingTaskToolCall({
    adapterKey: 'default',
    tools: [{ toolKey: 'todo-manager', enabled: true }],
    latestUserMessage: 'add a task to call mom',
    responseText: 'Created task abc123 for you.',
  });

  assert.equal(result, true);
});

test('shouldRetryForMissingTaskToolCall ignores non-default adapters', () => {
  const result = shouldRetryForMissingTaskToolCall({
    adapterKey: 'phi4-mini',
    tools: [{ toolKey: 'todo-manager', enabled: true }],
    latestUserMessage: 'add a task to call mom',
    responseText: 'Created task abc123 for you.',
  });

  assert.equal(result, false);
});
