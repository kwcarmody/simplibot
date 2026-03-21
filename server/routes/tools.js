const express = require('express');
const { getTenantTool, saveUserToolPreference } = require('../services/tool-definitions');

function createToolsRouter() {
  const router = express.Router();

  router.post('/tools/preferences', async (req, res) => {
    if (!req.session.auth?.token || !req.session.tenant?.id) {
      return res.status(401).redirect('/signin');
    }

    const toolId = String(req.body.toolId || '').trim();
    const enabled = String(req.body.enabled || '').trim() === 'true';
    const toolSearch = String(req.body.toolSearch || '').trim();

    if (!toolId) {
      return res.status(400).redirect('/tools');
    }

    try {
      const tenantTool = await getTenantTool({
        authToken: req.session.auth.token,
        tenantId: req.session.tenant.id,
        toolId,
      });

      if (!tenantTool?.active) {
        return res.status(404).redirect('/tools');
      }

      await saveUserToolPreference({
        authToken: req.session.auth.token,
        tenantId: req.session.tenant.id,
        userId: req.session.auth.user.id,
        toolId,
        enabled,
      });

      const searchParams = new URLSearchParams();
      if (toolSearch) {
        searchParams.set('toolSearch', toolSearch);
      }

      const redirectPath = searchParams.toString() ? `/tools?${searchParams.toString()}` : '/tools';
      return res.redirect(redirectPath);
    } catch (error) {
      console.error(error);
      return res.status(502).redirect('/tools');
    }
  });

  return router;
}

module.exports = {
  createToolsRouter,
};
