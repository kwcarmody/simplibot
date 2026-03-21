function validateModelSettings({ modelId, provider, model, endpoint, apiKey }) {
  if (!modelId && (!provider || provider === 'None')) {
    return 'Choose a model before saving.';
  }
  if (!modelId && !model) {
    return 'Choose a model before saving.';
  }
  if (!modelId && !endpoint) {
    return 'API Endpoint is required.';
  }
  if (!modelId && provider === 'Ollama-Cloud' && !apiKey) {
    return 'API Token is required for cloud models.';
  }
  return '';
}

function validateConfiguredChatModel({ provider, model, endpoint, apiKey }) {
  if (provider === 'None' || !provider) {
    return 'Configure a model in Settings before using Chat.';
  }
  if (!model || !endpoint) {
    return 'Complete the model configuration in Settings before using Chat.';
  }
  if (provider === 'Ollama-Cloud' && !apiKey) {
    return 'Add the API Token in Settings before using Chat.';
  }
  return '';
}

function validateMemorySettings({ maxSize, userName, botName, botDescription }) {
  if (!Number.isInteger(maxSize) || maxSize <= 0) {
    return 'Memory max size must be a positive whole number.';
  }
  if (!userName) {
    return 'User name is required.';
  }
  if (!botName) {
    return 'Bot name is required.';
  }
  if (!botDescription) {
    return 'Bot description is required.';
  }
  return '';
}

module.exports = {
  validateConfiguredChatModel,
  validateMemorySettings,
  validateModelSettings,
};
