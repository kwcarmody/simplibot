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

// Run the dedicated todo planner pass and parse the result through the active
// adapter so the orchestrator can treat it as structured text vs tool-call data.
async function planTodoManagerToolCall({ modelSettings, memorySettings, latestUserMessage, todoToolDefinition, chatMessages = [], adapter, now, requestChatCompletion, logToolDebug = () => {} }) {
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

module.exports = {
  buildTaskPlannerMessages,
  planTodoManagerToolCall,
};
