const { createClient } = require('../pocketbase');

const PB_TOOL_DEFINITIONS_COLLECTION = process.env.PB_TOOL_DEFINITIONS_COLLECTION || 'tool_definitions';
const PB_TENANT_TOOLS_COLLECTION = process.env.PB_TENANT_TOOLS_COLLECTION || 'tenant_tools';
const PB_USER_TOOL_PREFERENCES_COLLECTION = process.env.PB_USER_TOOL_PREFERENCES_COLLECTION || 'user_tool_preferences';

function normalizeJson(value, fallback = {}) {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return fallback;
    }
  }

  if (typeof value === 'object') {
    return value;
  }

  return fallback;
}

async function listToolDefinitions({ authToken }) {
  const client = createClient(authToken);
  const records = await client.collection(PB_TOOL_DEFINITIONS_COLLECTION).getFullList({
    sort: '+sortOrder,+created',
  });

  return (records || []).map((record) => ({
    ...record,
    configSchema: normalizeJson(record.configSchema, { fields: [] }),
  }));
}

async function listTenantTools({ authToken, tenantId }) {
  const client = createClient(authToken);
  const records = await client.collection(PB_TENANT_TOOLS_COLLECTION).getFullList({
    filter: `tenant = "${tenantId}"`,
    sort: 'created',
  });

  return (records || []).map((record) => ({
    ...record,
    config: normalizeJson(record.config, {}),
  }));
}

async function getTenantTool({ authToken, tenantId, toolId }) {
  const client = createClient(authToken);

  try {
    const record = await client.collection(PB_TENANT_TOOLS_COLLECTION).getFirstListItem(
      `tenant = "${tenantId}" && tool = "${toolId}"`
    );

    return {
      ...record,
      config: normalizeJson(record.config, {}),
    };
  } catch (error) {
    if (error?.status === 404) {
      return null;
    }

    throw error;
  }
}

async function listUserToolPreferences({ authToken, userId, tenantId }) {
  const client = createClient(authToken);
  const records = await client.collection(PB_USER_TOOL_PREFERENCES_COLLECTION).getFullList({
    filter: `user = "${userId}" && tenant = "${tenantId}"`,
    sort: 'created',
  });

  return Array.isArray(records) ? records : [];
}

async function saveUserToolPreference({ authToken, userId, tenantId, toolId, enabled }) {
  const client = createClient(authToken);
  let existing = null;

  try {
    existing = await client.collection(PB_USER_TOOL_PREFERENCES_COLLECTION).getFirstListItem(
      `user = "${userId}" && tenant = "${tenantId}" && tool = "${toolId}"`
    );
  } catch (error) {
    if (error?.status !== 404) {
      throw error;
    }
  }

  const payload = {
    user: userId,
    tenant: tenantId,
    tool: toolId,
    enabled: Boolean(enabled),
  };

  if (existing?.id) {
    return client.collection(PB_USER_TOOL_PREFERENCES_COLLECTION).update(existing.id, payload);
  }

  return client.collection(PB_USER_TOOL_PREFERENCES_COLLECTION).create(payload);
}

module.exports = {
  getTenantTool,
  listTenantTools,
  listToolDefinitions,
  listUserToolPreferences,
  normalizeJson,
  saveUserToolPreference,
};
