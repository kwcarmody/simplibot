const { buildChatMessages } = require('../../prompts/chat');

function buildMessages({ memorySettings, chatMessages, conversationContext = {}, now }) {
  return buildChatMessages({ memorySettings, chatMessages, tools: [], conversationContext, now });
}

function parseAssistantResponse(content) {
  return {
    type: 'final',
    text: String(content || '').trim(),
  };
}

module.exports = {
  buildMessages,
  parseAssistantResponse,
};
