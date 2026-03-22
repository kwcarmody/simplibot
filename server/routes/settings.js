const express = require('express');
const { createClient, listModelRecords, saveUserSettingsRecord } = require('../pocketbase');
const { validateMemorySettings, validateModelSettings } = require('../lib/validation');
const { testModelConnection } = require('../services/model');
const { invalidateModelSettingsCache, mapModelRecordToSessionSettings } = require('../services/model-settings-cache');

function createSettingsRouter() {
  const router = express.Router();

  router.post('/settings/model', async (req, res) => {
    if (!req.session.auth?.token) {
      return res.status(401).json({ ok: false, error: 'Sign in required.' });
    }

    const selectedModelId = String(req.body.modelId || '').trim();

    const validationError = validateModelSettings({ modelId: selectedModelId });
    if (validationError) {
      return res.status(400).json({ ok: false, error: validationError });
    }

    try {
      const client = createClient(req.session.auth.token);
      const availableModels = await listModelRecords(client);
      const selectedModel = availableModels.find((record) => record.id === selectedModelId);

      if (!selectedModel) {
        return res.status(400).json({ ok: false, error: 'Selected model could not be found.' });
      }

      await testModelConnection({
        provider: selectedModel.provider,
        model: selectedModel.modelId,
        endpoint: selectedModel.baseUrl,
        apiKey: selectedModel.apiKey,
        apiType: selectedModel.apiType,
      });

      await saveUserSettingsRecord(client, req.session.auth.user.id, {
        model: selectedModel.id,
      });
      invalidateModelSettingsCache(selectedModel.id);

      req.session.ui = {
        ...(req.session.ui || {}),
        settings: {
          ...((req.session.ui && req.session.ui.settings) || {}),
          model: mapModelRecordToSessionSettings(selectedModel),
        },
      };

      return res.json({
        ok: true,
        message: 'Model connected.',
        model: req.session.ui.settings.model,
      });
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
