const express = require('express');
const { ensureChatSession, formatChatTimestamp, getSessionSettings } = require('../lib/session');
const { validateConfiguredChatModel } = require('../lib/validation');
const { generateChatReply } = require('../services/model');

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
    const modelSettings = settings.model || {};
    const memorySettings = settings.memory || {};
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
      const assistantText = await generateChatReply({ modelSettings, memorySettings, chatMessages: chatState.messages });
      const assistantMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        role: 'assistant',
        author: memorySettings.botName || 'Pikori',
        text: assistantText,
        time: formatChatTimestamp(),
      };

      chatState.messages.push(assistantMessage);
      return res.json({ ok: true, userMessage, assistantMessage, chatMessages: chatState.messages });
    } catch (error) {
      console.error(error);
      return res.status(502).json({ ok: false, error: 'The model could not respond right now.', chatMessages: chatState.messages });
    }
  });

  router.post('/chat/reset', (req, res) => {
    if (!req.session.auth?.token) {
      return res.status(401).json({ ok: false, error: 'Sign in required.' });
    }
    req.session.chat = { messages: [] };
    return res.json({ ok: true });
  });

  return router;
}

module.exports = {
  createChatRouter,
};
