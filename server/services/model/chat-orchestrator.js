const { getModelAdapter } = require('../model-adapters');
const { resolveModelAdapterKey } = require('./adapters');
const { answerInternalSearchMetaQuestion, answerKnownStaticQuery, getWebSearchIntent } = require('./policies/search-policy');
const { planWebSearchToolCall, repairWebSearchToolCall } = require('./planners/search-planner');
const { planTodoManagerToolCall } = require('./planners/todo-planner');
const { synthesizeWebSearchResult } = require('./synthesis/search-synthesis');
const { buildConfirmationRequiredResponse } = require('./tool-confirmation');
const { executeToolCall, getEnabledPromptTools, tryDirectToolExecution } = require('./tool-execution');
const { getSignificantTokens, isLikelyTaskActionRequest, isLikelyTaskFollowup, isSuspiciousPhiTaskToolCall, normalizeComparisonText, shouldRetryForMissingTaskToolCall } = require('./policies/task-policy');

function getPromptToolDefinition(tools = [], toolKey) {
  return getEnabledPromptTools(tools).find((tool) => tool.toolKey === toolKey)?.promptDefinition || null;
}

function getTodoManagerPromptDefinition(tools = []) {
  return getPromptToolDefinition(tools, 'todo-manager');
}

function getWebSearchPromptDefinition(tools = []) {
  return getPromptToolDefinition(tools, 'web-search');
}

// Dedicated todo/task path.
// We only enter here when task-policy heuristics think the user is asking to
// create/update/query/archive todos, or when a recent assistant follow-up makes
// the latest user message look like a continuation of an earlier todo flow.
async function handleTaskFlow(context) {
  const {
    modelSettings,
    memorySettings,
    latestUserMessage,
    tools,
    toolContext,
    chatMessages,
    adapter,
    adapterKey,
    now,
    requestChatCompletion,
    logToolDebug,
  } = context;

  const todoToolDefinition = getTodoManagerPromptDefinition(tools);
  if (!todoToolDefinition) {
    return null;
  }

  const plannedResponse = await planTodoManagerToolCall({
    modelSettings,
    memorySettings,
    latestUserMessage,
    todoToolDefinition,
    chatMessages,
    adapter,
    now,
    requestChatCompletion,
    logToolDebug,
  });

  if (plannedResponse.type !== 'tool_call') {
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
      logToolDebug,
    });
  } catch (error) {
    if (error?.code === 'TOOL_CONFIRMATION_REQUIRED') {
      return buildConfirmationRequiredResponse({
        tool: error.tool || tools.find((item) => item.toolKey === plannedResponse.tool) || {},
        toolCall: error.toolCall || plannedResponse,
        adapterKey,
        renderedBy: 'task-planner',
        logToolDebug,
      });
    }

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

async function handleSearchFlow(context) {
  const {
    modelSettings,
    memorySettings,
    latestUserMessage,
    tools,
    toolContext,
    adapter,
    adapterKey,
    now,
    requestChatCompletion,
    logToolDebug,
  } = context;

  const webSearchIntent = getWebSearchIntent(latestUserMessage);
  const shouldUseQueryPlanner = tools.some((tool) => tool.toolKey === 'web-search' && tool.enabled)
    && Boolean(webSearchIntent?.shouldPlan);

  if (!shouldUseQueryPlanner) {
    return null;
  }

  if (webSearchIntent.mode === 'internal_meta') {
    const localMetaAnswer = answerInternalSearchMetaQuestion(latestUserMessage);
    if (localMetaAnswer) {
      return {
        text: localMetaAnswer,
        debug: {
          toolAttempted: false,
          toolExecuted: false,
          adapter: adapterKey,
          renderedBy: 'search-intent-local',
          searchIntent: webSearchIntent,
        },
      };
    }
  }

  if (webSearchIntent.mode === 'known_static') {
    const knownStaticResult = await answerKnownStaticQuery({
      modelSettings,
      memorySettings,
      latestUserMessage,
      now,
      requestChatCompletion,
      logToolDebug,
    });
    return {
      ...knownStaticResult,
      debug: {
        ...knownStaticResult.debug,
        adapter: adapterKey,
        searchIntent: webSearchIntent,
      },
    };
  }

  const webSearchToolDefinition = getWebSearchPromptDefinition(tools);
  if (!webSearchToolDefinition || !webSearchIntent.needsWebSearch) {
    return null;
  }

  const planningResult = await planWebSearchToolCall({
    modelSettings,
    memorySettings,
    latestUserMessage,
    webSearchToolDefinition,
    adapter,
    now,
    getWebSearchIntent,
    requestChatCompletion,
    logToolDebug,
  });
  const plannedResponse = planningResult.parsedResponse;
  const effectiveSearchIntent = planningResult.searchIntent || webSearchIntent;

  const effectivePlannedResponse = plannedResponse.type === 'tool_call'
    ? {
        ...plannedResponse,
        input: {
          ...(plannedResponse.input || {}),
          searchMode: effectiveSearchIntent.mode,
        },
      }
    : await repairWebSearchToolCall({
        modelSettings,
        latestUserMessage,
        adapter,
        plannerResponse: plannedResponse.text,
        searchIntent: effectiveSearchIntent,
        requestChatCompletion,
        logToolDebug,
      });

  if (effectivePlannedResponse.type !== 'tool_call') {
    return {
      text: 'I couldn’t complete that web search request because the model did not produce a valid search tool call. Please try again.',
      debug: {
        toolAttempted: true,
        toolExecuted: false,
        adapter: adapterKey,
        renderedBy: 'search-planner',
        reason: 'missing_valid_search_tool_call',
        searchIntent: effectiveSearchIntent,
      },
    };
  }

  effectivePlannedResponse.input = {
    ...(effectivePlannedResponse.input || {}),
    searchMode: effectiveSearchIntent.mode,
  };

  let plannedExecution;
  try {
    plannedExecution = await executeToolCall({
      toolCall: effectivePlannedResponse,
      tools,
      latestUserMessage,
      toolContext,
      logToolDebug,
    });
  } catch (error) {
    if (error?.code === 'TOOL_CONFIRMATION_REQUIRED') {
      return buildConfirmationRequiredResponse({
        tool: error.tool || tools.find((item) => item.toolKey === effectivePlannedResponse.tool) || {},
        toolCall: error.toolCall || effectivePlannedResponse,
        adapterKey,
        renderedBy: 'search-planner',
        logToolDebug,
      });
    }

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
        searchIntent: effectiveSearchIntent,
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
      requestChatCompletion,
      logToolDebug,
      normalizeComparisonText,
      getSignificantTokens,
    });

    return {
      ...synthesized,
      debug: {
        ...synthesized.debug,
        adapter: adapterKey,
        plannedBy: 'search-planner',
        searchIntent: effectiveSearchIntent,
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
      searchIntent: effectiveSearchIntent,
    },
  };
}

