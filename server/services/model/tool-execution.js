// Generic tool execution runtime shared by planner flows and the default flow.
// This module is intentionally boring: resolve the executable service, enforce
// enabled/autonomous/policy rules, execute the tool, and normalize the outcome.
const { getToolService } = require('../tools');
const { buildConfirmationRequiredResponse } = require('./tool-confirmation');

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

async function executeToolCall({ toolCall, tools = [], latestUserMessage = '', toolContext = {}, logToolDebug = () => {} }) {
  logToolDebug('tool-call-received', {
    toolCall,
    latestUserMessage,
  });

  const tool = tools.find((item) => item.toolKey === toolCall.tool);
  if (!tool) {
    throw new Error(`Tool "${toolCall.tool}" is not enabled.`);
  }

  if (!tool.autonomous) {
    const confirmationError = new Error(`Tool "${toolCall.tool}" requires confirmation before execution.`);
    confirmationError.code = 'TOOL_CONFIRMATION_REQUIRED';
    confirmationError.tool = tool;
    confirmationError.toolCall = toolCall;
    throw confirmationError;
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

async function tryDirectToolExecution({ tools = [], latestUserMessage = '', toolContext = {}, adapterKey = 'default', logToolDebug = () => {} }) {
  for (const tool of tools.filter((item) => item?.enabled)) {
    const service = getToolService(tool.serviceKey || tool.toolKey);
    if (!service?.shouldDirectHandle || !service.shouldDirectHandle({
      latestUserMessage,
      context: toolContext,
      tool,
    })) {
      continue;
    }

    let execution;

    try {
      execution = await executeToolCall({
        toolCall: {
          type: 'tool_call',
          tool: tool.toolKey,
          input: {},
        },
        tools,
        latestUserMessage,
        toolContext,
        logToolDebug,
      });
    } catch (error) {
      if (error?.code === 'TOOL_CONFIRMATION_REQUIRED') {
        return buildConfirmationRequiredResponse({
          tool: error.tool || tool,
          toolCall: error.toolCall || {
            type: 'tool_call',
            tool: tool.toolKey,
            input: {},
          },
          adapterKey,
          renderedBy: 'tool-service-direct',
          logToolDebug,
        });
      }

      throw error;
    }

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

module.exports = {
  executeToolCall,
  getEnabledPromptTools,
  tryDirectToolExecution,
};
