function buildSearchPlannerMessages({
  memorySettings,
  latestUserMessage,
  webSearchToolDefinition,
  searchIntent,
  now = new Date(),
}) {
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
  const inputs = Array.isArray(webSearchToolDefinition?.inputs)
    ? webSearchToolDefinition.inputs.map((input) => `${input.key}${input.required ? ' (required)' : ''}: ${input.description}`).join('; ')
    : '';
  const intentMode = String(searchIntent?.mode || 'general_web').trim();
  const modeGuidance = {
    encyclopedic_fact: [
      'Intent mode: encyclopedic_fact.',
      'This is a factual lookup or reference-style question.',
      'Prefer concise reference-style queries.',
      'For encyclopedic fact lookups, prefer official primary sources when available and Wikipedia-style reference sources when helpful.',
      'For government officeholders or current officials, prefer official government sources over generic blogs.',
      'When helpful, rewrite the query to include reference terms such as Wikipedia or official office names.',
    ].join(' '),
    regional_live: [
      'Intent mode: regional_live.',
      'This is a local, regional, or live-information request.',
      'Prefer venue pages, city guides, local news, ticketing pages, event calendars, and other regional sources.',
      'Preserve location, date, and timing constraints in the search query.',
    ].join(' '),
    general_web: [
      'Intent mode: general_web.',
      'Use a neutral web query that preserves the user intent and key constraints.',
    ].join(' '),
  };

  return [
    {
      role: 'system',
      content: [
        `Your name is ${memorySettings.botName}.`,
        `You are ${memorySettings.botDescription}`,
        `Today's date is ${today}.`,
        `The current time is ${currentTime}.`,
        'You are in a dedicated search-planning pass.',
        'Your job is only to decide the correct web-search response for the user request.',
        'If the request needs current, recent, factual, lookup, or web-grounded information, respond with only one valid JSON tool call and no surrounding text.',
        'Use this exact outer shape:',
        '{"type":"tool_call","tool":"web-search","input":{"query":"..."}}',
        'Rewrite the user request into a concise search query when helpful, but preserve the user intent and key constraints.',
        'For requests about people, organizations, events, touring, schedules, availability, current status, or anything the web could verify, use web-search instead of answering from memory.',
        'If web search is not needed, answer the user directly in one concise sentence and do not emit a tool call.',
        'Never claim that you searched the web, found results, confirmed facts, or checked sources unless you return a tool call and the tool is executed later.',
        modeGuidance[intentMode] || modeGuidance.general_web,
        `web-search description: ${webSearchToolDefinition?.description || ''}`,
        inputs ? `web-search inputs: ${inputs}` : '',
      ].filter(Boolean).join(' '),
    },
    {
      role: 'user',
      content: latestUserMessage,
    },
  ];
}

// Run the dedicated search planner pass, then parse the model output through
// the active adapter so the orchestrator can treat it as structured output.
async function planWebSearchToolCall({ modelSettings, memorySettings, latestUserMessage, webSearchToolDefinition, adapter, now, getWebSearchIntent, requestChatCompletion, logToolDebug = () => {} }) {
  const searchIntent = getWebSearchIntent(latestUserMessage);
  const plannerMessages = buildSearchPlannerMessages({
    memorySettings,
    latestUserMessage,
    webSearchToolDefinition,
    searchIntent,
    now,
  });
  logToolDebug('search-planner-request', {
    model: modelSettings.model,
    latestUserMessage,
    searchIntent,
    messageCount: plannerMessages.length,
  });
  const plannerResponse = await requestChatCompletion({
    modelSettings,
    messages: plannerMessages,
  });
  const parsedPlannerResponse = adapter.parseAssistantResponse(plannerResponse);
  logToolDebug('search-planner-response', {
    response: plannerResponse,
    searchIntent,
    parsedResponse: parsedPlannerResponse,
  });
  return {
    parsedResponse: parsedPlannerResponse,
    searchIntent,
  };
}

async function repairWebSearchToolCall({ modelSettings, latestUserMessage, adapter, plannerResponse, searchIntent, requestChatCompletion, logToolDebug = () => {} }) {
  const retryMessages = [
    {
      role: 'system',
      content: [
        'The previous assistant response was invalid because this request requires grounded web search and you answered without a tool call.',
        'You must now repair the response.',
        'Respond with only one valid JSON tool call and no surrounding text.',
        'Use the web-search tool.',
        'Use this exact outer shape:',
        '{"type":"tool_call","tool":"web-search","input":{"query":"..."}}',
        `Search intent mode: ${String(searchIntent?.mode || 'general_web')}.`,
        searchIntent?.mode === 'encyclopedic_fact'
          ? 'Prefer an encyclopedic/reference-style query. Use official sources when possible and Wikipedia-style terms when helpful.'
          : 'Preserve local, temporal, and regional constraints when present.',
        'Do not answer the question directly.',
        'Do not claim you searched, found results, or confirmed facts.',
        'Do not wrap the JSON in markdown.',
        'Do not output any text before or after the JSON.',
      ].join(' '),
    },
    {
      role: 'assistant',
      content: String(plannerResponse || '').trim(),
    },
    {
      role: 'user',
      content: latestUserMessage,
    },
  ];

  const retryResponse = await requestChatCompletion({
    modelSettings,
    messages: retryMessages,
  });
  const parsedRetryResponse = adapter.parseAssistantResponse(retryResponse);
  logToolDebug('search-planner-retry', {
    originalResponse: plannerResponse,
    searchIntent,
    retryResponse,
    parsedResponse: parsedRetryResponse,
  });
  return parsedRetryResponse;
}

module.exports = {
  buildSearchPlannerMessages,
  planWebSearchToolCall,
  repairWebSearchToolCall,
};
