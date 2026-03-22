const { getModelAdapter } = require('./model-adapters');
const { getModelDefinition } = require('./model-registry');
const { getToolService } = require('./tools');

const TOOL_DEBUG_ENABLED = String(process.env.PIKORI_TOOL_DEBUG || '').trim() === '1';
const MODEL_REQUEST_TIMEOUT_MS = Number.parseInt(process.env.PIKORI_MODEL_TIMEOUT_MS || '45000', 10);

function logToolDebug(event, payload = {}) {
  if (!TOOL_DEBUG_ENABLED) {
    return;
  }

  try {
    console.log(`[pikori-tool-debug] ${event}`, JSON.stringify(payload, null, 2));
  } catch (_error) {
    console.log(`[pikori-tool-debug] ${event}`, payload);
  }
}

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

function resolveModelAdapterKey(modelSettings = {}) {
  if (modelSettings?.adapterKey) {
    return modelSettings.adapterKey;
  }

  const modelDefinition = getModelDefinition(modelSettings.model);
  return modelDefinition?.adapterKey || 'default';
}

async function requestChatCompletion({ modelSettings, messages }) {
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
      messageKeys: data?.choices?.[0]?.message && typeof data.choices[0].message === 'object'
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

function flattenContentValue(value) {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (item && typeof item === 'object') {
          return item.text || item.content || item.value || '';
        }

        return '';
      })
      .join('')
      .trim();
  }

  if (value && typeof value === 'object') {
    return String(value.text || value.content || value.value || '').trim();
  }

  return '';
}

function extractAssistantContent(data, adapterKey = 'default') {
  const standardContent = flattenContentValue(data?.message?.content)
    || flattenContentValue(data?.choices?.[0]?.message?.content);
  if (standardContent) {
    return standardContent;
  }

  if (adapterKey !== 'phi4-mini') {
    return '';
  }

  return flattenContentValue(data?.choices?.[0]?.text)
    || flattenContentValue(data?.response)
    || flattenContentValue(data?.content)
    || flattenContentValue(data?.output_text)
    || flattenContentValue(data?.output?.[0]?.content);
}

function getEnabledPromptTools(tools = []) {
  return tools
    .filter((tool) => tool?.enabled)
    .map((tool) => {
      const service = getToolService(tool.serviceKey || tool.toolKey);
      if (!service?.getPromptDefinition) {
        return null;
      }

      return {
        ...tool,
        promptDefinition: service.getPromptDefinition({ tool }),
      };
    })
    .filter(Boolean);
}

async function tryDirectToolExecution({ tools = [], latestUserMessage = '', toolContext = {}, adapterKey = 'default' }) {
  for (const tool of tools.filter((item) => item?.enabled)) {
    const service = getToolService(tool.serviceKey || tool.toolKey);
    if (!service?.shouldDirectHandle || !service.shouldDirectHandle({
      latestUserMessage,
      context: toolContext,
      tool,
    })) {
      continue;
    }

    const execution = await executeToolCall({
      toolCall: {
        type: 'tool_call',
        tool: tool.toolKey,
        input: {},
      },
      tools,
      latestUserMessage,
      toolContext,
    });

    const renderedText = execution.service?.formatResultForAssistant
      ? execution.service.formatResultForAssistant({
          result: execution.result,
          latestUserMessage,
        })
      : String(execution.result?.message || '').trim();

    logToolDebug('tool-service-rendered-response', {
      toolKey: execution.tool.toolKey,
      text: renderedText,
      direct: true,
    });

    return {
      text: renderedText,
      toolStatePatch: execution.result?.sessionStatePatch ?? null,
      debug: {
        toolAttempted: true,
        toolExecuted: true,
        toolKey: execution.tool.toolKey,
        adapter: adapterKey,
        renderedBy: 'tool-service-direct',
      },
    };
  }

  return null;
}

