const express = require('express');
const { getDocBySlug, getDocsLandingDocument, listDocs } = require('../services/docs');
const { renderNotFound, renderRoute } = require('../lib/render');

function createDocsRouter() {
  const router = express.Router();

  const ensureSignedIn = (req, res) => {
    if (!req.session.auth?.token) {
      res.redirect('/signin');
      return false;
    }
    return true;
  };

  router.get('/docs', (req, res) => {
    if (!ensureSignedIn(req, res)) return;

    req.docsPage = {
      docsList: listDocs(),
      selectedDoc: getDocsLandingDocument(),
    };
    return renderRoute(req, res, 'docs');
  });

  router.get('/docs/:slug', (req, res) => {
    if (!ensureSignedIn(req, res)) return;

    const selectedDoc = getDocBySlug(req.params.slug);
    if (!selectedDoc) {
      return renderNotFound(res);
    }

    req.docsPage = {
      docsList: listDocs(),
      selectedDoc,
    };
    return renderRoute(req, res, 'docs');
  });

  return router;
}

module.exports = {
  createDocsRouter,
};
