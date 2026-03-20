const { createClient } = require('../pocketbase');

const TODOS_COLLECTION = process.env.PB_TODOS_COLLECTION || 'todos';
const DISPLAY_TIME_ZONE = 'America/New_York';

function formatDueDate(value) {
  if (!value) {
    return 'No due date';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'No due date';
  }

  return new Intl.DateTimeFormat('en-US', {
    timeZone: DISPLAY_TIME_ZONE,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function resolveOwnerLabel(record) {
  if (record.ownerType === 'bot') {
    return record.ownerLabel || 'Pikori';
  }

  return record.ownerLabel || record.ownerUser || 'Unassigned';
}

function mapTodoRecord(record) {
  return {
    id: record.id,
    title: record.title || 'Untitled ToDo',
    status: record.status || 'ToDo',
    owner: resolveOwnerLabel(record),
    dueDate: formatDueDate(record.dueDate),
    details: record.details || '',
    priority: record.priority || '',
    rawDueDate: record.dueDate || null,
    ownerType: record.ownerType || 'user',
    ownerUser: record.ownerUser || null,
    ownerLabel: record.ownerLabel || '',
    createdBy: record.createdBy || null,
    tenant: record.tenant || null,
  };
}

async function listTodosForTenant({ authToken, tenantId }) {
  const client = createClient(authToken);
  const result = await client.collection(TODOS_COLLECTION).getList(1, 200, {
    filter: `tenant = "${tenantId}"`,
    sort: '+dueDate,+created',
  });

  return (result.items || []).map(mapTodoRecord);
}

module.exports = {
  DISPLAY_TIME_ZONE,
  formatDueDate,
  listTodosForTenant,
  mapTodoRecord,
};
