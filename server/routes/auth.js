const express = require('express');
const {
  PB_API_BASE,
  PB_AUTH_COLLECTION,
  getActiveTenantContextForUser,
  getActiveTenantMembers,
  getAuthorizationRecord,
  getUserSettingsRecord,
  getUsersByIds,
  maskToken,
  normalizeFeatures,
  signInWithPassword,
} = require('../pocketbase');
const { mapTenantContextToSession, mapTenantMembersToSession, mapUserSettingsRecordToSettings } = require('../lib/session');
const { getFirstAuthorizedRoute, renderSignin } = require('../lib/render');

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function createAuthRouter() {
  const router = express.Router();

  router.get('/logout', (req, res) => {
    req.session.destroy(() => {
      res.clearCookie('pikori.sid');
      res.redirect('/signin');
    });
  });

  router.post('/signin', async (req, res) => {
    const body = req.body || {};
    const email = String(body.email || '').trim();
    const password = String(body.password || '');
    const isFetchRequest = req.get('X-Pikori-Auth') === 'fetch';

    if (!email || !password) {
      const message = 'Enter your email and password to continue.';
      if (isFetchRequest) {
        return res.status(400).json({ ok: false, error: message });
      }
      return renderSignin(res, { email, error: message });
    }

    try {
      const { client, authData } = await signInWithPassword(email, password);
      const authRecord = authData?.record || client.authStore?.record || authData;
      if (!authRecord?.id || !authRecord?.email) {
        throw new Error('PocketBase authentication succeeded without a usable user record.');
      }

      const authorizationRecord = await getAuthorizationRecord(client, authRecord.id);
      const userSettingsRecord = await getUserSettingsRecord(client, authRecord.id);
      const tenantContext = await getActiveTenantContextForUser(client, authRecord.id);

      if (!tenantContext) {
        throw new Error('Authenticated user does not have an active tenant membership.');
      }

      const tenantMembers = await getActiveTenantMembers(client, tenantContext.tenant.id);
      const tenantUserIds = tenantMembers
        .map((membership) => Array.isArray(membership.user) ? membership.user[0] : membership.user)
        .filter(Boolean);
      const tenantUsers = await getUsersByIds(client, tenantUserIds);

      const features = normalizeFeatures(authorizationRecord.features);
      const redirectTo = getFirstAuthorizedRoute(features);

      await regenerateSession(req);

      req.session.auth = {
        token: client.authStore.token,
        user: {
          id: authRecord.id,
          email: authRecord.email,
          name: authRecord.name || authRecord.email,
        },
        authorization: {
          id: authorizationRecord.id,
          role: authorizationRecord.role || 'default',
          features,
        },
        api: {
          endpoint: authorizationRecord.apiBase || PB_API_BASE,
          authCollection: PB_AUTH_COLLECTION,
          tokenPreview: maskToken(client.authStore.token),
        },
      };

      req.session.tenant = {
        ...mapTenantContextToSession(tenantContext),
        users: mapTenantMembersToSession(tenantMembers, tenantUsers),
      };

      req.session.ui = {
        settings: mapUserSettingsRecordToSettings(userSettingsRecord),
      };

      req.session.chat = { messages: [], pendingTodoFollowup: null, pendingTodoQuery: null };

      if (isFetchRequest) {
        return res.json({ ok: true, redirect: redirectTo });
      }
      return res.redirect(redirectTo);
    } catch (error) {
      console.error(error);
      const message = error?.status === 400 || error?.status === 401
        ? 'The email or password was not accepted.'
        : error?.message === 'Authenticated user does not have an active tenant membership.'
          ? 'Your account is signed in, but it is not assigned to an active tenant yet.'
          : 'Sign in failed. Check the PocketBase connection, tenant membership, and authorization record.';

      if (isFetchRequest) {
        return res.status(401).json({ ok: false, error: message });
      }

      return renderSignin(res, { email, error: message });
    }
  });

  return router;
}

module.exports = {
  createAuthRouter,
};
