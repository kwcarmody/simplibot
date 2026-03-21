const TOOL_REGISTRY = {
  'web-search': {
    toolKey: 'web-search',
    aliases: ['web_search', 'websearch', 'search'],
    uiId: 'web-search',
    serviceKey: 'web-search',
    defaultName: 'Web Search',
    defaultDescription: 'Pull external context into agent decisions.',
  },
  calendar: {
    toolKey: 'calendar',
    aliases: [],
    uiId: 'calendar',
    serviceKey: 'calendar',
    defaultName: 'Calendar',
    defaultDescription: 'Schedule work blocks and reminder prompts.',
  },
  filesystem: {
    toolKey: 'filesystem',
    aliases: ['file-system'],
    uiId: 'filesystem',
    serviceKey: 'filesystem',
    defaultName: 'Filesystem',
    defaultDescription: 'Read and update approved local workspace files.',
  },
  crm: {
    toolKey: 'crm',
    aliases: [],
    uiId: 'crm',
    serviceKey: 'crm',
    defaultName: 'CRM',
    defaultDescription: 'Reference account notes and customer contact state.',
  },
  automation: {
    toolKey: 'automation',
    aliases: [],
    uiId: 'automation',
    serviceKey: 'automation',
    defaultName: 'Automation',
    defaultDescription: 'Trigger recurring workflows and asynchronous jobs.',
  },
  monitoring: {
    toolKey: 'monitoring',
    aliases: [],
    uiId: 'monitoring',
    serviceKey: 'monitoring',
    defaultName: 'Monitoring',
    defaultDescription: 'Inspect incidents, logs, and service health snapshots.',
  },
};

function normalizeToolToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function findRegistryEntryByToolKey(toolKey) {
  const normalizedTarget = normalizeToolToken(toolKey);
  return Object.values(TOOL_REGISTRY).find((entry) => {
    const candidates = [entry.toolKey, ...(entry.aliases || [])];
    return candidates.some((candidate) => normalizeToolToken(candidate) === normalizedTarget);
  }) || null;
}

module.exports = {
  TOOL_REGISTRY,
  findRegistryEntryByToolKey,
  normalizeToolToken,
};
