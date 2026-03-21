const { buildChatMessages } = require('../../prompts/chat');

function buildMessages({ memorySettings, chatMessages, now }) {
  return buildChatMessages({ memorySettings, chatMessages, tools: [], now });
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
