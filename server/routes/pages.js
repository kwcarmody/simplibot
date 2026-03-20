const express = require('express');
const { allRoutes, getFirstAuthorizedRoute, protectedRoutes, renderNotFound, renderRoute, renderSignin, routeFeatureMap } = require('../lib/render');

function createPageRouter() {
  const router = express.Router();

  router.get('/', (req, res) => {
    res.redirect('/signin');
  });

  router.get('/:route', (req, res, next) => {
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

    const requiredFeature = routeFeatureMap[route];
    const features = req.session.auth?.authorization?.features || {};
    if (requiredFeature && !features[requiredFeature]) {
      return res.redirect(getFirstAuthorizedRoute(features));
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
