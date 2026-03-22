function normalizeComparisonText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactComparisonText(value) {
  return normalizeComparisonText(value).replace(/\s+/g, '');
}

function getSignificantTokens(value) {
  const stopWords = new Set([
    'a', 'an', 'and', 'archive', 'archived', 'at', 'by', 'create', 'delete', 'do', 'due', 'find', 'for',
    'from', 'go', 'i', 'in', 'include', 'is', 'it', 'list', 'me', 'my', 'new', 'not', 'of', 'on', 'pm',
    'query', 'remind', 'search', 'show', 'task', 'tasks', 'the', 'this', 'title', 'to', 'tomorrow', 'update',
    'with',
  ]);

  return normalizeComparisonText(value)
    .split(' ')
    .filter((token) => token.length >= 3 && !stopWords.has(token));
}

function hasMeaningfulTokenOverlap(a, b) {
  const aTokens = getSignificantTokens(a);
  const bTokens = new Set(getSignificantTokens(b));
  if (!aTokens.length || !bTokens.size) {
    return false;
  }

  return aTokens.some((token) => bTokens.has(token));
}

function detectTaskIntentFlags(latestUserMessage = '') {
  const normalized = normalizeComparisonText(latestUserMessage);
  return {
    create: /\b(add|create|make|new|remind)\b/.test(normalized),
    update: /\b(update|change|edit|rename|mark|set)\b/.test(normalized),
    archive: /\b(archive|delete|remove)\b/.test(normalized),
    query: /\b(find|list|show|query|search)\b/.test(normalized),
  };
}

function isSuspiciousPhiTaskToolCall({ toolCall, latestUserMessage = '' }) {
  if (toolCall?.tool !== 'todo-manager') {
    return false;
  }

  const operations = Array.isArray(toolCall.input?.operations) ? toolCall.input.operations : [];
  if (!operations.length) {
    return false;
  }

  const intentFlags = detectTaskIntentFlags(latestUserMessage);
  const createOperations = operations.filter((operation) => String(operation?.action || '').trim() === 'create_task');

  for (const operation of operations) {
    const action = String(operation?.action || '').trim();
    if (action === 'update_tasks' && !intentFlags.update) {
      return true;
    }
    if (action === 'archive_tasks' && !intentFlags.archive) {
      return true;
    }
    if (action === 'query_tasks' && !intentFlags.query) {
      return true;
    }
  }

  for (const operation of createOperations) {
    const title = String(operation?.title || '').trim();
    const dueDateText = String(operation?.dueDateText || '').trim();

    if (title && !hasMeaningfulTokenOverlap(title, latestUserMessage)) {
      return true;
    }

    if (dueDateText) {
      const normalizedDueDate = normalizeComparisonText(dueDateText);
      const normalizedLatestUserMessage = normalizeComparisonText(latestUserMessage);
      const compactDueDate = compactComparisonText(dueDateText);
      const compactLatestUserMessage = compactComparisonText(latestUserMessage);
      if (
        normalizedDueDate
        && !normalizedLatestUserMessage.includes(normalizedDueDate)
        && !compactLatestUserMessage.includes(compactDueDate)
      ) {
        return true;
      }
    }
  }

  return false;
}

// In the generic first-pass flow, the model may claim a task side effect in
// plain English instead of emitting a tool call. This tells the orchestrator
// when to issue a repair prompt and force the proper todo-manager JSON output.
function shouldRetryForMissingTaskToolCall({ adapterKey, tools = [], latestUserMessage = '', responseText = '' }) {
  if (adapterKey !== 'default') {
    return false;
  }

  const hasTodoManager = tools.some((tool) => tool.toolKey === 'todo-manager' && tool.enabled);
  if (!hasTodoManager) {
    return false;
  }

  const latest = String(latestUserMessage || '').toLowerCase();
  const response = String(responseText || '').toLowerCase();
  const looksLikeTaskRequest = /\b(task|tasks|todo|todos|reminder|reminders)\b/.test(latest)
    || /\b(add|create|make|mark|update|archive|delete|list|show|find|query|remind)\b/.test(latest);
  const looksLikeSyntheticTaskResult = /^(created|updated|archived|found|listed)\s+task\b/.test(response)
    || /^(created|updated|archived|found)\s+\d+\s+task/.test(response)
    || /\btask\s+[a-z0-9]{6,}\b/.test(response);

  return looksLikeTaskRequest && looksLikeSyntheticTaskResult;
}

function isLikelyTaskActionRequest({ tools = [], latestUserMessage = '' }) {
  const hasTodoManager = tools.some((tool) => tool.toolKey === 'todo-manager' && tool.enabled);
  if (!hasTodoManager) {
    return false;
  }

  const latest = String(latestUserMessage || '').toLowerCase();
  return /\b(task|tasks|todo|todos|reminder|reminders)\b/.test(latest)
    || /\b(add|create|make|mark|update|archive|delete|list|show|find|query|remind)\b/.test(latest);
}

function looksLikeTaskPlannerFollowupQuestion(text = '') {
  const normalized = String(text || '').trim().toLowerCase();
  if (!normalized || !normalized.includes('?')) {
    return false;
  }

  return [
    /\bwhat would you like me to remind you about\b/,
    /\bwhat would you like the reminder to be about\b/,
    /\bwhat date or timing phrase\b/,
    /\bwhat time or day would you like\b/,
    /\bwhat time or date would you like\b/,
    /\bwhen would you like\b/,
    /\bwhat .* due date\b/,
    /\bwhich task\b/,
    /\bwhich reminder\b/,
    /\bwhat status\b/,
    /\bwhat title\b/,
    /\bwhat details\b/,
    /\bmissing due dates\b/,
  ].some((pattern) => pattern.test(normalized));
}

function isLikelyTaskFollowup({ tools = [], chatMessages = [] }) {
  const hasTodoManager = tools.some((tool) => tool.toolKey === 'todo-manager' && tool.enabled);
  if (!hasTodoManager || chatMessages.length < 3) {
    return false;
  }

  const latestUser = chatMessages[chatMessages.length - 1];
  const previousAssistant = chatMessages[chatMessages.length - 2];
  const priorUser = chatMessages[chatMessages.length - 3];

  if (latestUser?.role !== 'user' || previousAssistant?.role !== 'assistant' || priorUser?.role !== 'user') {
    return false;
  }

  if (!looksLikeTaskPlannerFollowupQuestion(previousAssistant.text)) {
    return false;
  }

  return isLikelyTaskActionRequest({
    tools,
    latestUserMessage: priorUser.text || '',
  });
}

module.exports = {
  compactComparisonText,
  detectTaskIntentFlags,
  getSignificantTokens,
  hasMeaningfulTokenOverlap,
  isLikelyTaskActionRequest,
  isLikelyTaskFollowup,
  isSuspiciousPhiTaskToolCall,
  looksLikeTaskPlannerFollowupQuestion,
  normalizeComparisonText,
  shouldRetryForMissingTaskToolCall,
};
