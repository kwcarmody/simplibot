const express = require('express');
const { allRoutes, getFirstAuthorizedRoute, hasTenantSession, protectedRoutes, redirectToSafeEntry, renderNotFound, renderRoute, renderSignin, routeFeatureMap } = require('../lib/render');
const { listTodosForTenant } = require('../services/todos');

function createPageRouter() {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.redirect('/signin');
  });

  router.get('/:route', async (req, res, next) => {
    const route = req.params.route;
    if (!allRoutes.has(route)) {
      return next();
    }

    if (route === 'signin') {
      return renderSignin(res, {});
    }

    if (protectedRoutes.has(route) && !req.session.auth?.token) {
      return res.redirect('/signin');
    }

    if (protectedRoutes.has(route) && !hasTenantSession(req)) {
      return redirectToSafeEntry(req, res);
    }

    const requiredFeature = routeFeatureMap[route];
    const features = req.session.auth?.authorization?.features || {};
    if (requiredFeature && !features[requiredFeature]) {
      return res.redirect(getFirstAuthorizedRoute(features));
    }

    if (route === 'todos') {
      try {
        const todos = await listTodosForTenant({
          authToken: req.session.auth.token,
          tenantId: req.session.tenant.id,
        });
        const isNewTodo = req.query.todo === 'new';
        const selectedTodo = isNewTodo ? {
          id: '',
          title: '',
          status: 'ToDo',
          dueDateInput: '',
          details: '',
          ownerType: 'user',
          ownerUser: req.session.auth.user.id,
          ownerLabel: '',
        } : (todos.find((item) => item.id === req.query.todo) || null);
        req.todosPage = {
          todos,
          selectedTodo,
          isNewTodo,
        };
      } catch (error) {
        console.error(error);
        req.todosPage = { todos: [] };
      }
    }

    return renderRoute(req, res, route);
  });

  router.use((req, res) => {
    renderNotFound(res);
  });

  return router;
}

module.exports = {
  createPageRouter,
};