async function executeToolCall({ toolCall, tools = [], latestUserMessage = '', toolContext = {} }) {
  logToolDebug('tool-call-received', {
    toolCall,
    latestUserMessage,
  });

  const tool = tools.find((item) => item.toolKey === toolCall.tool);
  if (!tool) {
    throw new Error(`Tool "${toolCall.tool}" is not enabled.`);
  }

  if (!tool.autonomous) {
    throw new Error(`Tool "${toolCall.tool}" requires confirmation before execution.`);
  }

  const service = getToolService(tool.serviceKey || tool.toolKey);
  if (!service?.execute) {
    throw new Error(`Tool "${tool.toolKey}" cannot be executed yet.`);
  }

  if (service.shouldAutoExecute && !service.shouldAutoExecute({
    latestUserMessage,
    input: toolCall.input || {},
    tool,
    context: toolContext,
  })) {
    logToolDebug('tool-call-denied', {
      toolKey: tool.toolKey,
      reason: 'policy',
      latestUserMessage,
      input: toolCall.input || {},
    });
    const denialError = new Error(`Tool "${tool.toolKey}" was denied by execution policy.`);
    denialError.code = 'TOOL_EXECUTION_DENIED';
    throw denialError;
  }

  logToolDebug('tool-call-executing', {
    toolKey: tool.toolKey,
    input: toolCall.input || {},
    latestUserMessage,
  });

  const result = await service.execute({
    input: toolCall.input || {},
    config: tool.config || {},
    context: toolContext,
    latestUserMessage,
  });

  logToolDebug('tool-call-result', {
    toolKey: tool.toolKey,
    result,
  });

  return {
    tool,
    result,
    service,
  };
}

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

function buildToolResultFollowupPrompt(toolKey) {
  if (toolKey === 'web-search') {
    return [
      'Use the grounded evidence above to answer the original user request.',
      'Answer only from the grounded_facts data.',
      'Do not use any raw search result text outside grounded_facts.',
      'Do not invent events, dates, venues, names, or sources that are not explicitly present in grounded_facts.',
      'Only state an event or fact if a grounded_facts item clearly supports it.',
      'If grounded_facts is empty or weak, say you could not confidently confirm the answer from the search results.',
      'Keep the answer factual, restrained, and concise.',
      'When presenting multiple grounded items, format the answer as a short intro followed by a bullet list with one item per line.',
      'Each bullet must be directly grounded in one grounded_facts item and should include only the title plus a short supporting detail from its evidence field.',
      'When possible, include the source hostname or URL inline for each bullet.',
      'Do not summarize from general world knowledge; stay grounded in the provided evidence object.',
      'If the evidence is insufficient, say so plainly and end with one concise follow-up suggestion or clarifying question.',
      'Do not claim certainty when the retrieved evidence is incomplete.',
      'Do not emit a tool call.',
    ].join(' ');
  }

  return 'Use the tool result above to answer my last request. Do not emit a tool call.';
}

function getPromptToolDefinition(tools = [], toolKey) {
  return getEnabledPromptTools(tools).find((tool) => tool.toolKey === toolKey)?.promptDefinition || null;
}

function getTodoManagerPromptDefinition(tools = []) {
  return getPromptToolDefinition(tools, 'todo-manager');
}

function getWebSearchPromptDefinition(tools = []) {
  return getPromptToolDefinition(tools, 'web-search');
}

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

function isLikelyWebSearchRequest({ tools = [], latestUserMessage = '' }) {
  const hasWebSearch = tools.some((tool) => tool.toolKey === 'web-search' && tool.enabled);
  if (!hasWebSearch) {
    return false;
  }

  const webSearchService = getToolService('web-search');
  if (!webSearchService?.shouldAutoExecute) {
    return false;
  }

  return webSearchService.shouldAutoExecute({
    latestUserMessage,
    input: {
      query: latestUserMessage,
    },
  });
}

