const MODEL_REGISTRY = {
  'deepseek-v3.2:cloud': {
    modelName: 'deepseek-v3.2:cloud',
    adapterKey: 'deepseek',
    supportsTools: true,
  },
  'phi4-mini': {
    modelName: 'phi4-mini',
    adapterKey: 'phi4-mini',
    supportsTools: true,
  },
};

function getModelDefinition(modelName) {
  return MODEL_REGISTRY[String(modelName || '').trim()] || null;
}

module.exports = {
  MODEL_REGISTRY,
  getModelDefinition,
};
