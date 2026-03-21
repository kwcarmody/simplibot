function normalizeConfig(config = {}) {
  return { ...config };
}

function validateConfig() {
  return '';
}

module.exports = {
  execute: async () => {
    throw new Error('Automation execution is not implemented yet.');
  },
  getPromptDefinition: ({ tool }) => ({
    toolKey: tool.toolKey,
    name: tool.title,
    description: tool.description,
    autonomous: Boolean(tool.autonomous),
    inputs: [],
  }),
  normalizeConfig,
  validateConfig,
};