function buildTaskPlannerMessages({ memorySettings, latestUserMessage, todoToolDefinition, chatMessages = [], now = new Date() }) {
  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York',
  }).format(now);
  const currentTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone: 'America/New_York',
  }).format(now);
  const inputs = Array.isArray(todoToolDefinition?.inputs)
    ? todoToolDefinition.inputs.map((input) => `${input.key}${input.required ? ' (required)' : ''}: ${input.description}`).join('; ')
    : '';
  const recentConversation = chatMessages
    .slice(-6)
    .map((message) => `${message.role}: ${String(message.text || '').trim()}`)
    .filter(Boolean)
    .join('\n');

  return [
    {
      role: 'system',
      content: [
        `Your name is ${memorySettings.botName}.`,
        `You are ${memorySettings.botDescription}`,
        `Today's date is ${today}.`,
        `The current time is ${currentTime}.`,
        'You are in a dedicated task-planning pass.',
        'Your job is only to decide the correct todo-manager response for the user request.',
        'If the request requires task creation, task update, task archive, or task query, respond with only one valid JSON tool call and no surrounding text.',
        'Use this exact outer shape:',
        '{"type":"tool_call","tool":"todo-manager","input":{"operations":[...]}}',
        'If required information is missing, ask one concise follow-up question instead of pretending a task was created or updated.',
        'If the recent conversation already answered your earlier follow-up question, use that answer and continue instead of asking again.',
        'If you asked for a due date and the user replies with "no due date", "no due date needed", "without a due date", or similar, create the task without dueDateText.',
        'If the user has not told you what the reminder or task is about, ask a follow-up question. Do not invent a placeholder title, filler details, or dummy dueDateText.',
        'Never fabricate text such as "Remind me about...", "Please specify...", or placeholder content in title or details fields.',
        'Never claim that a task was created, updated, archived, or queried unless you return a tool call and the tool is executed later.',
        'Preserve the user timing phrase in dueDateText when possible instead of inventing absolute dates unless the phrase is already explicit.',
        `todo-manager description: ${todoToolDefinition?.description || ''}`,
        inputs ? `todo-manager inputs: ${inputs}` : '',
        recentConversation ? `Recent conversation:\n${recentConversation}` : '',
      ].filter(Boolean).join(' '),
    },
    {
      role: 'user',
      content: latestUserMessage,
    },
  ];
}

async function planTodoManagerToolCall({ modelSettings, memorySettings, latestUserMessage, todoToolDefinition, chatMessages = [], adapter, now }) {
  const plannerMessages = buildTaskPlannerMessages({
    memorySettings,
    latestUserMessage,
    todoToolDefinition,
    chatMessages,
    now,
  });
  logToolDebug('task-planner-request', {
    model: modelSettings.model,
    latestUserMessage,
    messageCount: plannerMessages.length,
  });
  const plannerResponse = await requestChatCompletion({
    modelSettings,
    messages: plannerMessages,
  });
  const parsedPlannerResponse = adapter.parseAssistantResponse(plannerResponse);
  logToolDebug('task-planner-response', {
    response: plannerResponse,
    parsedResponse: parsedPlannerResponse,
  });
  return parsedPlannerResponse;
}

function buildSearchPlannerMessages({ memorySettings, latestUserMessage, webSearchToolDefinition, now = new Date() }) {
  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York',
  }).format(now);
  const currentTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone: 'America/New_York',
  }).format(now);
  const inputs = Array.isArray(webSearchToolDefinition?.inputs)
    ? webSearchToolDefinition.inputs.map((input) => `${input.key}${input.required ? ' (required)' : ''}: ${input.description}`).join('; ')
    : '';

  return [
    {
      role: 'system',
      content: [
        `Your name is ${memorySettings.botName}.`,
        `You are ${memorySettings.botDescription}`,
        `Today's date is ${today}.`,
        `The current time is ${currentTime}.`,
        'You are in a dedicated search-planning pass.',
        'Your job is only to decide the correct web-search response for the user request.',
        'If the request needs current, recent, factual, lookup, or web-grounded information, respond with only one valid JSON tool call and no surrounding text.',
        'Use this exact outer shape:',
        '{"type":"tool_call","tool":"web-search","input":{"query":"..."}}',
        'Rewrite the user request into a concise search query when helpful, but preserve the user intent and key constraints.',
        'For requests about people, organizations, events, touring, schedules, availability, current status, or anything the web could verify, use web-search instead of answering from memory.',
        'If web search is not needed, answer the user directly in one concise sentence and do not emit a tool call.',
        'Never claim that you searched the web, found results, confirmed facts, or checked sources unless you return a tool call and the tool is executed later.',
        `web-search description: ${webSearchToolDefinition?.description || ''}`,
        inputs ? `web-search inputs: ${inputs}` : '',
      ].filter(Boolean).join(' '),
    },
    {
      role: 'user',
      content: latestUserMessage,
    },
  ];
}

