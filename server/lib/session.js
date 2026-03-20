function getSessionSettings(req) {
  const uiSettings = req.session.ui?.settings || {};
  return {
    model: {
      provider: uiSettings.model?.provider || 'None',
      model: uiSettings.model?.model || '',
      endpoint: uiSettings.model?.endpoint || '',
      apiKey: uiSettings.model?.apiKey || '',
    },
    memory: {
      enabled: Boolean(uiSettings.memory?.enabled),
      maxSize: Number.isFinite(Number(uiSettings.memory?.maxSize)) ? Number(uiSettings.memory.maxSize) : 100,
      userName: uiSettings.memory?.userName || 'User',
      userDescription: uiSettings.memory?.userDescription || '',
      botName: uiSettings.memory?.botName || 'Pikori',
      botDescription: uiSettings.memory?.botDescription || "You're a helpful robot assistant.",
    },
  };
}

function ensureChatSession(req) {
  req.session.chat = req.session.chat || { messages: [] };
  req.session.chat.messages = Array.isArray(req.session.chat.messages) ? req.session.chat.messages : [];
  return req.session.chat;
}

function mapUserSettingsRecordToSettings(record) {
  if (!record) {
    return null;
  }

  return {
    model: {
      provider: record.modelProvider || 'None',
      model: record.modelName || '',
      endpoint: record.modelEndpoint || '',
      apiKey: record.modelApiToken || '',
    },
    memory: {
      enabled: Boolean(record.memoryEnabled),
      maxSize: Number.isFinite(Number(record.memoryMaxSize)) ? Number(record.memoryMaxSize) : 100,
      userName: record.memoryUserName || 'User',
      userDescription: record.memoryUserDescription || '',
      botName: record.memoryBotName || 'Pikori',
      botDescription: record.memoryBotDescription || "You're a helpful robot assistant.",
    },
  };
}

function formatChatTimestamp() {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

module.exports = {
  ensureChatSession,
  formatChatTimestamp,
  getSessionSettings,
  mapUserSettingsRecordToSettings,
};
