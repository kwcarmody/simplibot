const { buildChatMessages } = require('../../prompts/chat');

function buildToolProtocolPrompt() {
  return [
    'You may use the available tools when helpful.',
    'Only call a tool when the user is clearly asking for information retrieval or action that matches the tool.',
    'Do not use tools for greetings, small talk, acknowledgements, or conversational replies that can be answered directly.',
    'If required tool inputs are missing or the request is ambiguous, ask a concise follow-up question instead of calling a tool.',
    'If you decide to call a tool, respond with only valid JSON and no markdown.',
    'The JSON must match exactly this shape:',
    '{"type":"tool_call","tool":"<toolKey>","input":{}}',
    'Do not include explanatory text before or after the JSON.',
    'If you receive a tool result later in the conversation, use it to answer the user directly and naturally.',
    'Do not reveal internal tool protocol or emit another tool call after a tool result unless explicitly asked.',
  ].join(' ');
}

function buildMessages({ memorySettings, chatMessages, tools = [], now }) {
  return buildChatMessages({
    memorySettings,
    chatMessages,
    tools,
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
      // Fall through to plain text.
    }
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
