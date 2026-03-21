const PocketBaseModule = require("pocketbase/cjs");

const PocketBase = PocketBaseModule.default || PocketBaseModule;

const PB_API_BASE = process.env.PB_API_BASE || "https://api.people.engineering";
const PB_AUTH_COLLECTION = process.env.PB_AUTH_COLLECTION || "users";
const PB_AUTHZ_COLLECTION = process.env.PB_AUTHZ_COLLECTION || "authorizations";
const PB_USER_SETTINGS_COLLECTION = process.env.PB_USER_SETTINGS_COLLECTION || "user_settings";
const PB_MODELS_COLLECTION = process.env.PB_MODELS_COLLECTION || "models";
const PB_TENANTS_COLLECTION = process.env.PB_TENANTS_COLLECTION || "tenants";
const PB_TENANT_MEMBERSHIPS_COLLECTION = process.env.PB_TENANT_MEMBERSHIPS_COLLECTION || "tenant_memberships";

const DEFAULT_FEATURES = {
  home: false,
  chat: false,
  tools: false,
  todos: false,
  reports: false,
  channels: false,
  settings: false,
  profile: false,
  docs: false,
};

function createClient(token) {
  const client = new PocketBase(PB_API_BASE);
  if (token) {
    client.authStore.save(token);
  }
  return client;
}

async function signInWithPassword(email, password) {
  const client = createClient();
  const authData = await client.collection(PB_AUTH_COLLECTION).authWithPassword(email, password);
  return {
    client,
    authData,
  };
}

async function getAuthorizationRecord(client, userId) {
  return client.collection(PB_AUTHZ_COLLECTION).getFirstListItem(`user = "${userId}"`);
}

async function getUserSettingsRecord(client, userId) {
  try {
    return await client.collection(PB_USER_SETTINGS_COLLECTION).getFirstListItem(`user = "${userId}"`, {
      expand: 'model',
    });
  } catch (error) {
    if (error?.status === 404) {
      return null;
    }
    throw error;
  }
}

async function listModelRecords(client) {
  const records = await client.collection(PB_MODELS_COLLECTION).getFullList({
    sort: 'name,created',
  });
  return Array.isArray(records) ? records : [];
}

async function getTenantMembershipsForUser(client, userId) {
  const records = await client.collection(PB_TENANT_MEMBERSHIPS_COLLECTION).getFullList({
    filter: `user = "${userId}" && active = true`,
    sort: 'created',
  });
  return Array.isArray(records) ? records : [];
}

async function getActiveTenantMembers(client, tenantId) {
  const records = await client.collection(PB_TENANT_MEMBERSHIPS_COLLECTION).getFullList({
    filter: `tenant = "${tenantId}" && active = true`,
    sort: 'created',
  });
  return Array.isArray(records) ? records : [];
}

async function getUsersByIds(client, userIds = []) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (!ids.length) {
    return [];
  }

  const filter = ids.map((id) => `id = "${id}"`).join(' || ');
  const records = await client.collection(PB_AUTH_COLLECTION).getFullList({ filter });
  return Array.isArray(records) ? records : [];
}

async function getTenantRecord(client, tenantId) {
  return client.collection(PB_TENANTS_COLLECTION).getOne(tenantId);
}

async function getActiveTenantContextForUser(client, userId) {
  const memberships = await getTenantMembershipsForUser(client, userId);
  if (!memberships.length) {
    return null;
  }

  const membership = memberships[0];
  const tenant = await getTenantRecord(client, membership.tenant);

  return {
    membership,
    tenant,
  };
}

async function saveUserSettingsRecord(client, userId, payload) {
  const existing = await getUserSettingsRecord(client, userId);
  const body = {
    user: userId,
    ...payload,
  };

  if (existing?.id) {
    return client.collection(PB_USER_SETTINGS_COLLECTION).update(existing.id, body);
  }

  return client.collection(PB_USER_SETTINGS_COLLECTION).create(body);
}

function normalizeFeatures(features) {
  if (!features || typeof features !== "object") {
    return { ...DEFAULT_FEATURES };
  }

  return {
    ...DEFAULT_FEATURES,
    ...Object.fromEntries(
      Object.entries(features).map(([key, value]) => [key, Boolean(value)])
    ),
  };
}

function maskToken(token) {
  if (!token) {
    return "Not available";
  }
  if (token.length <= 12) {
    return `${token.slice(0, 4)}...`;
  }
  return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

module.exports = {
  PB_API_BASE,
  PB_AUTH_COLLECTION,
  PB_AUTHZ_COLLECTION,
  PB_USER_SETTINGS_COLLECTION,
  PB_MODELS_COLLECTION,
  PB_TENANTS_COLLECTION,
  PB_TENANT_MEMBERSHIPS_COLLECTION,
  createClient,
  signInWithPassword,
  getAuthorizationRecord,
  getUserSettingsRecord,
  listModelRecords,
  getTenantMembershipsForUser,
  getActiveTenantMembers,
  getUsersByIds,
  getTenantRecord,
  getActiveTenantContextForUser,
  saveUserSettingsRecord,
  normalizeFeatures,
  maskToken,
};
