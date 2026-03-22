const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildGroundedResult,
  classifySearchIntent,
  formatResultForAssistant,
} = require('../server/services/tools/web-search');

const searchIntentCases = [
  { input: 'hi', mode: 'not_query', needsWebSearch: false },
  { input: "what's my name?", mode: 'not_query', needsWebSearch: false },
  { input: 'thanks', mode: 'not_query', needsWebSearch: false },
  { input: 'how are you?', mode: 'not_query', needsWebSearch: false },
  { input: 'what happened in 1994?', mode: 'known_static', needsWebSearch: false },
  { input: 'history of the Roman Empire', mode: 'known_static', needsWebSearch: false },
  { input: 'when was the Brooklyn Bridge built?', mode: 'known_static', needsWebSearch: false },
  { input: 'who is the mayor of Charlotte?', mode: 'encyclopedic_fact', needsWebSearch: true },
  { input: 'who is the current attorney general of North Carolina?', mode: 'encyclopedic_fact', needsWebSearch: true },
  { input: 'tell me about Ada Lovelace', mode: 'encyclopedic_fact', needsWebSearch: true },
  { input: 'what is Kubernetes?', mode: 'encyclopedic_fact', needsWebSearch: true },
  { input: 'concerts in Charlotte this weekend', mode: 'regional_live', needsWebSearch: true },
  { input: 'what events are happening in Charlotte tonight?', mode: 'regional_live', needsWebSearch: true },
  { input: 'things to do near me today', mode: 'regional_live', needsWebSearch: true },
  { input: 'what are the hours for the Mint Museum today?', mode: 'regional_live', needsWebSearch: true },
  { input: 'find open source CRM tools', mode: 'general_web', needsWebSearch: true },
  { input: 'look up open source CRM software', mode: 'general_web', needsWebSearch: true },
  { input: 'search for current pricing on iPhone 17', mode: 'general_web', needsWebSearch: true },
  { input: 'where can I buy a standing desk?', mode: 'general_web', needsWebSearch: true },
];

for (const { input, mode, needsWebSearch } of searchIntentCases) {
  test(`classifySearchIntent: "${input}" -> ${mode}`, () => {
    const result = classifySearchIntent({ latestUserMessage: input });
    assert.equal(result.mode, mode);
    assert.equal(result.needsWebSearch, needsWebSearch);
  });
}

const boundaryCases = [
  {
    input: 'remember that I like dark mode',
    assertion: (result) => {
      assert.equal(result.needsWebSearch, false);
    },
  },
  {
    input: 'add a task for tomorrow',
    assertion: (result) => {
      assert.equal(result.needsWebSearch, false);
    },
  },
  {
    input: 'remind me to call mom',
    assertion: (result) => {
      assert.equal(result.needsWebSearch, false);
    },
  },
  {
    input: 'what is the weather in Charlotte today?',
    assertion: (result) => {
      assert.notEqual(result.mode, 'not_query');
      assert.equal(result.needsWebSearch, true);
    },
  },
  {
    input: 'who is touring right now?',
    assertion: (result) => {
      assert.equal(result.needsWebSearch, true);
    },
  },
  {
    input: 'search',
    assertion: (result) => {
      assert.equal(result.needsWebSearch, false);
    },
  },
];

for (const { input, assertion } of boundaryCases) {
  test(`classifySearchIntent boundary case: "${input}"`, () => {
    const result = classifySearchIntent({ latestUserMessage: input });
    assertion(result);
  });
}

test('buildGroundedResult normalizes query, result count, and confidence', () => {
  const result = buildGroundedResult({
    result: {
      query: 'who is the mayor of Charlotte?',
      resultCount: 1,
      results: [
        {
          title: 'Mayor of Charlotte - Wikipedia',
          url: 'https://en.wikipedia.org/wiki/Mayor_of_Charlotte',
          source: 'en.wikipedia.org',
          description: 'The mayor of Charlotte is Vi Lyles, serving since 2017.',
          extraSnippets: [],
        },
      ],
    },
    latestUserMessage: 'who is the mayor of Charlotte?',
  });

  assert.equal(result.query, 'who is the mayor of Charlotte?');
  assert.equal(result.resultCount, 1);
  assert.equal(result.confidence, 'partial');
  assert.equal(result.groundedFacts.length, 1);
});

test('buildGroundedResult extracts grounded facts from descriptions and snippets', () => {
  const result = buildGroundedResult({
    result: {
      query: 'concerts in Charlotte this weekend',
      results: [
        {
          title: 'Charlotte Symphony',
          url: 'https://example.com/events',
          source: 'example.com',
          description: 'Weekend performances in Charlotte.',
          extraSnippets: ['Saturday at 8:00 PM at Knight Theater'],
        },
      ],
    },
    latestUserMessage: 'concerts in Charlotte this weekend',
  });

  assert.equal(result.groundedFacts.length, 1);
  assert.match(result.groundedFacts[0].evidence, /Charlotte|Saturday|Knight Theater/i);
});

test('buildGroundedResult deduplicates repeated facts', () => {
  const result = buildGroundedResult({
    result: {
      query: 'who is the mayor of Charlotte?',
      results: [
        {
          title: 'Mayor of Charlotte - Wikipedia',
          url: 'https://en.wikipedia.org/wiki/Mayor_of_Charlotte',
          source: 'en.wikipedia.org',
          description: 'The mayor of Charlotte is Vi Lyles, serving since 2017.',
          extraSnippets: [],
        },
        {
          title: 'Mayor of Charlotte | Wikipedia',
          url: 'https://en.wikipedia.org/wiki/Mayor_of_Charlotte#section',
          source: 'en.wikipedia.org',
          description: 'The mayor of Charlotte is Vi Lyles, serving since 2017.',
          extraSnippets: [],
        },
      ],
    },
    latestUserMessage: 'who is the mayor of Charlotte?',
  });

  assert.equal(result.groundedFacts.length, 1);
});

test('formatResultForAssistant returns sane fallback when no grounded facts exist', () => {
  const text = formatResultForAssistant({
    result: {
      query: 'obscure thing',
      results: [],
    },
    latestUserMessage: 'obscure thing',
  });

  assert.match(text, /couldn't|could not/i);
});

test('formatResultForAssistant formats encyclopedic answers sensibly', () => {
  const text = formatResultForAssistant({
    result: {
      query: 'who is the mayor of Charlotte?',
      searchMode: 'encyclopedic_fact',
      results: [
        {
          title: 'Mayor of Charlotte - Wikipedia',
          url: 'https://en.wikipedia.org/wiki/Mayor_of_Charlotte',
          source: 'en.wikipedia.org',
          description: 'The mayor of Charlotte is Vi Lyles, serving since 2017.',
          extraSnippets: [],
        },
      ],
    },
    latestUserMessage: 'who is the mayor of Charlotte?',
  });

  assert.match(text, /Vi Lyles|strongest reference result/i);
  assert.match(text, /Source:/i);
});

test('formatResultForAssistant formats event-style results sensibly', () => {
  const text = formatResultForAssistant({
    result: {
      query: 'concerts in Charlotte this weekend',
      searchMode: 'regional_live',
      results: [
        {
          title: 'Charlotte Concert Series',
          url: 'https://example.com/concerts',
          source: 'example.com',
          description: 'Concerts happening this weekend in Charlotte.',
          extraSnippets: ['Sunday at 7:30 PM featuring the civic orchestra'],
        },
      ],
    },
    latestUserMessage: 'concerts in Charlotte this weekend',
  });

  assert.match(text, /Here are the event-related results|strongest results/i);
  assert.match(text, /Charlotte Concert Series/i);
});
