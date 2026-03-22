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

const META_EXPLANATION_PATTERNS = [
  /\bgrounded[_\s-]?facts?\b/i,
  /\bwhat does .* mean\b/i,
  /\bhow does .* work\b/i,
  /\bin this app\b/i,
  /\bin this system\b/i,
  /\byour search results\b/i,
];

const GOVERNMENT_ROLE_PATTERNS = [
  /\bmayor\b/i,
  /\battorney general\b/i,
  /\bgovernor\b/i,
  /\bsenators?\b/i,
  /\brepresentatives?\b/i,
  /\bsecretary of state\b/i,
  /\btreasurer\b/i,
  /\bcommissioner\b/i,
  /\bchief justice\b/i,
  /\bincumbent\b/i,
  /\bofficials?\b/i,
];

const STABLE_FACT_PATTERNS = [
  /\bwho was\b/i,
  /\bwhat was\b/i,
  /\bwhen was\b/i,
  /\bwhen did\b/i,
  /\bwhere was\b/i,
  /\bwhere did\b/i,
  /\bhistory of\b/i,
  /\bdefinition of\b/i,
  /\bmeaning of\b/i,
  /\bexplain\b/i,
  /\bwhy did\b/i,
  /\bhow did\b/i,
  /\borigin of\b/i,
  /\bwhat happened in\b/i,
];

const CURRENTNESS_PATTERNS = [
  /\bcurrent\b/i,
  /\blatest\b/i,
  /\brecent\b/i,
  /\bright now\b/i,
  /\btoday\b/i,
  /\bthis weekend\b/i,
  /\bthis week\b/i,
  /\btonight\b/i,
  /\bupcoming\b/i,
];

function looksLikeInternalMetaQuery(value) {
  const normalized = normalizeIntentText(value);
  if (!normalized) {
    return false;
  }

  return META_EXPLANATION_PATTERNS.some((pattern) => pattern.test(normalized));
}

function looksLikeGovernmentOfficialQuery(value) {
  return GOVERNMENT_ROLE_PATTERNS.some((pattern) => pattern.test(String(value || '')));
}

function looksLikeEncyclopedicFactQuery(value) {
  const normalized = normalizeIntentText(value);
  if (!normalized) {
    return false;
  }

  if (looksLikeInternalMetaQuery(normalized) || isGreetingOnly(normalized) || isPersonalOrMetaQuestion(normalized)) {
    return false;
  }

  return [
    /\bwho is\b/i,
    /\bwhat is\b/i,
    /\bwhat are\b/i,
    /\btell me about\b/i,
    /\binformation about\b/i,
    /\bbackground on\b/i,
    /\bcurrent\b/i,
    /\bincumbent\b/i,
    /\bdefinition\b/i,
    /\bmeaning\b/i,
    /\bbiography\b/i,
    /\bhistory of\b/i,
    /\bwiki(?:pedia)?\b/i,
  ].some((pattern) => pattern.test(normalized)) || looksLikeGovernmentOfficialQuery(normalized);
}

function looksLikeStableFactQuery(value) {
  const normalized = normalizeIntentText(value);
  if (!normalized) {
    return false;
  }

  if (looksLikeInternalMetaQuery(normalized) || CURRENTNESS_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return false;
  }

  if (STABLE_FACT_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return true;
  }

  if (/\b(19|20)\d{2}\b/.test(normalized) && !/\b2025\b|\b2026\b|\b2027\b/.test(normalized)) {
    return true;
  }

  return false;
}

function looksLikeRegionalLiveQuery(value) {
  const normalized = normalizeIntentText(value);
  if (!normalized) {
    return false;
  }

  const timeOrLocalSignals = [
    /\bthis weekend\b/i,
    /\bthis week\b/i,
    /\btoday\b/i,
    /\btonight\b/i,
    /\bnear me\b/i,
    /\bnearby\b/i,
  ];
  const liveInfoSignals = [
    /\bconcerts?\b/i,
    /\bevents?\b/i,
    /\bfestivals?\b/i,
    /\btickets?\b/i,
    /\bhours?\b/i,
    /\bschedule\b/i,
    /\bavailability\b/i,
    /\bhappening\b/i,
    /\bthings to do\b/i,
  ];
  const locationSignals = [
    /\bin [a-z]/i,
    /\bcharlotte\b/i,
    /\bnorth carolina\b/i,
  ];

  const hasTimeOrLocalSignal = timeOrLocalSignals.some((pattern) => pattern.test(normalized));
  const hasLiveInfoSignal = liveInfoSignals.some((pattern) => pattern.test(normalized));
  const hasLocationSignal = locationSignals.some((pattern) => pattern.test(normalized));

  return (hasLiveInfoSignal && (hasTimeOrLocalSignal || hasLocationSignal)) || (hasTimeOrLocalSignal && hasLocationSignal);
}