async function planWebSearchToolCall({ modelSettings, memorySettings, latestUserMessage, webSearchToolDefinition, adapter, now }) {
  const plannerMessages = buildSearchPlannerMessages({
    memorySettings,
    latestUserMessage,
    webSearchToolDefinition,
    now,
  });
  logToolDebug('search-planner-request', {
    model: modelSettings.model,
    latestUserMessage,
    messageCount: plannerMessages.length,
  });
  const plannerResponse = await requestChatCompletion({
    modelSettings,
    messages: plannerMessages,
  });
  const parsedPlannerResponse = adapter.parseAssistantResponse(plannerResponse);
  logToolDebug('search-planner-response', {
    response: plannerResponse,
    parsedResponse: parsedPlannerResponse,
  });
  return parsedPlannerResponse;
}

async function repairWebSearchToolCall({ modelSettings, latestUserMessage, adapter, plannerResponse }) {
  const retryMessages = [
    {
      role: 'system',
      content: [
        'The previous assistant response was invalid because this request requires grounded web search and you answered without a tool call.',
        'You must now repair the response.',
        'Respond with only one valid JSON tool call and no surrounding text.',
        'Use the web-search tool.',
        'Use this exact outer shape:',
        '{"type":"tool_call","tool":"web-search","input":{"query":"..."}}',
        'Do not answer the question directly.',
        'Do not claim you searched, found results, or confirmed facts.',
        'Do not wrap the JSON in markdown.',
        'Do not output any text before or after the JSON.',
      ].join(' '),
    },
    {
      role: 'assistant',
      content: String(plannerResponse || '').trim(),
    },
    {
      role: 'user',
      content: latestUserMessage,
    },
  ];

  const retryResponse = await requestChatCompletion({
    modelSettings,
    messages: retryMessages,
  });
  const parsedRetryResponse = adapter.parseAssistantResponse(retryResponse);
  logToolDebug('search-planner-retry', {
    originalResponse: plannerResponse,
    retryResponse,
    parsedResponse: parsedRetryResponse,
  });
  return parsedRetryResponse;
}

function buildSearchSynthesisMessages({
  memorySettings,
  latestUserMessage,
  groundedResult,
  now = new Date(),
}) {
  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York',
  }).format(now);

  return [
    {
      role: 'system',
      content: [
        `Your name is ${memorySettings.botName}.`,
        `You are ${memorySettings.botDescription}`,
        `Today's date is ${today}.`,
        'You are in a dedicated search-synthesis pass.',
        'Your job is to answer the user using only the grounded search evidence provided below.',
        'Do not invent facts, dates, names, prices, schedules, events, or sources.',
        'Do not use outside knowledge.',
        'If the grounded evidence is insufficient, say so plainly and ask one concise follow-up or suggest a narrower query.',
        'When there are multiple grounded results, prefer a short intro followed by a flat bullet list.',
        'Include source hostname or URL inline when useful.',
        'Do not emit a tool call.',
      ].join(' '),
    },
    {
      role: 'system',
      content: `Original user request: ${latestUserMessage}`,
    },
    {
      role: 'system',
      content: `Grounded web search result: ${JSON.stringify(groundedResult)}`,
    },
    {
      role: 'user',
      content: buildToolResultFollowupPrompt('web-search'),
    },
  ];
}

async function synthesizeWebSearchResult({
  modelSettings,
  memorySettings,
  latestUserMessage,
  execution,
  now,
}) {
  const groundedResult = execution.service?.buildGroundedResult
    ? execution.service.buildGroundedResult({
        result: execution.result,
        latestUserMessage,
      })
    : execution.result;
  const synthesisMessages = buildSearchSynthesisMessages({
    memorySettings,
    latestUserMessage,
    groundedResult,
    now,
  });
  try {
    const finalText = await requestChatCompletion({
      modelSettings,
      messages: synthesisMessages,
    });

    logToolDebug('search-synthesis-response', {
      toolKey: execution.tool.toolKey,
      text: finalText,
      groundedResult,
    });

    return {
      text: finalText,
      toolStatePatch: execution.result?.sessionStatePatch ?? null,
      debug: {
        toolAttempted: true,
        toolExecuted: true,
        toolKey: execution.tool.toolKey,
        renderedBy: 'search-synthesis',
      },
    };
  } catch (error) {
    const fallbackText = execution.service?.formatResultForAssistant
      ? execution.service.formatResultForAssistant({
          result: execution.result,
          latestUserMessage,
        })
      : String(execution.result?.message || '').trim();

    logToolDebug('search-synthesis-fallback', {
      toolKey: execution.tool.toolKey,
      error: error?.message || String(error),
      text: fallbackText,
      groundedResult,
    });

    return {
      text: fallbackText,
      toolStatePatch: execution.result?.sessionStatePatch ?? null,
      debug: {
        toolAttempted: true,
        toolExecuted: true,
        toolKey: execution.tool.toolKey,
        renderedBy: 'search-synthesis-fallback',
        fallbackReason: error?.code || 'search_synthesis_failed',
      },
    };
  }
}

