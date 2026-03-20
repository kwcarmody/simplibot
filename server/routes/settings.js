const express = require('express');
const { createClient, saveUserSettingsRecord } = require('../pocketbase');
const { validateMemorySettings, validateModelSettings } = require('../lib/validation');
const { testModelConnection } = require('../services/model');

function createSettingsRouter() {
  const router = express.Router();

  router.post('/settings/model', async (req, res) => {
    if (!req.session.auth?.token) {
      return res.status(401).json({ ok: false, error: 'Sign in required.' });
    }

    const provider = String(req.body.provider || 'None').trim();
    const model = String(req.body.model || '').trim();
    const endpoint = String(req.body.endpoint || '').trim();
    const apiKey = String(req.body.apiKey || '').trim();

    const validationError = validateModelSettings({ provider, model, endpoint, apiKey });
    if (validationError) {
      return res.status(400).json({ ok: false, error: validationError });
    }

    try {
      await testModelConnection({ provider, model, endpoint, apiKey });
      const client = createClient(req.session.auth.token);
      await saveUserSettingsRecord(client, req.session.auth.user.id, {
        modelProvider: provider,
        modelName: model,
        modelEndpoint: endpoint,
        modelApiToken: apiKey,
      });

      req.session.ui = {
        ...(req.session.ui || {}),
        settings: {
          ...((req.session.ui && req.session.ui.settings) || {}),
          model: { provider, model, endpoint, apiKey },
        },
      };

      return res.json({ ok: true, message: 'Model connected.' });
    } catch (error) {
      return res.status(502).json({ ok: false, error: 'Model connection failed.', details: error.message });
    }
  });

  router.post('/settings/memory', async (req, res) => {
    if (!req.session.auth?.token) {
      return res.status(401).json({ ok: false, error: 'Sign in required.' });
    }

    const enabled = String(req.body.enabled || '') === 'true';
    const maxSize = Number.parseInt(String(req.body.maxSize || ''), 10);
    const userName = String(req.body.userName || '').trim();
    const userDescription = String(req.body.userDescription || '').trim();
    const botName = String(req.body.botName || '').trim();
    const botDescription = String(req.body.botDescription || '').trim();

    const validationError = validateMemorySettings({ maxSize, userName, botName, botDescription });
    if (validationError) {
      return res.status(400).json({ ok: false, error: validationError });
    }

    try {
      const client = createClient(req.session.auth.token);
      await saveUserSettingsRecord(client, req.session.auth.user.id, {
        memoryEnabled: enabled,
        memoryMaxSize: maxSize,
        memoryUserName: userName,
        memoryUserDescription: userDescription,
        memoryBotName: botName,
        memoryBotDescription: botDescription,
      });

      req.session.ui = {
        ...(req.session.ui || {}),
        settings: {
          ...((req.session.ui && req.session.ui.settings) || {}),
          memory: { enabled, maxSize, userName, userDescription, botName, botDescription },
        },
      };

      return res.json({ ok: true, message: 'Memory settings saved.' });
    } catch (error) {
      console.error(error);
      return res.status(502).json({ ok: false, error: 'Memory settings could not be saved.' });
    }
  });

  return router;
}

module.exports = {
  createSettingsRouter,
};
