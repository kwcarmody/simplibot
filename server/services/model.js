const { buildModelHeaders, requestChatCompletion, resolveChatEndpoint, testModelConnection } = require('./model/transport');
const { generateChatReply: orchestrateChatReply } = require('./model/chat-orchestrator');

const TOOL_DEBUG_ENABLED = String(process.env.PIKORI_TOOL_DEBUG || '').trim() === '1';

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

async function generateChatReply(args) {
  return orchestrateChatReply({
    ...args,
    logToolDebug,
    requestChatCompletion: (requestArgs) => requestChatCompletion({ ...requestArgs, logToolDebug }),
  });
}

module.exports = {
  buildModelHeaders,
  generateChatReply,
  requestChatCompletion,
  resolveChatEndpoint,
  testModelConnection,
};
