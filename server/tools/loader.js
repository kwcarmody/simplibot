const { listTenantTools, listToolDefinitions, listUserToolPreferences } = require('../services/tool-definitions');
const { getToolService } = require('../services/tools');
const { findRegistryEntryByToolKey } = require('./registry');

function buildDefinitionMap(definitions = []) {
  return new Map(definitions.map((definition) => [definition.id, definition]));
}

async function loadToolsForTenantUser({ authToken, tenantId, userId }) {
  const [definitions, tenantTools, userPreferences] = await Promise.all([
    listToolDefinitions({ authToken }),
    listTenantTools({ authToken, tenantId }),
    listUserToolPreferences({ authToken, userId, tenantId }),
  ]);

  const definitionsById = buildDefinitionMap(definitions);
  const preferencesByToolId = new Map(
    userPreferences.map((preference) => [Array.isArray(preference.tool) ? preference.tool[0] : preference.tool, preference])
  );

  return tenantTools
    .filter((tenantTool) => Boolean(tenantTool.active))
    .map((tenantTool) => {
      const toolId = Array.isArray(tenantTool.tool) ? tenantTool.tool[0] : tenantTool.tool;
      const definition = definitionsById.get(toolId);

      if (!definition) {
        return null;
      }

      const registryEntry = findRegistryEntryByToolKey(definition.toolKey || definition.name || definition.id);
      const userPreference = preferencesByToolId.get(toolId) || null;
      const service = registryEntry ? getToolService(registryEntry.serviceKey) : null;
      const normalizedConfig = service?.normalizeConfig ? service.normalizeConfig(tenantTool.config || {}) : (tenantTool.config || {});
      const effectiveAutonomous = typeof userPreference?.autonomous === 'boolean'
        ? userPreference.autonomous
        : (typeof definition.autonomous === 'boolean' ? definition.autonomous : false);

      return {
        id: registryEntry?.uiId || definition.toolKey || definition.id,
        toolDefinitionId: definition.id,
        tenantToolId: tenantTool.id,
        userPreferenceId: userPreference?.id || null,
        toolKey: registryEntry?.toolKey || definition.toolKey || definition.id,
        serviceKey: registryEntry?.serviceKey || definition.toolKey || definition.id,
        title: definition.name || registryEntry?.defaultName || 'Untitled Tool',
        description: definition.description || registryEntry?.defaultDescription || '',
        sortOrder: Number.isFinite(Number(definition.sortOrder)) ? Number(definition.sortOrder) : 0,
        enabled: userPreference ? Boolean(userPreference.enabled) : true,
        autonomous: Boolean(effectiveAutonomous),
        active: Boolean(tenantTool.active),
        configSchema: definition.configSchema || { fields: [] },
        config: normalizedConfig,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

module.exports = {
  loadToolsForTenantUser,
};
