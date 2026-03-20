function buildChatSystemPrompt(memorySettings) {
  const systemParts = [
    `Your name is ${memorySettings.botName}.`,
    `You are ${memorySettings.botDescription}`,
    `The user's name is ${memorySettings.userName}.`,
  ];

  if (memorySettings.userDescription) {
    systemParts.push(`User description: ${memorySettings.userDescription}`);
  }

  systemParts.push('Be helpful, concise, and conversational.');
  return systemParts.join(' ');
}

function buildChatMessages({ memorySettings, chatMessages }) {
  return [
    {
      role: 'system',
      content: buildChatSystemPrompt(memorySettings),
    },
    ...chatMessages.map((message) => ({
      role: message.role === 'assistant' ? 'assistant' : 'user',
      content: message.text,
    })),
  ];
}

module.exports = {
  buildChatMessages,
  buildChatSystemPrompt,
};
