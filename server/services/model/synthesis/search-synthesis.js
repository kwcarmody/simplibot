const { buildToolResultFollowupPrompt } = require('./tool-followup');

function buildSearchSynthesisMessages({
  memorySettings,
  latestUserMessage,
  groundedResult,
  now = new Date(),
}) {
  const today = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/New_York',
  }).format(now);

  return [
    {
      role: 'system',
      content: [
        `Your name is ${memorySettings.botName}.`,
        `You are ${memorySettings.botDescription}`,
        `Today's date is ${today}.`,
        'You are in a dedicated search-synthesis pass.',
        `Search intent mode: ${String(groundedResult?.searchMode || 'general_web')}.`,
        'Your job is to answer the user using only the grounded search evidence provided below.',
        'Do not invent facts, dates, names, prices, schedules, events, or sources.',
        'Do not use outside knowledge.',
        'If the grounded evidence is insufficient, say so plainly and ask one concise follow-up or suggest a narrower query.',
        'When there are multiple grounded results, prefer a short intro followed by a flat bullet list.',
        'Include source hostname or URL inline when useful.',
        'Do not emit a tool call.',
      ].join(' '),
    },
    {
      role: 'system',
      content: `Original user request: ${latestUserMessage}`,
    },
    {
      role: 'system',
      content: [
        'Grounded web search result JSON:',
        JSON.stringify(groundedResult),
        '',
        'Grounded facts:',
        ...((Array.isArray(groundedResult?.groundedFacts) ? groundedResult.groundedFacts : []).map((fact, index) => [
          `${index + 1}. ${fact.title || 'Result'}`,
          fact.evidence ? `Evidence: ${fact.evidence}` : '',
          fact.source ? `Source: ${fact.source}` : '',
          fact.url ? `URL: ${fact.url}` : '',
        ].filter(Boolean).join('\n'))),
      ].join('\n'),
    },
    {
      role: 'user',
      content: `${buildToolResultFollowupPrompt('web-search', {
        searchMode: groundedResult?.searchMode || 'general_web',
      })} The grounded facts are included above. Do not ask the user to provide them again.`,
    },
  ];
}

function isSearchSynthesisFailureText(text = '') {
  const normalized = String(text || '').trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  const failurePatterns = [
    /grounded[_\s-]?facts?.*(not available|missing|not included|not provided)/i,
    /no grounded evidence/i,
    /please provide.*grounded[_\s-]?facts?/i,
    /please provide.*search results/i,
    /could not answer.*because.*(not provided|missing)/i,
    /cannot proceed because.*(not included|missing)/i,
  ];

  return failurePatterns.some((pattern) => pattern.test(normalized));
}

function isSearchSynthesisOffTopic({ text = '', groundedResult = {}, normalizeComparisonText, getSignificantTokens }) {
  const normalizedText = normalizeComparisonText(text);
  if (!normalizedText) {
    return true;
  }

  const query = String(groundedResult?.query || '').trim();
  if (!query) {
    return false;
  }

  const genericSearchWords = new Set([
    'current', 'latest', 'recent', 'today', 'tonight', 'week', 'weekend', 'events', 'event',
    'concert', 'concerts', 'festival', 'festivals', 'things', 'thing', 'happening', 'happens',
    'what', 'whats', 'who', 'where', 'when', 'query', 'march', 'april', 'may', 'june', 'july',
    'august', 'september', 'october', 'november', 'december', 'january', 'february',
  ]);
  const anchorTokens = getSignificantTokens(query).filter((token) => !genericSearchWords.has(token));

  if (anchorTokens.length && anchorTokens.some((token) => normalizedText.includes(token))) {
    return false;
  }

  const groundedFacts = Array.isArray(groundedResult?.groundedFacts) ? groundedResult.groundedFacts : [];
  const factAnchorTokens = groundedFacts.slice(0, 3)
    .flatMap((fact) => getSignificantTokens(`${fact?.title || ''} ${fact?.evidence || ''}`))
    .filter((token) => !genericSearchWords.has(token));

  if (factAnchorTokens.some((token) => normalizedText.includes(token))) {
    return false;
  }

  return true;
}

// Main entrypoint for grounded web-search answer generation. This either:
// 1) returns a deterministic formatter result immediately for simple fact mode,
// 2) runs synthesis and accepts the grounded result, or
// 3) falls back to the deterministic formatter when synthesis is weak.
async function synthesizeWebSearchResult({
  modelSettings,
  memorySettings,
  latestUserMessage,
  execution,
  now,
  requestChatCompletion,
  logToolDebug = () => {},
  normalizeComparisonText,
  getSignificantTokens,
}) {
  const groundedResult = execution.service?.buildGroundedResult
    ? execution.service.buildGroundedResult({
        result: execution.result,
        latestUserMessage,
      })
    : execution.result;
  const deterministicText = execution.service?.formatResultForAssistant
    ? execution.service.formatResultForAssistant({
        result: execution.result,
        latestUserMessage,
      })
    : String(execution.result?.message || '').trim();

  if (groundedResult?.searchMode === 'encyclopedic_fact') {
    logToolDebug('search-synthesis-bypassed', {
      toolKey: execution.tool.toolKey,
      reason: 'encyclopedic_fact',
      text: deterministicText,
      groundedResult,
    });

    return {
      text: deterministicText,
      toolStatePatch: execution.result?.sessionStatePatch ?? null,
      debug: {
        toolAttempted: true,
        toolExecuted: true,
        toolKey: execution.tool.toolKey,
        renderedBy: 'search-fact-formatter',
      },
    };
  }

  const synthesisMessages = buildSearchSynthesisMessages({
    memorySettings,
    latestUserMessage,
    groundedResult,
    now,
  });
  try {
    const finalText = await requestChatCompletion({
      modelSettings,
      messages: synthesisMessages,
    });

    if (isSearchSynthesisFailureText(finalText)) {
      const synthesisFailure = new Error('Search synthesis produced an unusable response.');
      synthesisFailure.code = 'SEARCH_SYNTHESIS_UNUSABLE';
      throw synthesisFailure;
    }

    if (groundedResult?.searchMode === 'regional_live' && isSearchSynthesisOffTopic({
      text: finalText,
      groundedResult,
      normalizeComparisonText,
      getSignificantTokens,
    })) {
      const synthesisFailure = new Error('Search synthesis produced an off-topic response.');
      synthesisFailure.code = 'SEARCH_SYNTHESIS_OFF_TOPIC';
      throw synthesisFailure;
    }

    logToolDebug('search-synthesis-response', {
      toolKey: execution.tool.toolKey,
      text: finalText,
      groundedResult,
    });

    return {
      text: finalText,
      toolStatePatch: execution.result?.sessionStatePatch ?? null,
      debug: {
        toolAttempted: true,
        toolExecuted: true,
        toolKey: execution.tool.toolKey,
        renderedBy: 'search-synthesis',
      },
    };
  } catch (error) {
    logToolDebug('search-synthesis-fallback', {
      toolKey: execution.tool.toolKey,
      error: error?.message || String(error),
      text: deterministicText,
      groundedResult,
    });

    return {
      text: deterministicText,
      toolStatePatch: execution.result?.sessionStatePatch ?? null,
      debug: {
        toolAttempted: true,
        toolExecuted: true,
        toolKey: execution.tool.toolKey,
        renderedBy: 'search-synthesis-fallback',
        fallbackReason: error?.code || 'search_synthesis_failed',
      },
    };
  }
}

module.exports = {
  buildSearchSynthesisMessages,
  isSearchSynthesisFailureText,
  isSearchSynthesisOffTopic,
  synthesizeWebSearchResult,
};
