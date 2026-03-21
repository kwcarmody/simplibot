const express = require('express');
const { getActiveTenantContextForUser } = require('../pocketbase');
const { createTodo, getTodoById, normalizeTodoPayload, updateTodo, validateTodoPayload } = require('../services/todos');

function createTodosRouter() {
  const router = express.Router();

  router.post('/todos/save', async (req, res) => {
    if (!req.session.auth?.token || !req.session.tenant?.id) {
      return res.status(401).redirect('/signin');
    }

    const currentUserId = req.session.auth.user.id;
    const payload = normalizeTodoPayload({
      tenantId: req.session.tenant.id,
      currentUserId,
      body: req.body || {},
      tenantTimeZone: req.session.tenant.timeZone,
    });

    const validationError = validateTodoPayload(payload);
    if (validationError) {
      return res.status(400).redirect('/todos');
    }

    if (payload.ownerType === 'user' && payload.ownerUser !== currentUserId) {
      try {
        const tenantContext = await getActiveTenantContextForUser(
          require('../pocketbase').createClient(req.session.auth.token),
          payload.ownerUser
        );
        if (!tenantContext || tenantContext.tenant.id !== req.session.tenant.id) {
          return res.status(400).redirect('/todos');
        }
      } catch (_error) {
        return res.status(400).redirect('/todos');
      }
    }

    const todoId = String(req.body.todoId || '').trim();

    try {
      if (todoId) {
        const existing = await getTodoById({ authToken: req.session.auth.token, todoId });
        const existingOwnerUser = Array.isArray(existing.ownerUser) ? existing.ownerUser[0] : existing.ownerUser;
        if (existing.tenant !== req.session.tenant.id) {
          return res.status(403).redirect('/todos');
        }
        if (existing.ownerType !== 'user' || existingOwnerUser !== currentUserId) {
          return res.status(403).redirect('/todos');
        }
        await updateTodo({ authToken: req.session.auth.token, todoId, payload });
      } else {
        await createTodo({ authToken: req.session.auth.token, payload });
      }
      return res.redirect('/todos');
    } catch (error) {
      console.error(error);
      return res.status(502).redirect('/todos');
    }
  });

  return router;
}

module.exports = {
  createTodosRouter,
};