async function handleDefaultFlow(context) {
  const {
    modelSettings,
    memorySettings,
    chatMessages,
    tools,
    conversationContext,
    toolContext,
    latestUserMessage,
    adapter,
    adapterKey,
    now,
    requestChatCompletion,
    logToolDebug,
  } = context;

  const promptTools = getEnabledPromptTools(tools).map((tool) => tool.promptDefinition);
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
  logToolDebug('first-pass-parsed', { parsedResponse });

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
    const retryResponse = await requestChatCompletion({ modelSettings, messages: retryMessages });
    effectiveParsedResponse = adapter.parseAssistantResponse(retryResponse);
    logToolDebug('missing-task-tool-call-retry', {
      originalResponse: firstPassResponse,
      retryResponse,
      parsedResponse: effectiveParsedResponse,
    });
  }

  if (effectiveParsedResponse.type !== 'tool_call' && isLikelyTaskActionRequest({ tools, latestUserMessage })) {
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
      logToolDebug,
    });
  } catch (error) {
    if (error?.code === 'TOOL_CONFIRMATION_REQUIRED') {
      return buildConfirmationRequiredResponse({
        tool: error.tool || tools.find((item) => item.toolKey === effectiveParsedResponse.tool) || {},
        toolCall: error.toolCall || effectiveParsedResponse,
        adapterKey,
        logToolDebug,
      });
    }

    if (error?.code !== 'TOOL_EXECUTION_DENIED') {
      throw error;
    }
    const deniedText = 'I couldn’t use that tool for this request. Please rephrase or ask a little more specifically.';
    logToolDebug('tool-denial-fallback-response', { text: deniedText, direct: true });
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
    { role: 'assistant', content: firstPassResponse },
    { role: 'system', content: `Original user request: ${latestUserMessage}` },
    {
      role: 'system',
      content: `Grounded tool result for ${execution.tool.toolKey}: ${JSON.stringify(
        execution.service?.buildGroundedResult
          ? execution.service.buildGroundedResult({ result: execution.result, latestUserMessage })
          : execution.result
      )}`,
    },
    { role: 'user', content: 'Use the tool result above to answer my last request. Do not emit a tool call.' },
  ];

  if (execution.tool.toolKey === 'web-search') {
    const synthesized = await synthesizeWebSearchResult({
      modelSettings,
      memorySettings,
      latestUserMessage,
      execution,
      now,
      requestChatCompletion,
      logToolDebug,
      normalizeComparisonText,
      getSignificantTokens,
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
    const renderedText = execution.service.formatResultForAssistant({ result: execution.result, latestUserMessage });
    logToolDebug('tool-service-rendered-response', { toolKey: execution.tool.toolKey, text: renderedText });
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

  const finalText = await requestChatCompletion({ modelSettings, messages: finalMessages });
  logToolDebug('second-pass-final-response', { toolKey: execution.tool.toolKey, text: finalText });
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

async function generateChatReply({
  modelSettings,
  memorySettings,
  chatMessages,
  tools = [],
  conversationContext = {},
  toolContext = {},
  logToolDebug = () => {},
  requestChatCompletion,
}) {
  const adapterKey = resolveModelAdapterKey(modelSettings);
  const adapter = getModelAdapter(adapterKey);
  const now = new Date();
  const latestUserMessage = [...chatMessages].reverse().find((message) => message.role === 'user')?.text || '';

  const baseContext = {
    modelSettings,
    memorySettings,
    chatMessages,
    tools,
    conversationContext,
    toolContext,
    latestUserMessage,
    adapter,
    adapterKey,
    now,
    requestChatCompletion,
    logToolDebug,
  };

  const directExecutionResult = await tryDirectToolExecution({
    tools,
    latestUserMessage,
    toolContext,
    adapterKey,
    logToolDebug,
  });
  if (directExecutionResult) {
    return directExecutionResult;
  }

  if (isLikelyTaskActionRequest({ tools, latestUserMessage }) || isLikelyTaskFollowup({ tools, chatMessages })) {
    const taskResult = await handleTaskFlow(baseContext);
    if (taskResult) {
      return taskResult;
    }
  }

  const searchResult = await handleSearchFlow(baseContext);
  if (searchResult) {
    return searchResult;
  }

  return handleDefaultFlow(baseContext);
}

module.exports = {
  generateChatReply,
  getEnabledPromptTools,
  getPromptToolDefinition,
  getTodoManagerPromptDefinition,
  getWebSearchPromptDefinition,
  handleDefaultFlow,
  handleSearchFlow,
  handleTaskFlow,
};
