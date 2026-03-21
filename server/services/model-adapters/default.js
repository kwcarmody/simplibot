const { buildChatMessages } = require('../../prompts/chat');

function buildToolProtocolPrompt() {
  return [
    'You may use the available tools when helpful.',
    'Do not use tools for greetings, acknowledgements, filler conversation, or simple replies you can answer directly.',
    'Use a tool only when the user is clearly asking for information retrieval or an action that matches one of the available tools.',
    'If required tool inputs are missing or the request is ambiguous, ask a concise follow-up question instead of calling a tool.',
    'Never claim that you created, updated, archived, deleted, searched, or fetched tasks unless you first emit the corresponding tool call and later receive a tool result.',
    'If you decide to call a tool, respond with only valid JSON and no markdown.',
    'The JSON must match exactly this shape:',
    '{"type":"tool_call","tool":"<toolKey>","input":{}}',
    'Do not include explanatory text before or after the JSON.',
    'If you receive a tool result later in the conversation, use it to answer the user directly.',
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

function extractBracketToolCall(value) {
  const trimmed = String(value || '').trim();
  const match = trimmed.match(/\[TOOL_CALL\]\s*([\s\S]*?)\s*\[\/TOOL_CALL\]/i);
  if (match?.[1]) {
    return match[1].trim();
  }

  const minimaxMatch = trimmed.match(/<minimax:tool_call>\s*([\s\S]*?)\s*<\/(?:minimax:tool_call|invoke)>/i);
  return minimaxMatch?.[1] ? minimaxMatch[1].trim() : '';
}

function parseBracketToolCall(value) {
  const normalized = String(value || '').trim();
  if (!normalized) {
    return null;
  }

  const toolMatch = normalized.match(/tool\s*(?:=|=>)\s*"([^"]+)"/i);
  const inputMatch = normalized.match(/input\s*(?:=|=>)\s*(\{[\s\S]*\})/i);
  if (!toolMatch?.[1] || !inputMatch?.[1]) {
    return null;
  }

  try {
    return {
      type: 'tool_call',
      tool: String(toolMatch[1]).trim(),
      input: JSON.parse(inputMatch[1]),
      rawText: normalized,
    };
  } catch (_error) {
    return null;
  }
}

function parseAssistantResponse(content) {
  const text = String(content || '').trim();
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

  const bracketToolCall = parseBracketToolCall(extractBracketToolCall(text));
  if (bracketToolCall) {
    return bracketToolCall;
  }

  return {
    type: 'final',
    text,
  };
}

module.exports = {
  buildMessages,
  parseAssistantResponse,
};
