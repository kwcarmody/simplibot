function normalizeConfig(config = {}) {
  return {
    baseUrl: String(config.baseUrl || '').trim(),
    provider: String(config.provider || '').trim(),
    apiKey: String(config.apiKey || '').trim(),
  };
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#x27;', "'")
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function stripHtmlTags(value) {
  return decodeHtmlEntities(String(value || '').replace(/<[^>]+>/g, ' '));
}

function normalizeText(value) {
  return stripHtmlTags(value).replace(/\s+/g, ' ').trim();
}

function validateConfig(config = {}) {
  const normalized = normalizeConfig(config);

  if (!normalized.baseUrl) {
    return 'Base URL is required.';
  }

  if (!normalized.provider) {
    return 'Provider is required.';
  }

  if (!normalized.apiKey) {
    return 'API key is required.';
  }

  return '';
}

function getPromptDefinition({ tool }) {
  return {
    toolKey: tool.toolKey,
    name: tool.title,
    description: 'Search the public web for recent or general information.',
    autonomous: Boolean(tool.autonomous),
    inputs: [
      {
        key: 'query',
        description: 'A search query describing what to find.',
        required: true,
      },
    ],
  };
}

function validateInvocationInput(input = {}) {
  const query = String(input.query || '').trim();

  if (!query) {
    return 'A search query is required.';
  }

  return '';
}

function normalizeIntentText(value) {
  return String(value || '').trim().toLowerCase();
}

function isGreetingOnly(value) {
  const normalized = normalizeIntentText(value);
  return [
    'hi',
    'hey',
    'hello',
    'yo',
    'good morning',
    'good afternoon',
    'good evening',
    'thanks',
    'thank you',
    'ok',
    'okay',
    'cool',
    'nice',
  ].includes(normalized);
}

function hasStrongSearchIntent(value) {
  const normalized = normalizeIntentText(value);

  if (!normalized || isGreetingOnly(normalized)) {
    return false;
  }

  const searchIntentPatterns = [
    /\b(find|search|look up|lookup|google|check)\b/,
    /\b(current|latest|recent|today|right now|upcoming|near me|nearby)\b/,
    /\b(events?|concerts?|shows?|performances?|things to do|tour|tours|touring)\b/,
    /\b(weather|news|price|prices|availability|schedule|hours|tickets?)\b/,
    /\b(what are|what's|what is|where can i|which are|show me|how much|how many|how big|how tall|how long|how heavy)\b/,
    /\b(restaurants?|hotels?|flights?|music|classical music|llms?|models?|weight|size|length|height|lifespan)\b/,
    /\b(who is|tell me about|information about|background on|learn about)\b/,
    /\b(open source|opensource|provided by|does .* provide)\b/,
  ];

  return searchIntentPatterns.some((pattern) => pattern.test(normalized));
}

function shouldAutoExecute({ latestUserMessage, input = {} }) {
  const latestMessage = String(latestUserMessage || '').trim();
  const query = String(input.query || '').trim();

  if (isGreetingOnly(latestMessage)) {
    return false;
  }

  if (!hasStrongSearchIntent(latestMessage) && !hasStrongSearchIntent(query)) {
    return false;
  }

  return true;
}

function resolveSearchEndpoint(baseUrl) {
  const normalizedBaseUrl = String(baseUrl || '').trim().replace(/\/+$/, '');
  return /\/res\/v1\/web\/search$/i.test(normalizedBaseUrl)
    ? normalizedBaseUrl
    : `${normalizedBaseUrl}/res/v1/web/search`;
}

function buildEvidenceLines(result = {}) {
  const parts = [];

  if (result.description) {
    parts.push(normalizeText(result.description));
  }

  if (Array.isArray(result.extraSnippets) && result.extraSnippets.length) {
    parts.push(...result.extraSnippets.map((snippet) => normalizeText(snippet)).filter(Boolean));
  }

  return parts.filter(Boolean);
}

function splitEvidenceSegments(text) {
  return normalizeText(text)
    .split(/\s*\.\.\.\s*|\s*[|;]\s*|\s+[·•]\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function looksLikePersonQuery(query) {
  return /\b(who is|tell me about|information about|background on|learn about)\b/i.test(String(query || ''));
}

function looksLikePersonName(query) {
  const normalized = String(query || '').trim();
  return /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/.test(normalized);
}

function looksLikeEventsQuery(query) {
  return /\b(events?|concerts?|shows?|performances?|happening|this week|this weekend|today)\b/i.test(String(query || ''));
}

function looksLikeHoursQuery(query) {
  return /\b(open|closed|hours?)\b/i.test(String(query || ''));
}

function summarizeEvidence(text) {
  const normalized = normalizeText(text);
  if (!normalized) {
    return '';
  }

  const firstSentence = normalized.split(/(?<=[.!?])\s+/)[0] || normalized;
  return firstSentence.trim();
}

function shortenEvidence(text, maxLength = 180) {
  const summary = summarizeEvidence(text);
  if (summary.length <= maxLength) {
    return summary;
  }

  return `${summary.slice(0, maxLength - 3).trim()}...`;
}

function getQueryWords(query = '') {
  return String(query || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 2);
}

function pickBestSegment({ query = '', segments = [], fallback = '' }) {
  const queryWords = getQueryWords(query);
  const scoredSegments = segments
    .map((segment) => {
      const normalized = normalizeText(segment);
      if (!normalized) {
        return null;
      }

      const lower = normalized.toLowerCase();
      const queryMatches = queryWords.filter((word) => lower.includes(word)).length;
      const detailSignals = [
        /\b(at|in|on|from|with|featuring|founded|scheduled|performing|concert|event|tickets?|series|director|advisor|practice)\b/i,
        /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
        /\b\d{1,2}:\d{2}\b/,
        /\b\d{4}\b/,
      ].reduce((score, pattern) => score + (pattern.test(normalized) ? 1 : 0), 0);
      const lengthScore = Math.min(normalized.length, 160) / 40;

      return {
        text: normalized,
        score: queryMatches * 4 + detailSignals * 3 + lengthScore,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return scoredSegments[0]?.text || summarizeEvidence(fallback);
}

function dedupeGroundedFacts(facts = []) {
  const seen = new Set();

  return facts.filter((fact) => {
    const canonicalTitle = normalizeText(fact.title)
      .replace(/\s*[-|]\s*[^-|]+$/g, '')
      .toLowerCase();
    const canonicalEvidence = normalizeText(fact.evidence)
      .replace(/\b(source|link):.*$/i, '')
      .toLowerCase();
    const key = [
      canonicalTitle,
      canonicalEvidence,
    ].join('::');

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function extractGroundedFacts({ query = '', latestUserMessage = '', results = [] }) {
  const personQuery = looksLikePersonQuery(latestUserMessage) || looksLikePersonQuery(query) || looksLikePersonName(query);

  return results
    .map((item) => {
      const evidenceLines = buildEvidenceLines(item);
      const segments = evidenceLines.flatMap(splitEvidenceSegments);
      const supportingLine = personQuery
        ? summarizeEvidence(evidenceLines[0] || '')
        : pickBestSegment({
            query,
            segments,
            fallback: evidenceLines[0] || '',
          });

      if (!item.title && !supportingLine) {
        return null;
      }

      return {
        title: item.title || 'Result',
        source: item.source || '',
        url: item.url || '',
        evidence: supportingLine,
      };
    })
    .filter(Boolean);
}

function buildGroundedResult({ result, latestUserMessage = '' }) {
  const query = String(result?.query || latestUserMessage || '').trim();
  const results = Array.isArray(result?.results) ? result.results : [];
  const groundedFacts = dedupeGroundedFacts(extractGroundedFacts({ query, latestUserMessage, results }));

  return {
    query,
    resultCount: Number(result?.resultCount || results.length || 0),
    groundedFacts,
    confidence: groundedFacts.length ? 'partial' : 'low',
  };
}

function formatPersonAnswer({ query, groundedFacts }) {
  if (!groundedFacts.length) {
    return `I couldn't confidently identify who "${query}" refers to from the available search results. If you want, give me a profession, company, or location and I can narrow it down.`;
  }

  const displayFacts = groundedFacts.slice(0, 4);
  const intro = displayFacts.length > 1
    ? `I found multiple people or profiles that may match "${query}":`
    : `I found this likely match for "${query}":`;
  const bullets = displayFacts.map((fact) => {
    const parts = [`- ${fact.title}`];
    if (fact.evidence) {
      parts.push(`  ${summarizeEvidence(fact.evidence)}`);
    }
    if (fact.source) {
      parts.push(`  Source: ${fact.source}`);
    }
    if (fact.url) {
      parts.push(`  Link: ${fact.url}`);
    }
    return parts.join('\n');
  });

  const outro = displayFacts.length > 1
    ? '\nIf you meant a specific Kevin Carmody, tell me which field or company and I can narrow it down.'
    : '';

  return [intro, '', ...bullets, outro].filter(Boolean).join('\n');
}

function formatEventsAnswer({ query, groundedFacts }) {
  if (!groundedFacts.length) {
    return `I couldn't confidently confirm specific events for "${query}" from the available search results. If you want, I can refine the search by venue, date, or event type.`;
  }

  const bullets = groundedFacts.slice(0, 5).map((fact) => {
    const parts = [`- ${fact.title}`];
    if (fact.evidence) {
      parts.push(`  ${shortenEvidence(fact.evidence)}`);
    }
    if (fact.source) {
      parts.push(`  Source: ${fact.source}`);
    }
    if (fact.url) {
      parts.push(`  Link: ${fact.url}`);
    }
    return parts.join('\n');
  });

  return [
    `Here are the event-related results I could confirm for "${query}":`,
    '',
    ...bullets,
    '',
    'If you want, I can refine the search by venue, date, or event type.',
  ].join('\n');
}

function formatHoursAnswer({ query, groundedFacts }) {
  if (!groundedFacts.length) {
    return `I couldn't confidently confirm the hours for "${query}" from the available search results.`;
  }

  const strongest = groundedFacts[0];
  const evidence = shortenEvidence(strongest.evidence || '');
  const closedMatch = evidence.match(/\bSun\s*-\s*Closed\b/i) || evidence.match(/\bclosed\b/i);
  const openMatch = evidence.match(/\b(\w{3}\s*-\s*\d{1,2}:\d{2}\s*(?:am|pm)\s*-\s*\d{1,2}:\d{2}\s*(?:am|pm))\b/i);

  const lines = [];
  if (closedMatch) {
    lines.push(`Based on the strongest result I found, it appears "${query}" is closed.`);
  } else if (openMatch) {
    lines.push(`Based on the strongest result I found, "${query}" appears to be open with listed hours.`);
  } else {
    lines.push(`Here is the strongest hours-related result I found for "${query}":`);
  }

  lines.push(`- ${strongest.title}`);
  if (evidence) {
    lines.push(`  ${evidence}`);
  }
  if (strongest.source) {
    lines.push(`  Source: ${strongest.source}`);
  }
  if (strongest.url) {
    lines.push(`  Link: ${strongest.url}`);
  }

  return lines.join('\n');
}

function formatGenericAnswer({ query, groundedFacts }) {
  if (!groundedFacts.length) {
    return `I couldn't find strong enough search results to answer "${query}" confidently. If you want, I can try a narrower query.`;
  }

  const bullets = groundedFacts.slice(0, 5).map((fact) => {
    const parts = [`- ${fact.title}`];
    if (fact.evidence) {
      parts.push(`  ${shortenEvidence(fact.evidence)}`);
    }
    if (fact.source) {
      parts.push(`  Source: ${fact.source}`);
    }
    if (fact.url) {
      parts.push(`  Link: ${fact.url}`);
    }
    return parts.join('\n');
  });

  return [
    `Here are the strongest results I found for "${query}":`,
    '',
    ...bullets,
  ].join('\n');
}

function formatResultForAssistant({ result, latestUserMessage = '' }) {
  const grounded = buildGroundedResult({ result, latestUserMessage });
  const query = grounded.query || String(latestUserMessage || '').trim();

  if (looksLikePersonQuery(latestUserMessage) || looksLikePersonQuery(query)) {
    return formatPersonAnswer({ query, groundedFacts: grounded.groundedFacts });
  }

  if (looksLikeEventsQuery(latestUserMessage) || looksLikeEventsQuery(query)) {
    return formatEventsAnswer({ query, groundedFacts: grounded.groundedFacts });
  }

  if (looksLikeHoursQuery(latestUserMessage) || looksLikeHoursQuery(query)) {
    return formatHoursAnswer({ query, groundedFacts: grounded.groundedFacts });
  }

  return formatGenericAnswer({ query, groundedFacts: grounded.groundedFacts });
}

async function execute({ input = {}, config = {} }) {
  const normalizedConfig = normalizeConfig(config);
  const configError = validateConfig(normalizedConfig);
  if (configError) {
    throw new Error(configError);
  }

  const inputError = validateInvocationInput(input);
  if (inputError) {
    throw new Error(inputError);
  }

  const query = String(input.query || '').trim();
  const endpoint = new URL(resolveSearchEndpoint(normalizedConfig.baseUrl));
  endpoint.searchParams.set('q', query);
  endpoint.searchParams.set('count', '5');
  endpoint.searchParams.set('extra_snippets', 'true');
  endpoint.searchParams.set('safesearch', 'moderate');

  const response = await fetch(endpoint.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-Subscription-Token': normalizedConfig.apiKey,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || `Web search failed with ${response.status}.`);
  }

  const results = Array.isArray(data?.web?.results) ? data.web.results.slice(0, 5) : [];

  return {
    query,
    provider: normalizedConfig.provider,
    resultCount: results.length,
    results: results.map((result) => ({
      title: result.title || '',
      url: result.url || '',
      source: (() => {
        try {
          return result.url ? new URL(result.url).hostname : '';
        } catch (_error) {
          return '';
        }
      })(),
      description: result.description || '',
      extraSnippets: Array.isArray(result.extra_snippets) ? result.extra_snippets : [],
    })),
  };
}

module.exports = {
  buildGroundedResult,
  execute,
  formatResultForAssistant,
  getPromptDefinition,
  normalizeConfig,
  shouldAutoExecute,
  validateInvocationInput,
  validateConfig,
};
