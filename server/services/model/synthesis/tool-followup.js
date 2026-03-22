function buildToolResultFollowupPrompt(toolKey, options = {}) {
  if (toolKey === 'web-search') {
    const searchMode = String(options.searchMode || 'general_web').trim();
    return [
      'Use the grounded evidence above to answer the original user request.',
      'Answer only from the grounded_facts data.',
      'Do not use any raw search result text outside grounded_facts.',
      'Do not invent events, dates, venues, names, or sources that are not explicitly present in grounded_facts.',
      'Only state an event or fact if a grounded_facts item clearly supports it.',
      'If grounded_facts is empty or weak, say you could not confidently confirm the answer from the search results.',
      'Keep the answer factual, restrained, and concise.',
      searchMode === 'encyclopedic_fact'
        ? 'For encyclopedic or fact lookups, prefer a short direct answer first, then cite one or two strongest sources.'
        : 'When presenting multiple grounded items, format the answer as a short intro followed by a bullet list with one item per line.',
      'Each bullet must be directly grounded in one grounded_facts item and should include only the title plus a short supporting detail from its evidence field.',
      'When possible, include the source hostname or URL inline for each bullet.',
      'Do not summarize from general world knowledge; stay grounded in the provided evidence object.',
      'If the evidence is insufficient, say so plainly and end with one concise follow-up suggestion or clarifying question.',
      'Do not claim certainty when the retrieved evidence is incomplete.',
      'Do not emit a tool call.',
    ].join(' ');
  }

  return 'Use the tool result above to answer my last request. Do not emit a tool call.';
}

module.exports = {
  buildToolResultFollowupPrompt,
};