async function generateChatReply({
  modelSettings,
  memorySettings,
  chatMessages,
  tools = [],
  conversationContext = {},
  toolContext = {},
}) {
  const adapterKey = resolveModelAdapterKey(modelSettings);
  const adapter = getModelAdapter(adapterKey);
  const promptTools = getEnabledPromptTools(tools).map((tool) => tool.promptDefinition);
  const now = new Date();

  const latestUserMessage = [...chatMessages].reverse().find((message) => message.role === 'user')?.text || '';
  const directExecutionResult = await tryDirectToolExecution({
    tools,
    latestUserMessage,
    toolContext,
    adapterKey,
  });
  if (directExecutionResult) {
    return directExecutionResult;
  }

  if (isLikelyTaskActionRequest({ tools, latestUserMessage }) || isLikelyTaskFollowup({ tools, chatMessages })) {
    const todoToolDefinition = getTodoManagerPromptDefinition(tools);
    if (todoToolDefinition) {
      const plannedResponse = await planTodoManagerToolCall({
        modelSettings,
        memorySettings,
        latestUserMessage,
        todoToolDefinition,
        chatMessages,
        adapter,
        now,
      });

      if (plannedResponse.type === 'tool_call') {
        if (adapterKey === 'phi4-mini' && isSuspiciousPhiTaskToolCall({
          toolCall: plannedResponse,
          latestUserMessage,
        })) {
          logToolDebug('phi4-task-tool-call-rejected', {
            latestUserMessage,
            toolCall: plannedResponse,
          });
          return {
            text: 'I could not safely apply that task request because the model generated task details that did not match your latest message. Please try again.',
            toolStatePatch: null,
            debug: {
              toolAttempted: true,
              toolExecuted: false,
              adapter: adapterKey,
              renderedBy: 'task-planner',
              reason: 'phi4_suspicious_task_tool_call',
            },
          };
        }

        let plannedExecution;

        try {
          plannedExecution = await executeToolCall({
            toolCall: plannedResponse,
            tools,
            latestUserMessage,
            toolContext,
          });
        } catch (error) {
          if (error?.code !== 'TOOL_EXECUTION_DENIED') {
            throw error;
          }

          return {
            text: 'I couldn’t use that tool for this request. Please rephrase or ask a little more specifically.',
            toolStatePatch: null,
            debug: {
              toolAttempted: true,
              toolExecuted: false,
              deniedTool: plannedResponse.tool,
              adapter: adapterKey,
              renderedBy: 'task-planner',
            },
          };
        }

        const renderedText = plannedExecution.service?.formatResultForAssistant
          ? plannedExecution.service.formatResultForAssistant({
              result: plannedExecution.result,
              latestUserMessage,
            })
          : String(plannedExecution.result?.message || '').trim();

        logToolDebug('task-planner-rendered-response', {
          toolKey: plannedExecution.tool.toolKey,
          text: renderedText,
        });

        return {
          text: renderedText,
          toolStatePatch: plannedExecution.result?.sessionStatePatch ?? null,
          debug: {
            toolAttempted: true,
            toolExecuted: true,
            toolKey: plannedExecution.tool.toolKey,
            adapter: adapterKey,
            renderedBy: 'task-planner',
          },
        };
      }

      return {
        text: plannedResponse.text,
        debug: {
          toolAttempted: false,
          toolExecuted: false,
          adapter: adapterKey,
          renderedBy: 'task-planner',
        },
      };
    }
  }

  if (isLikelyWebSearchRequest({ tools, latestUserMessage })) {
    const webSearchToolDefinition = getWebSearchPromptDefinition(tools);
    if (webSearchToolDefinition) {
      const plannedResponse = await planWebSearchToolCall({
        modelSettings,
        memorySettings,
        latestUserMessage,
        webSearchToolDefinition,
        adapter,
        now,
      });

      const effectivePlannedResponse = plannedResponse.type === 'tool_call'
        ? plannedResponse
        : await repairWebSearchToolCall({
            modelSettings,
            latestUserMessage,
            adapter,
            plannerResponse: plannedResponse.text,
          });

      if (effectivePlannedResponse.type === 'tool_call') {
        let plannedExecution;

        try {
          plannedExecution = await executeToolCall({
            toolCall: effectivePlannedResponse,
            tools,
            latestUserMessage,
            toolContext,
          });
        } catch (error) {
          if (error?.code !== 'TOOL_EXECUTION_DENIED') {
            throw error;
          }

          return {
            text: 'I couldn’t use that tool for this request. Please rephrase or ask a little more specifically.',
            toolStatePatch: null,
            debug: {
              toolAttempted: true,
              toolExecuted: false,
              deniedTool: effectivePlannedResponse.tool,
              adapter: adapterKey,
              renderedBy: 'search-planner',
            },
          };
        }

        if (plannedExecution.tool.toolKey === 'web-search') {
          const synthesized = await synthesizeWebSearchResult({
            modelSettings,
            memorySettings,
            latestUserMessage,
            execution: plannedExecution,
            now,
          });

          return {
            ...synthesized,
            debug: {
              ...synthesized.debug,
              adapter: adapterKey,
              plannedBy: 'search-planner',
            },
          };
        }

        const renderedText = plannedExecution.service?.formatResultForAssistant
          ? plannedExecution.service.formatResultForAssistant({
              result: plannedExecution.result,
              latestUserMessage,
            })
          : String(plannedExecution.result?.message || '').trim();

        logToolDebug('search-planner-rendered-response', {
          toolKey: plannedExecution.tool.toolKey,
          text: renderedText,
        });

        return {
          text: renderedText,
          toolStatePatch: plannedExecution.result?.sessionStatePatch ?? null,
          debug: {
            toolAttempted: true,
            toolExecuted: true,
            toolKey: plannedExecution.tool.toolKey,
            adapter: adapterKey,
            renderedBy: 'search-planner',
          },
        };
      }

      return {
        text: 'I couldn’t complete that web search request because the model did not produce a valid search tool call. Please try again.',
        debug: {
          toolAttempted: true,
          toolExecuted: false,
          adapter: adapterKey,
          renderedBy: 'search-planner',
          reason: 'missing_valid_search_tool_call',
        },
      };
    }
  }

  const firstPassMessages = adapter.buildMessages({
    memorySettings,
    chatMessages,
    tools: promptTools,
    conversationContext,
    now,
  });
  logToolDebug('first-pass-request', {
    model: modelSettings.model,
    adapter: adapterKey,
    latestUserMessage,
    enabledTools: promptTools.map((tool) => tool.toolKey),
    messageCount: firstPassMessages.length,
  });
  const firstPassResponse = await requestChatCompletion({
    modelSettings,
    messages: firstPassMessages,
  });
  const parsedResponse = adapter.parseAssistantResponse(firstPassResponse);
  logToolDebug('first-pass-parsed', {
    parsedResponse,
  });

  let effectiveParsedResponse = parsedResponse;

  if (effectiveParsedResponse.type !== 'tool_call' && shouldRetryForMissingTaskToolCall({
    adapterKey,
    tools,
    latestUserMessage,
    responseText: firstPassResponse,
  })) {
    const retryMessages = [
      ...firstPassMessages,
      {
        role: 'system',
        content: [
          'The previous assistant response was invalid because it claimed a task-side effect without a tool call.',
          'You must now repair the response.',
          'If the user request needs task creation, task update, task archive, or task query, respond with only one valid JSON tool call and no surrounding text.',
          'Use the todo-manager tool.',
          'Use this exact outer shape:',
          '{"type":"tool_call","tool":"todo-manager","input":{"operations":[...]}}',
          'Interpret weekday-only due dates like Monday or Tuesday as the next upcoming occurrence of that weekday unless the user explicitly says otherwise.',
          'Preserve the user timing phrase in dueDateText when possible, such as "Wed at 4 pm", "this coming Friday at 1 pm", or "in 2 months".',
          'Ordinal date phrases like "April 30th" or "October 1st" are valid and should be preserved in dueDateText.',
          'Do not acknowledge, apologize, explain, or describe what you will do.',
          'Do not wrap the JSON in markdown.',
          'Do not output any text before or after the JSON.',
        ].join(' '),
      },
    ];
    const retryResponse = await requestChatCompletion({
      modelSettings,
      messages: retryMessages,
    });
    effectiveParsedResponse = adapter.parseAssistantResponse(retryResponse);
    logToolDebug('missing-task-tool-call-retry', {
      originalResponse: firstPassResponse,
      retryResponse,
      parsedResponse: effectiveParsedResponse,
    });
  }

  if (effectiveParsedResponse.type !== 'tool_call' && isLikelyTaskActionRequest({
    tools,
    latestUserMessage,
  })) {
    return {
      text: 'I couldn’t complete that task request because the model did not produce a valid tool call. Please try again.',
      debug: {
        toolAttempted: true,
        toolExecuted: false,
        adapter: adapterKey,
        reason: 'missing_valid_task_tool_call',
      },
    };
  }

  if (effectiveParsedResponse.type !== 'tool_call') {
    return {
      text: effectiveParsedResponse.text,
      debug: {
        toolAttempted: false,
        toolExecuted: false,
        adapter: adapterKey,
      },
    };
  }

  let execution;

  try {
    execution = await executeToolCall({
      toolCall: effectiveParsedResponse,
      tools,
      latestUserMessage,
      toolContext,
    });
  } catch (error) {
    if (error?.code !== 'TOOL_EXECUTION_DENIED') {
      throw error;
    }
    const deniedText = 'I couldn’t use that tool for this request. Please rephrase or ask a little more specifically.';
    logToolDebug('tool-denial-fallback-response', {
      text: deniedText,
      direct: true,
    });

    return {
      text: deniedText,
      toolStatePatch: null,
      debug: {
        toolAttempted: true,
        toolExecuted: false,
        deniedTool: effectiveParsedResponse.tool,
        adapter: adapterKey,
      },
    };
  }

  const finalMessages = [
    ...firstPassMessages,
    {
      role: 'assistant',
      content: firstPassResponse,
    },
    {
      role: 'system',
      content: `Original user request: ${latestUserMessage}`,
    },
    {
      role: 'system',
      content: `Grounded tool result for ${execution.tool.toolKey}: ${JSON.stringify(
        execution.service?.buildGroundedResult
          ? execution.service.buildGroundedResult({
              result: execution.result,
              latestUserMessage,
            })
          : execution.result
      )}`,
    },
    {
      role: 'user',
      content: buildToolResultFollowupPrompt(execution.tool.toolKey),
    },
  ];

  if (execution.tool.toolKey === 'web-search') {
    const synthesized = await synthesizeWebSearchResult({
      modelSettings,
      memorySettings,
      latestUserMessage,
      execution,
      now,
    });

    return {
      ...synthesized,
      debug: {
        ...synthesized.debug,
        adapter: adapterKey,
      },
    };
  }

  if (execution.service?.formatResultForAssistant) {
    const renderedText = execution.service.formatResultForAssistant({
      result: execution.result,
      latestUserMessage,
    });
    logToolDebug('tool-service-rendered-response', {
      toolKey: execution.tool.toolKey,
      text: renderedText,
    });

    return {
      text: renderedText,
      toolStatePatch: execution.result?.sessionStatePatch ?? null,
      debug: {
        toolAttempted: true,
        toolExecuted: true,
        toolKey: execution.tool.toolKey,
        adapter: adapterKey,
        renderedBy: 'tool-service',
      },
    };
  }

  const finalText = await requestChatCompletion({
    modelSettings,
    messages: finalMessages,
  });
  logToolDebug('second-pass-final-response', {
    toolKey: execution.tool.toolKey,
    text: finalText,
  });

  return {
    text: finalText,
    toolStatePatch: execution.result?.sessionStatePatch ?? null,
    debug: {
      toolAttempted: true,
      toolExecuted: true,
      toolKey: execution.tool.toolKey,
      adapter: adapterKey,
    },
  };
}

module.exports = {
  buildModelHeaders,
  generateChatReply,
  requestChatCompletion,
  resolveChatEndpoint,
  testModelConnection,
};
