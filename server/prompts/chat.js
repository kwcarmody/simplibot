function buildChatSystemPrompt(memorySettings, options = {}) {
  const tools = Array.isArray(options.tools) ? options.tools : [];
  const adapterInstructions = String(options.adapterInstructions || '').trim();
  const now = options.now instanceof Date ? options.now : new Date();
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
  const systemParts = [
    `Your name is ${memorySettings.botName}.`,
    `You are ${memorySettings.botDescription}`,
    `The user's name is ${memorySettings.userName}.`,
    `Today's date is ${today}.`,
    `The current time is ${currentTime}.`,
  ];

  if (memorySettings.userDescription) {
    systemParts.push(`User profile context: ${memorySettings.userDescription}`);
  }

  systemParts.push('Be helpful, concise, and conversational.');
  systemParts.push('Treat the user profile context as background only. Use it only when it is clearly relevant to the current user request.');
  systemParts.push('Do not force profile interests, location, or background into replies when the current conversation does not call for it.');
  systemParts.push('Do not mention the user profile context unless it directly helps answer the current request.');
  systemParts.push('For greetings, casual chat, acknowledgements, and social conversation, respond naturally and briefly without steering into profile-based topics.');
  systemParts.push('Do not invent facts about your creator, organization, or identity beyond what is explicitly provided in this prompt.');

  if (tools.length) {
    const toolLines = tools.map((tool) => {
      const inputs = Array.isArray(tool.inputs) && tool.inputs.length
        ? tool.inputs.map((input) => `${input.key}${input.required ? ' (required)' : ''}: ${input.description}`).join('; ')
        : 'No declared inputs.';
      const autonomy = tool.autonomous
        ? 'This tool may be executed autonomously when all required inputs are available.'
        : 'This tool requires confirmation before execution.';

      return `Tool ${tool.toolKey}: ${tool.name}. ${tool.description} Inputs: ${inputs} ${autonomy}`;
    });

    systemParts.push(`Available tools: ${toolLines.join(' ')}`);
  }

  if (adapterInstructions) {
    systemParts.push(adapterInstructions);
  }

  return systemParts.join(' ');
}

function buildChatMessages({ memorySettings, chatMessages, tools = [], adapterInstructions = '', now = new Date() }) {
  return [
    {
      role: 'system',
      content: buildChatSystemPrompt(memorySettings, { tools, adapterInstructions, now }),
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
