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
