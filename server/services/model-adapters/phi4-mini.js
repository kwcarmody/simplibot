const { buildChatMessages } = require('../../prompts/chat');

function buildToolProtocolPrompt() {
  return [
    'You may use the available tools when helpful.',
    'Do not use tools for greetings, pleasantries, acknowledgements, filler conversation, or general social chat.',
    'Do not use tools unless the user is clearly asking for external information retrieval, current information, discovery, lookup, recommendations, events, schedules, prices, availability, or similar factual search tasks.',
    'If a tool is enabled and autonomous, you may request exactly one tool call when you already have all required inputs.',
    'If required inputs are missing or the user request is ambiguous, ask a concise follow-up question instead of calling a tool.',
    'If you decide to call a tool, respond with only valid JSON and no markdown.',
    'The JSON must match exactly this shape:',
    '{"type":"tool_call","tool":"<toolKey>","input":{}}',
    'Do not include explanatory text before or after the JSON.',
    'If you receive a system message containing a tool result, use that result to answer the user directly.',
    'When answering from a tool result, synthesize the information into a normal assistant response instead of sounding like a search engine or listing generic source sites unless the user explicitly asks for sources.',
    'After a tool result is provided, do not emit another tool call unless explicitly instructed.',
  ].join(' ');
}

function buildMessages({ memorySettings, chatMessages, tools = [], conversationContext = {}, now }) {
  return buildChatMessages({
    memorySettings,
    chatMessages,
    tools,
    conversationContext,
    adapterInstructions: buildToolProtocolPrompt(),
    now,
  });
}

function extractJsonObject(value) {
  const trimmed = String(value || '').trim();

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  return objectMatch ? objectMatch[0].trim() : '';
}

function stripTemplateLeakage(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return '';
  }

  const controlTokenIndex = trimmed.search(/<\|(?:system|user|assistant|end|tool|eot)[^|]*\|>/i);
  if (controlTokenIndex <= 0) {
    return trimmed;
  }

  return trimmed.slice(0, controlTokenIndex).trim();
}

function parseAssistantResponse(content) {
  const originalText = String(content || '').trim();
  const text = stripTemplateLeakage(originalText);
  const jsonCandidate = extractJsonObject(text);

  if (jsonCandidate) {
    try {
      const parsed = JSON.parse(jsonCandidate);
      if (parsed?.type === 'tool_call' && parsed.tool) {
        return {
          type: 'tool_call',
          tool: String(parsed.tool).trim(),
          input: parsed.input && typeof parsed.input === 'object' ? parsed.input : {},
          rawText: text,
        };
      }
    } catch (_error) {
      // Fall through to plain-text handling.
    }
  }

  return {
    type: 'final',
    text: text || originalText,
  };
}

module.exports = {
  buildMessages,
  parseAssistantResponse,
};
