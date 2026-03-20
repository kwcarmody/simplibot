const express = require('express');
const { getDocBySlug, getDocsLandingDocument, listDocs } = require('../services/docs');
const { renderNotFound, renderRoute } = require('../lib/render');

function createDocsRouter() {
  const router = express.Router();

  const ensureDocsAccess = (req, res) => {
    if (!req.session.auth?.token) {
      res.redirect('/signin');
      return false;
    }

    if (!req.session.auth?.authorization?.features?.docs) {
      res.redirect('/home');
      return false;
    }

    return true;
  };

  router.get('/docs', (req, res) => {
    if (!ensureDocsAccess(req, res)) return;

    req.docsPage = {
      docsList: listDocs(),
      selectedDoc: getDocsLandingDocument(),
    };
    return renderRoute(req, res, 'docs');
  });

  router.get('/docs/:slug', (req, res) => {
    if (!ensureDocsAccess(req, res)) return;

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
