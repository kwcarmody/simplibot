function getToolDisplayName(tool = {}, toolCall = {}) {
  return String(tool.title || tool.name || tool.toolKey || toolCall.tool || 'This tool').trim();
}

function buildConfirmationRequiredText({ tool = {}, toolCall = {} }) {
  const displayName = getToolDisplayName(tool, toolCall);

  if (tool.toolKey === 'web-search') {
    const query = String(toolCall?.input?.query || '').trim();
    if (query) {
      return `I’m ready to use ${displayName}, but it requires confirmation before I run it. Confirm and I’ll search for "${query}".`;
    }
  }

  return `I’m ready to use ${displayName}, but it requires confirmation before I run it.`;
}

function buildConfirmationRequiredResponse({ tool = {}, toolCall = {}, adapterKey = 'default', renderedBy = 'tool-service', logToolDebug = () => {} }) {
  const text = buildConfirmationRequiredText({ tool, toolCall });
  logToolDebug('tool-confirmation-required-response', {
    toolKey: tool.toolKey || toolCall.tool,
    text,
    renderedBy,
  });

  return {
    text,
    toolStatePatch: null,
    debug: {
      toolAttempted: true,
      toolExecuted: false,
      confirmationRequired: true,
      toolKey: tool.toolKey || toolCall.tool,
      adapter: adapterKey,
      renderedBy,
    },
  };
}

module.exports = {
  buildConfirmationRequiredResponse,
  buildConfirmationRequiredText,
  getToolDisplayName,
};
