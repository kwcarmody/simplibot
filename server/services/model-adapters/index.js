const defaultAdapter = require('./default');
const deepseekAdapter = require('./deepseek');
const phi4MiniAdapter = require('./phi4-mini');

const adapters = {
  default: defaultAdapter,
  deepseek: deepseekAdapter,
  'phi4-mini': phi4MiniAdapter,
};

function getModelAdapter(adapterKey) {
  return adapters[adapterKey] || defaultAdapter;
}

module.exports = {
  getModelAdapter,
};
