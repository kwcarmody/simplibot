const webSearchService = require('./web-search');
const calendarService = require('./calendar');
const filesystemService = require('./filesystem');
const crmService = require('./crm');
const automationService = require('./automation');
const monitoringService = require('./monitoring');

const services = {
  'web-search': webSearchService,
  calendar: calendarService,
  filesystem: filesystemService,
  crm: crmService,
  automation: automationService,
  monitoring: monitoringService,
};

function getToolService(serviceKey) {
  return services[serviceKey] || null;
}

module.exports = {
  getToolService,
};
