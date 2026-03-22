const express = require('express');
const { ensureChatSession, formatChatTimestamp, getSessionSettings } = require('../lib/session');
const { validateConfiguredChatModel } = require('../lib/validation');
const { generateChatReply } = require('../services/model');
const { resolveModelSettingsForRequest } = require('../services/model-settings-cache');
const { loadToolsForTenantUser } = require('../tools/loader');

function createChatRouter() {
  const router = express.Router();

  router.post('/chat/send', async (req, res) => {
    if (!req.session.auth?.token) {
      return res.status(401).json({ ok: false, error: 'Sign in required.' });
    }

    const messageText = String(req.body.message || '').trim();
    if (!messageText) {
      return res.status(400).json({ ok: false, error: 'Type a message first.' });
    }

    const settings = getSessionSettings(req);
    const sessionModelSettings = settings.model || {};
    const memorySettings = settings.memory || {};

    let modelSettings = sessionModelSettings;
    if (sessionModelSettings.selectedId) {
      try {
        modelSettings = await resolveModelSettingsForRequest({
          authToken: req.session.auth.token,
          modelId: sessionModelSettings.selectedId,
        }) || sessionModelSettings;
      } catch (error) {
        console.error(error);
        return res.status(502).json({ ok: false, error: 'The selected model configuration could not be loaded.' });
      }
    }

    const modelValidationError = validateConfiguredChatModel(modelSettings);
    if (modelValidationError) {
      return res.status(400).json({ ok: false, error: modelValidationError });
    }

    const chatState = ensureChatSession(req);
    const userMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      role: 'user',
      author: memorySettings.userName || 'User',
      text: messageText,
      time: formatChatTimestamp(),
    };

    chatState.messages.push(userMessage);

    try {
      const tools = await loadToolsForTenantUser({
        authToken: req.session.auth.token,
        tenantId: req.session.tenant.id,
        userId: req.session.auth.user.id,
      });
      const assistantResult = await generateChatReply({
        modelSettings,
        memorySettings,
        chatMessages: chatState.messages,
        tools,
        conversationContext: {
          pendingTodoFollowup: chatState.pendingTodoFollowup || null,
          pendingTodoQuery: chatState.pendingTodoQuery || null,
        },
        toolContext: {
          authToken: req.session.auth.token,
          tenantId: req.session.tenant.id,
          currentUserId: req.session.auth.user.id,
          tenantTimeZone: req.session.tenant.timeZone,
          pendingTodoFollowup: chatState.pendingTodoFollowup || null,
          pendingTodoQuery: chatState.pendingTodoQuery || null,
        },
      });
      if (Object.prototype.hasOwnProperty.call(assistantResult, 'toolStatePatch')) {
        const patch = assistantResult.toolStatePatch;
        if (patch === null) {
          chatState.pendingTodoFollowup = null;
          chatState.pendingTodoQuery = null;
        } else if (patch && (patch.todoId || patch.action === 'awaiting_due_date')) {
          chatState.pendingTodoFollowup = patch;
          chatState.pendingTodoQuery = null;
        } else if (patch && typeof patch === 'object') {
          if (Object.prototype.hasOwnProperty.call(patch, 'pendingTodoFollowup')) {
            chatState.pendingTodoFollowup = patch.pendingTodoFollowup || null;
          }
          if (Object.prototype.hasOwnProperty.call(patch, 'pendingTodoQuery')) {
            chatState.pendingTodoQuery = patch.pendingTodoQuery || null;
          }
        }
      }
      const assistantMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        role: 'assistant',
        author: memorySettings.botName || 'Pikori',
        text: assistantResult.text,
        time: formatChatTimestamp(),
      };

      chatState.messages.push(assistantMessage);
      return res.json({
        ok: true,
        userMessage,
        assistantMessage,
        chatMessages: chatState.messages,
        debug: assistantResult.debug || null,
      });
    } catch (error) {
      console.error(error);
      return res.status(502).json({ ok: false, error: 'The model could not respond right now.', chatMessages: chatState.messages });
    }
  });

  router.post('/chat/reset', (req, res) => {
    if (!req.session.auth?.token) {
      return res.status(401).json({ ok: false, error: 'Sign in required.' });
    }
    req.session.chat = { messages: [], pendingTodoFollowup: null, pendingTodoQuery: null };
    return res.json({ ok: true });
  });

  return router;
}

module.exports = {
  createChatRouter,
};
