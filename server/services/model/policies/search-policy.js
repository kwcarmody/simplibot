const { getToolService } = require('../../tools');

function isLikelyWebSearchRequest({ tools = [], latestUserMessage = '' }) {
  const hasWebSearch = tools.some((tool) => tool.toolKey === 'web-search' && tool.enabled);
  if (!hasWebSearch) {
    return false;
  }

  const webSearchService = getToolService('web-search');
  if (!webSearchService?.shouldAutoExecute) {
    return false;
  }

  return webSearchService.shouldAutoExecute({
    latestUserMessage,
    input: {
      query: latestUserMessage,
    },
  });
}

function getWebSearchIntent(latestUserMessage = '') {
  const webSearchService = getToolService('web-search');
  if (!webSearchService?.classifySearchIntent) {
    return {
      mode: 'general_web',
      needsWebSearch: true,
      label: 'general_web',
    };
  }

  return webSearchService.classifySearchIntent({
    latestUserMessage,
    query: latestUserMessage,
  });
}

function answerInternalSearchMetaQuestion(latestUserMessage = '') {
  const normalized = String(latestUserMessage || '').toLowerCase();

  if (/\bgrounded[_\s-]?facts?\b/.test(normalized)) {
    return 'In this app, grounded facts are the reduced evidence snippets pulled from web search results. They are the specific titles, sources, links, and short evidence lines the assistant is supposed to rely on instead of freehand guessing.';
  }

  return '';
}

// For historical/background questions that are unlikely to depend on live web
// data, we do a constrained model pass that explicitly avoids tool/web claims.
async function answerKnownStaticQuery({ modelSettings, memorySettings, latestUserMessage, now = new Date(), requestChatCompletion, logToolDebug = () => {} }) {
  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York',
  }).format(now);

  const messages = [
    {
      role: 'system',
      content: [
        `Your name is ${memorySettings.botName}.`,
        `You are ${memorySettings.botDescription}`,
        `Today's date is ${today}.`,
        'Answer the user directly from stable background knowledge only.',
        'Use this path only for facts that are unlikely to have changed recently, such as historical facts, definitions, or older background information.',
        'Be concise and helpful.',
        'End with one short sentence reminding the user to check the latest details if recency could matter.',
        'Do not mention tools or web search.',
      ].join(' '),
    },
    {
      role: 'user',
      content: latestUserMessage,
    },
  ];

  const text = await requestChatCompletion({
    modelSettings,
    messages,
  });

  logToolDebug('known-static-response', {
    latestUserMessage,
    text,
  });

  return {
    text,
    debug: {
      toolAttempted: false,
      toolExecuted: false,
      renderedBy: 'known-static',
    },
  };
}

module.exports = {
  answerInternalSearchMetaQuestion,
  answerKnownStaticQuery,
  getWebSearchIntent,
  isLikelyWebSearchRequest,
};
