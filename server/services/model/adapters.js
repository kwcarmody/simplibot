const { getModelDefinition } = require('../model-registry');

function resolveModelAdapterKey(modelSettings = {}) {
  if (modelSettings?.adapterKey) {
    return modelSettings.adapterKey;
  }

  const modelDefinition = getModelDefinition(modelSettings.model);
  return modelDefinition?.adapterKey || 'default';
}

module.exports = {
  resolveModelAdapterKey,
};
