const webSearchService = require('./web-search');
const calendarService = require('./calendar');
const filesystemService = require('./filesystem');
const crmService = require('./crm');
const automationService = require('./automation');
const monitoringService = require('./monitoring');
const todoManagerService = require('./todo-manager');

const services = {
  'web-search': webSearchService,
  calendar: calendarService,
  filesystem: filesystemService,
  crm: crmService,
  automation: automationService,
  monitoring: monitoringService,
  'todo-manager': todoManagerService,
};

function getToolService(serviceKey) {
  return services[serviceKey] || null;
}

module.exports = {
  getToolService,
};
