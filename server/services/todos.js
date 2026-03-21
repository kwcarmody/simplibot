const { createClient } = require('../pocketbase');

const TODOS_COLLECTION = process.env.PB_TODOS_COLLECTION || 'todos';
const DEFAULT_TIME_ZONE_LABEL = 'EST/EDT';

function resolveTenantTimeZone(timeZoneLabel = DEFAULT_TIME_ZONE_LABEL) {
  const normalized = String(timeZoneLabel || DEFAULT_TIME_ZONE_LABEL).trim();

  switch (normalized) {
    case 'CST/CDT':
      return 'America/Chicago';
    case 'PST/PDT':
      return 'America/Los_Angeles';
    case 'EST/EDT':
    default:
      return 'America/New_York';
  }
}

function getTimeZoneParts(date, tenantTimeZone = DEFAULT_TIME_ZONE_LABEL) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: resolveTenantTimeZone(tenantTimeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
}

function getPartValue(parts, type) {
  return parts.find((part) => part.type === type)?.value || '';
}

function parseDateTimeLocalInTenantTimeZone(value, tenantTimeZone = DEFAULT_TIME_ZONE_LABEL) {
  const match = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  const desiredUtcLike = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute)
  );

  let guessUtcMs = desiredUtcLike;

  for (let index = 0; index < 3; index += 1) {
    const parts = getTimeZoneParts(new Date(guessUtcMs), tenantTimeZone);
    const actualUtcLike = Date.UTC(
      Number(getPartValue(parts, 'year')),
      Number(getPartValue(parts, 'month')) - 1,
      Number(getPartValue(parts, 'day')),
      Number(getPartValue(parts, 'hour')),
      Number(getPartValue(parts, 'minute'))
    );
    const delta = desiredUtcLike - actualUtcLike;

    if (delta === 0) {
      break;
    }

    guessUtcMs += delta;
  }

  const resolvedDate = new Date(guessUtcMs);
  return Number.isNaN(resolvedDate.getTime()) ? null : resolvedDate.toISOString();
}

function formatDueDate(value, tenantTimeZone = DEFAULT_TIME_ZONE_LABEL) {
  if (!value) {
    return 'No due date';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'No due date';
  }

  return new Intl.DateTimeFormat('en-US', {
    timeZone: resolveTenantTimeZone(tenantTimeZone),
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatDueDateForInput(value, tenantTimeZone = DEFAULT_TIME_ZONE_LABEL) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const parts = getTimeZoneParts(date, tenantTimeZone);

  return `${getPartValue(parts, 'year')}-${getPartValue(parts, 'month')}-${getPartValue(parts, 'day')}T${getPartValue(parts, 'hour')}:${getPartValue(parts, 'minute')}`;
}

function resolveOwnerLabel(record, ownerDirectory = new Map()) {
  if (record.ownerType === 'bot') {
    return record.ownerLabel || 'Pikori';
  }

  const ownerId = Array.isArray(record.ownerUser) ? record.ownerUser[0] : record.ownerUser;
  const directoryOwnerName = ownerDirectory.get(ownerId) || '';

  return directoryOwnerName || record.ownerLabel || ownerId || 'Unassigned';
}

function mapTodoRecord(record, ownerDirectory = new Map(), tenantTimeZone = DEFAULT_TIME_ZONE_LABEL) {
  const ownerName = resolveOwnerLabel(record, ownerDirectory);

  return {
    id: record.id,
    title: record.title || 'Untitled ToDo',
    status: record.status || 'ToDo',
    owner: ownerName,
    dueDate: formatDueDate(record.dueDate, tenantTimeZone),
    dueDateInput: formatDueDateForInput(record.dueDate, tenantTimeZone),
    details: record.details || '',
    priority: record.priority || '',
    rawDueDate: record.dueDate || null,
    ownerType: record.ownerType || 'user',
    ownerUser: record.ownerUser || null,
    ownerName,
    ownerLabel: record.ownerLabel || '',
    createdBy: record.createdBy || null,
    tenant: record.tenant || null,
  };
}

function normalizeTodoPayload({ tenantId, currentUserId, body, tenantTimeZone = DEFAULT_TIME_ZONE_LABEL }) {
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
    dueDate: dueDateRaw ? parseDateTimeLocalInTenantTimeZone(dueDateRaw, tenantTimeZone) : null,
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

async function listTodosForTenant({
  authToken,
  tenantId,
  currentUserId,
  tenantUsers = [],
  tenantTimeZone = DEFAULT_TIME_ZONE_LABEL,
  status,
}) {
  const client = createClient(authToken);
  const normalizedStatus = String(status || '').trim();
  const filters = [
    `tenant = "${tenantId}"`,
    'ownerType = "user"',
    `ownerUser = "${currentUserId}"`,
  ];

  if (normalizedStatus && normalizedStatus !== 'All') {
    filters.push(`status = "${normalizedStatus}"`);
  }

  const result = await client.collection(TODOS_COLLECTION).getList(1, 200, {
    filter: filters.join(' && '),
    sort: '+dueDate,+created',
  });

  const ownerDirectory = new Map(
    tenantUsers
      .filter((user) => user?.id)
      .map((user) => [user.id, user.name || user.email || user.id])
  );

  return (result.items || []).map((record) => mapTodoRecord(record, ownerDirectory, tenantTimeZone));
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
  createTodo,
  formatDueDate,
  formatDueDateForInput,
  getTodoById,
  listTodosForTenant,
  mapTodoRecord,
  normalizeTodoPayload,
  parseDateTimeLocalInTenantTimeZone,
  resolveTenantTimeZone,
  updateTodo,
  validateTodoPayload,
};
