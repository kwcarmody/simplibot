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

function formatDueDateForInput(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().slice(0, 16);
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
    dueDateInput: formatDueDateForInput(record.dueDate),
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

function normalizeTodoPayload({ tenantId, currentUserId, body }) {
  const title = String(body.title || '').trim();
  const status = String(body.status || 'ToDo').trim() || 'ToDo';
  const details = String(body.details || '').trim();
  const ownerType = String(body.ownerType || 'user').trim() || 'user';
  const ownerUser = String(body.ownerUser || '').trim();
  const ownerLabel = String(body.ownerLabel || '').trim();
  const dueDateRaw = String(body.dueDate || '').trim();

  return {
    tenant: tenantId,
    title,
    status,
    dueDate: dueDateRaw ? new Date(dueDateRaw).toISOString() : null,
    details,
    ownerType,
    ownerUser: ownerType === 'user' ? (ownerUser || currentUserId) : '',
    ownerLabel: ownerType === 'bot' ? (ownerLabel || 'Pikori') : '',
    createdBy: currentUserId,
  };
}

function validateTodoPayload(payload) {
  if (!payload.title) {
    return 'Title is required.';
  }

  if (!['ToDo', 'Working', 'Blocked', 'Done', 'Archived'].includes(payload.status)) {
    return 'Status is invalid.';
  }

  if (!['user', 'bot'].includes(payload.ownerType)) {
    return 'Owner type is invalid.';
  }

  if (payload.ownerType === 'user' && !payload.ownerUser) {
    return 'Owner user is required when owner type is user.';
  }

  return '';
}

async function listTodosForTenant({ authToken, tenantId }) {
  const client = createClient(authToken);
  const result = await client.collection(TODOS_COLLECTION).getList(1, 200, {
    filter: `tenant = "${tenantId}"`,
    sort: '+dueDate,+created',
  });

  return (result.items || []).map(mapTodoRecord);
}

async function getTodoById({ authToken, todoId }) {
  const client = createClient(authToken);
  return client.collection(TODOS_COLLECTION).getOne(todoId);
}

async function createTodo({ authToken, payload }) {
  const client = createClient(authToken);
  return client.collection(TODOS_COLLECTION).create(payload);
}

async function updateTodo({ authToken, todoId, payload }) {
  const client = createClient(authToken);
  return client.collection(TODOS_COLLECTION).update(todoId, payload);
}

module.exports = {
  DISPLAY_TIME_ZONE,
  createTodo,
  formatDueDate,
  formatDueDateForInput,
  getTodoById,
  listTodosForTenant,
  mapTodoRecord,
  normalizeTodoPayload,
  updateTodo,
  validateTodoPayload,
};
