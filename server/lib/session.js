function getSessionSettings(req) {
  const uiSettings = req.session.ui?.settings || {};
  return {
    model: {
      selectedId: uiSettings.model?.selectedId || '',
      provider: uiSettings.model?.provider || 'None',
      model: uiSettings.model?.model || '',
      modelName: uiSettings.model?.modelName || '',
      endpoint: uiSettings.model?.endpoint || '',
      apiKey: uiSettings.model?.apiKey || '',
      adapterKey: uiSettings.model?.adapterKey || '',
      apiType: uiSettings.model?.apiType || '',
      contextWindow: Number.isFinite(Number(uiSettings.model?.contextWindow)) ? Number(uiSettings.model.contextWindow) : 0,
      maxTokens: Number.isFinite(Number(uiSettings.model?.maxTokens)) ? Number(uiSettings.model.maxTokens) : 0,
      thinking: Boolean(uiSettings.model?.thinking),
      supportsTools: Boolean(uiSettings.model?.supportsTools),
      input: uiSettings.model?.input || '',
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
  req.session.chat = req.session.chat || { messages: [], pendingTodoFollowup: null, pendingTodoQuery: null };
  req.session.chat.messages = Array.isArray(req.session.chat.messages) ? req.session.chat.messages : [];
  req.session.chat.pendingTodoFollowup = req.session.chat.pendingTodoFollowup || null;
  req.session.chat.pendingTodoQuery = req.session.chat.pendingTodoQuery || null;
  return req.session.chat;
}

function mapUserSettingsRecordToSettings(record) {
  if (!record) {
    return null;
  }

  const relatedModel = record.expand?.model || null;

  return {
    model: {
      selectedId: record.model || relatedModel?.id || '',
      provider: relatedModel?.provider || record.modelProvider || 'None',
      model: relatedModel?.modelId || record.modelName || '',
      modelName: relatedModel?.name || relatedModel?.modelId || record.modelName || '',
      endpoint: relatedModel?.baseUrl || record.modelEndpoint || '',
      apiKey: relatedModel?.apiKey || record.modelApiToken || '',
      adapterKey: relatedModel?.adapterKey || '',
      apiType: relatedModel?.apiType || '',
      contextWindow: Number.isFinite(Number(relatedModel?.contextWindow)) ? Number(relatedModel.contextWindow) : 0,
      maxTokens: Number.isFinite(Number(relatedModel?.maxTokens)) ? Number(relatedModel.maxTokens) : 0,
      thinking: Boolean(relatedModel?.thinking),
      supportsTools: Boolean(relatedModel?.supportsTools),
      input: relatedModel?.input || '',
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


function mapTenantContextToSession(tenantContext) {
  if (!tenantContext?.membership || !tenantContext?.tenant) {
    return null;
  }

  return {
    id: tenantContext.tenant.id,
    name: tenantContext.tenant.name || '',
    slug: tenantContext.tenant.slug || '',
    status: tenantContext.tenant.status || 'active',
    timeZone: tenantContext.tenant.timeZone || 'EST/EDT',
    role: tenantContext.membership.role || 'member',
    membershipId: tenantContext.membership.id,
    ownerId: Array.isArray(tenantContext.tenant.owner)
      ? tenantContext.tenant.owner[0] || null
      : tenantContext.tenant.owner || null,
  };
}

function mapTenantMembersToSession(memberships = [], users = []) {
  const userDirectory = new Map(
    users
      .filter((user) => user?.id)
      .map((user) => [user.id, user])
  );

  return memberships
    .map((membership) => {
      const userId = Array.isArray(membership.user) ? membership.user[0] : membership.user;
      const user = userDirectory.get(userId);
      const name = user?.name || user?.email || '';

      if (!userId) {
        return null;
      }

      return {
        id: userId,
        name,
        email: user?.email || '',
        role: membership.role || 'member',
      };
    })
    .filter(Boolean);
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
  mapTenantMembersToSession,
  mapTenantContextToSession,
  mapUserSettingsRecordToSettings,
};
