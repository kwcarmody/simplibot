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
  const payload = {
    model: modelSettings.model,
    stream: false,
    messages,
  };

  if (resolveModelAdapterKey(modelSettings) === 'default' && modelSettings.thinking) {
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

  const content = data?.message?.content || data?.choices?.[0]?.message?.content || '';
  if (!content) {
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

  if (parsedResponse.type !== 'tool_call') {
    return {
      text: parsedResponse.text,
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
      toolCall: parsedResponse,
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
        deniedTool: parsedResponse.tool,
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