function classifySearchIntent({ latestUserMessage = '', query = '' }) {
  const basis = String(latestUserMessage || query || '').trim();

  if (!basis) {
    return {
      mode: 'not_query',
      strategy: 'not_query',
      needsWebSearch: false,
      shouldPlan: false,
      label: 'not_query',
    };
  }

  if (isGreetingOnly(basis) || isPersonalOrMetaQuestion(basis)) {
    return {
      mode: 'not_query',
      strategy: 'not_query',
      needsWebSearch: false,
      shouldPlan: false,
      label: 'not_query',
    };
  }

  if (looksLikeInternalMetaQuery(basis)) {
    return {
      mode: 'internal_meta',
      strategy: 'internal_meta',
      needsWebSearch: false,
      shouldPlan: true,
      label: 'internal_meta',
    };
  }

  if (looksLikeStableFactQuery(basis)) {
    return {
      mode: 'known_static',
      strategy: 'known_static',
      needsWebSearch: false,
      shouldPlan: true,
      label: 'known_static',
    };
  }

  if (looksLikeEncyclopedicFactQuery(basis)) {
    return {
      mode: 'encyclopedic_fact',
      strategy: 'factual_reference',
      needsWebSearch: true,
      shouldPlan: true,
      label: 'encyclopedic_fact',
    };
  }

  if (looksLikeRegionalLiveQuery(basis)) {
    return {
      mode: 'regional_live',
      strategy: 'current_or_regional',
      needsWebSearch: true,
      shouldPlan: true,
      label: 'regional_live',
    };
  }

  return {
    mode: 'general_web',
    strategy: hasStrongSearchIntent(basis) ? 'current_or_regional' : 'not_query',
    needsWebSearch: hasStrongSearchIntent(basis),
    shouldPlan: hasStrongSearchIntent(basis),
    label: 'general_web',
  };
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

function isPersonalOrMetaQuestion(value) {
  const normalized = normalizeIntentText(value);

  if (!normalized) {
    return false;
  }

  return [
    /\bwhat(?:'s| is)\s+my\s+name\b/,
    /\bwho\s+am\s+i\b/,
    /\bdo\s+you\s+know\s+my\s+name\b/,
    /\bwhere\s+do\s+i\s+live\b/,
    /\bdo\s+you\s+know\s+where\s+i\s+live\b/,
    /\bhow\s+are\s+you\b/,
    /\bhow\s+are\s+you\s+feeling\b/,
    /\bhow\s+do\s+you\s+feel\b/,
    /\byour\s+name\b/,
    /\bmy\s+name\b/,
  ].some((pattern) => pattern.test(normalized));
}

function hasStrongSearchIntent(value) {
  const normalized = normalizeIntentText(value);

  if (!normalized || isGreetingOnly(normalized) || isPersonalOrMetaQuestion(normalized)) {
    return false;
  }

  const searchIntentPatterns = [
    /\b(find|search|look up|lookup|google|check)\b/,
    /\b(is there|are there)\s+(?:a|an|any)\b/,
    /\b(current|latest|recent|today|right now|upcoming|near me|nearby)\b/,
    /\b(events?|concerts?|shows?|performances?|things to do|tour|tours|touring)\b/,
    /\b(weather|news|price|prices|availability|schedule|hours|tickets?|authors?|writers?|books?)\b/,
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
  const intent = classifySearchIntent({
    latestUserMessage,
    query,
  });

  if (isGreetingOnly(latestMessage) || isPersonalOrMetaQuestion(latestMessage)) {
    return false;
  }

  if (!intent.needsWebSearch) {
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

function isWikipediaSource(value = '') {
  return String(value || '').toLowerCase() === 'en.wikipedia.org';
}

function buildEffectiveSearchQuery(query = '', searchMode = 'general_web') {
  const normalizedQuery = String(query || '').trim();
  if (!normalizedQuery) {
    return '';
  }

  if (searchMode !== 'encyclopedic_fact') {
    return normalizedQuery;
  }

  if (/\bsite:wikipedia\.org\b/i.test(normalizedQuery) || /\bwikipedia\b/i.test(normalizedQuery)) {
    return normalizedQuery;
  }

  return `${normalizedQuery} site:wikipedia.org`;
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
  if (firstSentence.trim().length >= 24) {
    return firstSentence.trim();
  }

  return normalized;
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

function extractGroundedFacts({ query = '', latestUserMessage = '', results = [], searchMode = 'general_web' }) {
  const personQuery = looksLikePersonQuery(latestUserMessage)
    || looksLikePersonQuery(query)
    || looksLikePersonName(query)
    || searchMode === 'encyclopedic_fact';

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
  const searchMode = String(
    result?.searchMode
    || classifySearchIntent({
      latestUserMessage,
      query,
    }).mode
    || 'general_web'
  ).trim();
  const groundedFacts = dedupeGroundedFacts(extractGroundedFacts({
    query,
    latestUserMessage,
    results,
    searchMode,
  }));

  return {
    query,
    searchMode,
    resultCount: Number(result?.resultCount || results.length || 0),
    groundedFacts,
    confidence: groundedFacts.length ? 'partial' : 'low',
  };
}

function selectWikipediaFacts(groundedFacts = [], query = '') {
  const wikiFacts = groundedFacts.filter((fact) => isWikipediaSource(fact.source));
  if (!wikiFacts.length) {
    return [];
  }

  const queryWords = getQueryWords(query);

  return [...wikiFacts].sort((left, right) => {
    const leftText = `${left.title} ${left.evidence}`.toLowerCase();
    const rightText = `${right.title} ${right.evidence}`.toLowerCase();
    const leftScore = queryWords.filter((word) => leftText.includes(word)).length
      + (/currently held by|serving as|current president|current mayor|current attorney general/i.test(left.evidence) ? 6 : 0)
      + (/^who is\b|current\b|mayor\b|president\b|attorney general\b/i.test(query) && /\bmayor of|president of|attorney general\b/i.test(left.title) ? 4 : 0)
      - (/^category:/i.test(left.title) ? 8 : 0)
      - (/\bmay refer to\b/i.test(left.evidence) ? 7 : 0)
      - (/\bcategory:/i.test(left.title) ? 5 : 0);
    const rightScore = queryWords.filter((word) => rightText.includes(word)).length
      + (/currently held by|serving as|current president|current mayor|current attorney general/i.test(right.evidence) ? 6 : 0)
      + (/^who is\b|current\b|mayor\b|president\b|attorney general\b/i.test(query) && /\bmayor of|president of|attorney general\b/i.test(right.title) ? 4 : 0)
      - (/^category:/i.test(right.title) ? 8 : 0)
      - (/\bmay refer to\b/i.test(right.evidence) ? 7 : 0)
      - (/\bcategory:/i.test(right.title) ? 5 : 0);

    if (rightScore !== leftScore) {
      return rightScore - leftScore;
    }

    const leftListPage = /\b(list of|history of)\b/i.test(left.title) ? 1 : 0;
    const rightListPage = /\b(list of|history of)\b/i.test(right.title) ? 1 : 0;
    if (leftListPage !== rightListPage) {
      return leftListPage - rightListPage;
    }

    return normalizeText(left.title).localeCompare(normalizeText(right.title));
  });
}

function rankFactSource(fact = {}) {
  const source = String(fact.source || '').toLowerCase();

  if (source.endsWith('.gov') || source.includes('.gov.')) {
    return 0;
  }
  if (source === 'en.wikipedia.org') {
    return 1;
  }
  if (source.includes('ballotpedia.org')) {
    return 2;
  }
  if (source.includes('britannica.com') || source.includes('encyclopedia.com')) {
    return 3;
  }

  return 4;
}

function orderFactsForMode(groundedFacts = [], searchMode = 'general_web') {
  const facts = [...groundedFacts];

  if (searchMode !== 'encyclopedic_fact') {
    return facts;
  }

  return facts.sort((left, right) => {
    const sourceDelta = rankFactSource(left) - rankFactSource(right);
    if (sourceDelta !== 0) {
      return sourceDelta;
    }

    return normalizeText(left.title).localeCompare(normalizeText(right.title));
  });
}

function extractCandidateNames(text = '') {
  const matches = String(text || '').match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g) || [];
  const blocked = new Set([
    'North Carolina',
    'Charlotte North',
    'City Government',
    'City Of Charlotte',
    'Attorney General',
    'General Assembly',
    'Department Of Justice',
    'United States Senate',
    'House Of Representatives',
  ]);

  return matches.filter((match) => {
    if (blocked.has(match)) {
      return false;
    }

    return !/\b(Wikipedia|Ballotpedia|Facebook|Justice|Department|Mayor|Attorney|General|Government|House|Senate)\b/.test(match);
  });
}

function findConsensusName(groundedFacts = []) {
  const counts = new Map();

  groundedFacts.slice(0, 4).forEach((fact) => {
    const candidates = [
      ...extractCandidateNames(fact.title),
      ...extractCandidateNames(fact.evidence),
    ];

    candidates.forEach((name) => {
      counts.set(name, (counts.get(name) || 0) + 1);
    });
  });

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] || '';
}

function extractDirectAnswerFromFact(fact = {}) {
  const evidence = String(fact.evidence || '').trim();
  if (!evidence) {
    return '';
  }

  const patterns = [
    /currently held by (?:democrat\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i,
    /current president of the united states is ([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/i,
    /current attorney general of north carolina is ([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/i,
    /serving as the \d+(?:st|nd|rd|th)? mayor of [^.]+ since \d{4}/i,
    /is an american politician serving as the \d+(?:st|nd|rd|th)? mayor of [^.]+ since \d{4}/i,
  ];

  const direct = evidence.match(patterns[0]) || evidence.match(patterns[1]) || evidence.match(patterns[2]);
  if (direct?.[1]) {
    return normalizeText(direct[1]);
  }

  if (patterns[3].test(evidence) || patterns[4].test(evidence)) {
    return extractCandidateNames(evidence)[0] || '';
  }

  return '';
}

function formatEncyclopedicAnswer({ query, groundedFacts }) {
  if (!groundedFacts.length) {
    return `I couldn't confidently confirm a factual answer for "${query}" from the available sources. If you want, I can try a narrower reference-style search.`;
  }

  const wikipediaFacts = selectWikipediaFacts(groundedFacts, query);
  const orderedFacts = orderFactsForMode(groundedFacts, 'encyclopedic_fact');
  const topFacts = (wikipediaFacts.length ? wikipediaFacts : orderedFacts).slice(0, 3);
  const primaryFact = topFacts[0] || null;
  const directAnswer = extractDirectAnswerFromFact(primaryFact || {});
  const consensusName = directAnswer || findConsensusName(topFacts);
  const lines = [];

  if (consensusName) {
    lines.push(`${consensusName} appears to be the answer for "${query}" based on the strongest reference result${topFacts.length > 1 ? 's' : ''}.`);
  } else {
    lines.push(wikipediaFacts.length
      ? `Here are the most likely Wikipedia article matches for "${query}":`
      : `Here are the strongest factual sources I found for "${query}":`);
  }

  lines.push('');

  topFacts.forEach((fact) => {
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
    lines.push(parts.join('\n'));
  });

  return lines.join('\n');
}

function formatPersonAnswer({ query, groundedFacts }) {
  if (!groundedFacts.length) {
    return `I couldn't confidently identify who "${query}" refers to from the available search results. If you want, give me a profession, company, or location and I can narrow it down.`;
  }

  const displayFacts = orderFactsForMode(groundedFacts, 'encyclopedic_fact').slice(0, 4);
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
    ? '\nIf you meant a different person with a similar name or title, tell me which field or organization and I can narrow it down.'
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
  const searchMode = grounded.searchMode || 'general_web';

  if (searchMode === 'encyclopedic_fact') {
    return formatEncyclopedicAnswer({ query, groundedFacts: grounded.groundedFacts });
  }

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

async function execute({ input = {}, config = {}, latestUserMessage = '' }) {
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
  const searchMode = String(
    input.searchMode
    || classifySearchIntent({
      latestUserMessage,
      query,
    }).mode
    || 'general_web'
  ).trim();
  const effectiveQuery = buildEffectiveSearchQuery(query, searchMode);
  const endpoint = new URL(resolveSearchEndpoint(normalizedConfig.baseUrl));
  endpoint.searchParams.set('q', effectiveQuery);
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
    effectiveQuery,
    searchMode,
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
  classifySearchIntent,
  buildGroundedResult,
  execute,
  formatResultForAssistant,
  getPromptDefinition,
  normalizeConfig,
  shouldAutoExecute,
  validateInvocationInput,
  validateConfig,
};
