const {
  createTodo,
  getOwnedTodoById,
  listTodosForTenant,
  parseDateTimeLocalInTenantTimeZone,
  resolveTenantTimeZone,
  updateTodo,
} = require('../todos');

const VALID_STATUSES = ['ToDo', 'Working', 'Blocked', 'Done', 'Archived'];
const VALID_ACTIONS = ['create_task', 'update_tasks', 'archive_tasks', 'query_tasks'];
const MONTH_INDEX = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};
const WEEKDAY_INDEX = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};
const WEEKDAY_ALIASES = {
  sun: 'sunday',
  sunday: 'sunday',
  mon: 'monday',
  monday: 'monday',
  tue: 'tuesday',
  tues: 'tuesday',
  tuesday: 'tuesday',
  wed: 'wednesday',
  weds: 'wednesday',
  wednesday: 'wednesday',
  thu: 'thursday',
  thur: 'thursday',
  thurs: 'thursday',
  thursday: 'thursday',
  fri: 'friday',
  friday: 'friday',
  sat: 'saturday',
  saturday: 'saturday',
};
const WORD_TO_NUMBER = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

function getPromptDefinition({ tool }) {
  return {
    toolKey: tool.toolKey,
    name: tool.title,
    description: [
      'Manage the current user\'s tasks.',
      'In this system, tasks, todos, and reminders are the same thing.',
      'Use this tool to create tasks, update one or more tasks, archive tasks, or query tasks by title, details, status, or due date.',
      'Prefer sending one tool call with an operations array when the user asks for multiple task changes.',
      'Interpret weekday-only due dates like Monday or Tuesday as the next upcoming occurrence of that weekday unless the user explicitly says past or gives a specific date.',
      'For example, if today is Saturday, March 21, 2026, Monday means Monday, March 23, 2026 and Tuesday means Tuesday, March 24, 2026.',
      'Treat next Monday or next Tuesday the same unless the user clearly intends a different week.',
      'When the user gives a natural timing phrase, preserve that phrase in dueDateText instead of inventing a task id or pretending the task was created.',
      'Ordinal calendar dates like April 30th, May 1st, June 2nd, and July 3rd are valid date phrases and should be preserved in dueDateText.',
      'Same-day phrases like this morning, this afternoon, this evening, and tonight are valid dueDateText values.',
    ].join(' '),
    autonomous: Boolean(tool.autonomous),
    inputs: [
      {
        key: 'operations',
        description: [
          'Required array of task operations.',
          'Each operation must include action.',
          'Valid actions: create_task, update_tasks, archive_tasks, query_tasks.',
          'For create_task: provide title, and optionally details, dueDateText, or status.',
          'For update_tasks and archive_tasks: provide selector plus changes.',
          'For query_tasks: provide selector to search the current user\'s tasks.',
          'Selector may include taskIds, title, searchText, status, dueDateText, includeArchived, or limit.',
          'Changes may include title, details, status, dueDateText, or clearDueDate.',
          'When creating a task, defaults are status ToDo, ownerType user, and createdBy the current user unless explicitly changed by the server policy.',
          'Weekday-only dueDateText values like Monday, Tuesday, or Friday should mean the next upcoming occurrence of that weekday.',
          'If the user gives timing language such as Wed at 4 pm, this coming Friday, in 2 months, tomorrow at 3 pm, or April 4th, include that timing phrase in dueDateText.',
          'Ordinal month-day phrases like April 30th or October 1st should be passed through in dueDateText.',
          'Same-day phrases like this morning, this afternoon, this evening, and tonight should be passed through in dueDateText.',
        ].join(' '),
        required: true,
      },
    ],
  };
}

function shouldDirectHandle() {
  return false;
}

function shouldAutoExecute({ input = {} }) {
  return normalizeOperations(input).length > 0;
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function isNoDueDatePhrase(value) {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) {
    return false;
  }

  return [
    'no due date',
    'no duedate',
    'without a due date',
    'without due date',
    'none',
    'no date',
    'no deadline',
    'no reminder time',
    'unscheduled',
  ].includes(normalized);
}

function isPlaceholderCreateTitle(value) {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) {
    return true;
  }

  return [
    'remind me',
    'remind me about',
    'todo',
    'task',
    'reminder',
    'new task',
    'new reminder',
  ].includes(normalized) || /please specify|what would you like me/i.test(value);
}

function normalizeStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  const mapping = {
    todo: 'ToDo',
    'to do': 'ToDo',
    working: 'Working',
    'in progress': 'Working',
    inprogress: 'Working',
    blocked: 'Blocked',
    done: 'Done',
    complete: 'Done',
    completed: 'Done',
    archive: 'Archived',
    archived: 'Archived',
    delete: 'Archived',
    deleted: 'Archived',
  };

  return mapping[normalized] || '';
}

function toArray(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value === null || value === undefined || value === '') {
    return [];
  }

  return [value];
}

function getNowInTimeZone(timeZone) {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    weekday: String(values.weekday || '').toLowerCase(),
  };
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function addUtcMonths(date, months) {
  const copy = new Date(date.getTime());
  const day = copy.getUTCDate();
  copy.setUTCDate(1);
  copy.setUTCMonth(copy.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(copy.getUTCFullYear(), copy.getUTCMonth() + 1, 0)).getUTCDate();
  copy.setUTCDate(Math.min(day, lastDay));
  return copy;
}

function addUtcYears(date, years) {
  const copy = new Date(date.getTime());
  const month = copy.getUTCMonth();
  const day = copy.getUTCDate();
  copy.setUTCDate(1);
  copy.setUTCFullYear(copy.getUTCFullYear() + years);
  const lastDay = new Date(Date.UTC(copy.getUTCFullYear(), month + 1, 0)).getUTCDate();
  copy.setUTCMonth(month);
  copy.setUTCDate(Math.min(day, lastDay));
  return copy;
}

function buildLocalDateTime(year, month, day, hour = 17, minute = 0) {
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

function parseTimeFromText(value) {
  const text = String(value || '').trim();
  const match = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (!match) {
    return { hour: 17, minute: 0 };
  }

  let hour = Number(match[1]);
  const minute = Number(match[2] || '0');
  const meridiem = match[3].toLowerCase();

  if (meridiem === 'pm' && hour < 12) {
    hour += 12;
  }
  if (meridiem === 'am' && hour === 12) {
    hour = 0;
  }

  return { hour, minute };
}

function parseSameDayTimePhrase(value) {
  const normalized = normalizeRelativeDatePhrase(value);
  if (!normalized) {
    return null;
  }

  if (/\bthis morning\b|\bmorning\b/.test(normalized)) {
    return { hour: 9, minute: 0 };
  }

  if (/\bthis afternoon\b|\bafternoon\b/.test(normalized)) {
    return { hour: 15, minute: 0 };
  }

  if (/\bthis evening\b|\bevening\b/.test(normalized)) {
    return { hour: 18, minute: 0 };
  }

  if (/\btonight\b/.test(normalized)) {
    return { hour: 20, minute: 0 };
  }

  return null;
}

function normalizeRelativeDatePhrase(value) {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) {
    return '';
  }

  return normalized
    .replace(/\bthis coming\b/g, 'next')
    .replace(/\bcoming\b/g, 'next')
    .replace(/\bthis\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat)\b/g, '$1')
    .replace(/\b(sun|mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat)\b/g, (match) => WEEKDAY_ALIASES[match] || match)
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveRelativeDateToken(token, timeZone) {
  const now = getNowInTimeZone(timeZone);
  const today = new Date(Date.UTC(now.year, now.month - 1, now.day));
  const normalized = normalizeRelativeDatePhrase(token);

  if (normalized === 'today') {
    return { year: now.year, month: now.month, day: now.day };
  }

  if (normalized === 'tonight'
    || normalized === 'this morning'
    || normalized === 'morning'
    || normalized === 'this afternoon'
    || normalized === 'afternoon'
    || normalized === 'this evening'
    || normalized === 'evening') {
    return { year: now.year, month: now.month, day: now.day };
  }

  if (normalized === 'tomorrow') {
    today.setUTCDate(today.getUTCDate() + 1);
    return {
      year: today.getUTCFullYear(),
      month: today.getUTCMonth() + 1,
      day: today.getUTCDate(),
    };
  }

  if (normalized === 'next week') {
    today.setUTCDate(today.getUTCDate() + 7);
    return {
      year: today.getUTCFullYear(),
      month: today.getUTCMonth() + 1,
      day: today.getUTCDate(),
    };
  }

  if (normalized === 'next month') {
    const shifted = addUtcMonths(today, 1);
    return {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      day: shifted.getUTCDate(),
    };
  }

  if (normalized === 'next year') {
    const shifted = addUtcYears(today, 1);
    return {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      day: shifted.getUTCDate(),
    };
  }

  if (normalized === 'this weekend') {
    const saturday = WEEKDAY_INDEX.saturday;
    const current = WEEKDAY_INDEX[now.weekday];
    let delta = (saturday - current + 7) % 7;
    today.setUTCDate(today.getUTCDate() + delta);
    return {
      year: today.getUTCFullYear(),
      month: today.getUTCMonth() + 1,
      day: today.getUTCDate(),
    };
  }

  const relativeOffsetMatch = normalized.match(/^in\s+(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(day|days|week|weeks|month|months|year|years)$/);
  if (relativeOffsetMatch) {
    const rawAmount = relativeOffsetMatch[1];
    const amount = Number.isFinite(Number(rawAmount)) ? Number(rawAmount) : WORD_TO_NUMBER[rawAmount];
    const unit = relativeOffsetMatch[2];

    if (amount > 0) {
      if (unit.startsWith('week')) {
        today.setUTCDate(today.getUTCDate() + amount * 7);
      } else if (unit.startsWith('day')) {
        today.setUTCDate(today.getUTCDate() + amount);
      } else if (unit.startsWith('month')) {
        const shifted = addUtcMonths(today, amount);
        return {
          year: shifted.getUTCFullYear(),
          month: shifted.getUTCMonth() + 1,
          day: shifted.getUTCDate(),
        };
      } else if (unit.startsWith('year')) {
        const shifted = addUtcYears(today, amount);
        return {
          year: shifted.getUTCFullYear(),
          month: shifted.getUTCMonth() + 1,
          day: shifted.getUTCDate(),
        };
      }
      return {
        year: today.getUTCFullYear(),
        month: today.getUTCMonth() + 1,
        day: today.getUTCDate(),
      };
    }
  }

  const fromNowMatch = normalized.match(/^(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(day|days|week|weeks|month|months|year|years)\s+from\s+now$/);
  if (fromNowMatch) {
    const rawAmount = fromNowMatch[1];
    const amount = Number.isFinite(Number(rawAmount)) ? Number(rawAmount) : WORD_TO_NUMBER[rawAmount];
    const unit = fromNowMatch[2];

    if (amount > 0) {
      if (unit.startsWith('week')) {
        today.setUTCDate(today.getUTCDate() + amount * 7);
        return {
          year: today.getUTCFullYear(),
          month: today.getUTCMonth() + 1,
          day: today.getUTCDate(),
        };
      }
      if (unit.startsWith('day')) {
        today.setUTCDate(today.getUTCDate() + amount);
        return {
          year: today.getUTCFullYear(),
          month: today.getUTCMonth() + 1,
          day: today.getUTCDate(),
        };
      }
      if (unit.startsWith('month')) {
        const shifted = addUtcMonths(today, amount);
        return {
          year: shifted.getUTCFullYear(),
          month: shifted.getUTCMonth() + 1,
          day: shifted.getUTCDate(),
        };
      }
      if (unit.startsWith('year')) {
        const shifted = addUtcYears(today, amount);
        return {
          year: shifted.getUTCFullYear(),
          month: shifted.getUTCMonth() + 1,
          day: shifted.getUTCDate(),
        };
      }
    }
  }

  const nextWeekdayMatch = normalized.match(/^next\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/);
  if (nextWeekdayMatch) {
    const target = WEEKDAY_INDEX[nextWeekdayMatch[1]];
    const current = WEEKDAY_INDEX[now.weekday];
    let delta = (target - current + 7) % 7;
    delta = delta === 0 ? 7 : delta;
    today.setUTCDate(today.getUTCDate() + delta);
    return {
      year: today.getUTCFullYear(),
      month: today.getUTCMonth() + 1,
      day: today.getUTCDate(),
    };
  }

  const weekdayMatch = normalized.match(/^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/);
  if (weekdayMatch) {
    const target = WEEKDAY_INDEX[weekdayMatch[1]];
    const current = WEEKDAY_INDEX[now.weekday];
    let delta = (target - current + 7) % 7;
    delta = delta === 0 ? 7 : delta;
    today.setUTCDate(today.getUTCDate() + delta);
    return {
      year: today.getUTCFullYear(),
      month: today.getUTCMonth() + 1,
      day: today.getUTCDate(),
    };
  }

  return null;
}

function parseMonthDateToken(token, timeZone) {
  const normalized = normalizeRelativeDatePhrase(token);
  const match = normalized.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/);
  if (!match) {
    return null;
  }

  const now = getNowInTimeZone(timeZone);
  const month = MONTH_INDEX[match[1]] + 1;
  const day = Number(match[2]);
  const explicitYear = match[3] ? Number(match[3]) : null;
  let year = explicitYear || now.year;

  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > lastDayOfMonth) {
    return null;
  }

  if (!explicitYear) {
    const candidate = new Date(Date.UTC(year, month - 1, day));
    const current = new Date(Date.UTC(now.year, now.month - 1, now.day));
    if (candidate < current) {
      year += 1;
    }
  }

  return { year, month, day };
}

function formatDueDateForResponse(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

function formatDueDateDay(value, tenantTimeZoneLabel) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: resolveTenantTimeZone(tenantTimeZoneLabel),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function parseNaturalDueDate(dueDateText, tenantTimeZoneLabel) {
  const normalized = normalizeText(dueDateText);
  if (!normalized) {
    return { iso: null, display: '', ambiguous: false };
  }

  const normalizedWithoutTime = normalizeText(
    normalized
      .replace(/\bby\s+/gi, '')
      .replace(/\bat\s+/gi, '')
      .replace(/\bon\s+/gi, '')
  );
  const timeZone = resolveTenantTimeZone(tenantTimeZoneLabel);
  const explicitTimeMatch = /\b\d{1,2}(?::\d{2})?\s*(am|pm)\b/i.test(normalized);
  const dateToken = normalizedWithoutTime.replace(/\b\d{1,2}(?::\d{2})?\s*(am|pm)\b/i, '').trim();
  const relativeDate = resolveRelativeDateToken(dateToken, timeZone);
  const monthDate = parseMonthDateToken(dateToken, timeZone);
  const today = getNowInTimeZone(timeZone);
  const implicitToday = explicitTimeMatch && !dateToken
    ? { year: today.year, month: today.month, day: today.day }
    : null;
  const parsedTime = explicitTimeMatch ? parseTimeFromText(normalized) : (parseSameDayTimePhrase(normalizedWithoutTime) || parseTimeFromText(normalized));
  const { hour, minute } = parsedTime;
  const dateParts = relativeDate || monthDate || implicitToday;

  if (!dateParts) {
    return { iso: null, display: '', ambiguous: true };
  }

  const localDateTime = buildLocalDateTime(dateParts.year, dateParts.month, dateParts.day, hour, minute);
  const iso = parseDateTimeLocalInTenantTimeZone(localDateTime, tenantTimeZoneLabel);
  if (!iso) {
    return { iso: null, display: '', ambiguous: true };
  }

  return {
    iso,
    display: formatDueDateForResponse(iso),
    ambiguous: false,
  };
}

function normalizeSelector(selector = {}, operation = {}) {
  return {
    taskIds: toArray(selector.taskIds || operation.taskIds || operation.todoIds || operation.todoId)
      .map((item) => normalizeText(item))
      .filter(Boolean),
    title: normalizeText(selector.title || operation.titleQuery || operation.todoTitle || ''),
    searchText: normalizeText(selector.searchText || operation.searchText || ''),
    status: normalizeStatus(selector.status || ''),
    dueDateText: normalizeText(selector.dueDateText || ''),
    includeArchived: Boolean(selector.includeArchived || operation.includeArchived),
    limit: Number.isFinite(Number(selector.limit || operation.limit)) ? Number(selector.limit || operation.limit) : 0,
  };
}

function normalizeOperations(input = {}) {
  if (Array.isArray(input.operations)) {
    return input.operations.filter((operation) => operation && typeof operation === 'object');
  }

  if (input && typeof input === 'object' && input.action) {
    return [input];
  }

  return [];
}

function normalizeAction(value) {
  return normalizeText(value).toLowerCase();
}

async function loadCurrentUserTasks(context) {
  return listTodosForTenant({
    authToken: context.authToken,
    tenantId: context.tenantId,
    currentUserId: context.currentUserId,
    tenantUsers: [],
    tenantTimeZone: context.tenantTimeZone,
    status: 'All',
  });
}

function applySelector(tasks, selector, tenantTimeZoneLabel) {
  let matches = [...tasks];

  if (!selector.includeArchived) {
    matches = matches.filter((task) => task.status !== 'Archived');
  }

  if (selector.taskIds.length) {
    const ids = new Set(selector.taskIds);
    matches = matches.filter((task) => ids.has(task.id));
  }

  if (selector.title) {
    const title = selector.title.toLowerCase();
    matches = matches.filter((task) => String(task.title || '').toLowerCase().includes(title));
  }

  if (selector.searchText) {
    const search = selector.searchText.toLowerCase();
    matches = matches.filter((task) => {
      const haystack = [
        task.id,
        task.title,
        task.details,
        task.status,
        task.rawDueDate ? formatDueDateForResponse(task.rawDueDate) : '',
      ].join(' ').toLowerCase();
      return haystack.includes(search);
    });
  }

  if (selector.status) {
    matches = matches.filter((task) => task.status === selector.status);
  }

  if (selector.dueDateText) {
    const dueDate = parseNaturalDueDate(selector.dueDateText, tenantTimeZoneLabel);
    if (dueDate.ambiguous || !dueDate.iso) {
      const error = new Error(`Could not understand dueDateText "${selector.dueDateText}".`);
      error.code = 'INVALID_DUE_DATE';
      throw error;
    }

    const targetDay = formatDueDateDay(dueDate.iso, tenantTimeZoneLabel);
    matches = matches.filter((task) => task.rawDueDate && formatDueDateDay(task.rawDueDate, tenantTimeZoneLabel) === targetDay);
  }

  if (selector.limit > 0) {
    matches = matches.slice(0, selector.limit);
  }

  return matches;
}

function buildTaskLine(task) {
  const dueText = task.rawDueDate ? `, due ${formatDueDateForResponse(task.rawDueDate)}` : '';
  return `- ${task.id}: ${task.title} (${task.status}${dueText})`;
}

async function executeCreateOperation(operation, context) {
  const title = normalizeText(operation.title);
  if (!title || isPlaceholderCreateTitle(title)) {
    return {
      ok: false,
      action: 'create_task',
      message: 'create_task requires a real task title from the user.',
    };
  }

  const status = normalizeStatus(operation.status) || 'ToDo';
  if (!VALID_STATUSES.includes(status)) {
    return {
      ok: false,
      action: 'create_task',
      message: `Invalid status "${operation.status}".`,
    };
  }

  const dueDateText = normalizeText(operation.dueDateText);
  const shouldClearDueDate = isNoDueDatePhrase(dueDateText);
  const dueDate = dueDateText && !shouldClearDueDate
    ? parseNaturalDueDate(dueDateText, context.tenantTimeZone)
    : { iso: null, display: '', ambiguous: false };
  if (dueDateText && !shouldClearDueDate && (dueDate.ambiguous || !dueDate.iso)) {
    return {
      ok: false,
      action: 'create_task',
      message: `Could not understand dueDateText "${dueDateText}".`,
    };
  }

  const record = await createTodo({
    authToken: context.authToken,
    payload: {
      tenant: context.tenantId,
      title,
      status,
      dueDate: shouldClearDueDate ? null : (dueDate.iso || null),
      details: normalizeText(operation.details),
      ownerType: 'user',
      ownerUser: context.currentUserId,
      ownerLabel: '',
      createdBy: context.currentUserId,
      priority: '',
    },
  });

  const verifiedTask = await getOwnedTodoById({
    authToken: context.authToken,
    todoId: record.id,
    tenantId: context.tenantId,
    currentUserId: context.currentUserId,
    tenantTimeZone: context.tenantTimeZone,
  });

  if (!verifiedTask) {
    return {
      ok: false,
      action: 'create_task',
      message: `Task creation could not be verified for id ${record.id}.`,
    };
  }

  return {
    ok: true,
    action: 'create_task',
    created: [
      {
        id: verifiedTask.id,
        title: verifiedTask.title,
        status: verifiedTask.status,
        dueDate: verifiedTask.rawDueDate || null,
      },
    ],
    message: verifiedTask.rawDueDate
      ? `Created task ${verifiedTask.id}: ${verifiedTask.title} (${verifiedTask.status}, due ${formatDueDateForResponse(verifiedTask.rawDueDate)}).`
      : `Created task ${verifiedTask.id}: ${verifiedTask.title} (${verifiedTask.status}).`,
  };
}

function normalizeChanges(changes = {}, operation = {}) {
  const normalized = {};

  if (Object.prototype.hasOwnProperty.call(changes, 'title') || Object.prototype.hasOwnProperty.call(operation, 'title')) {
    normalized.title = normalizeText(changes.title || operation.title);
  }

  if (Object.prototype.hasOwnProperty.call(changes, 'details') || Object.prototype.hasOwnProperty.call(operation, 'details')) {
    normalized.details = normalizeText(changes.details || operation.details);
  }

  const status = normalizeStatus(changes.status || operation.status);
  if (status) {
    normalized.status = status;
  }

  const dueDateText = normalizeText(changes.dueDateText || operation.dueDateText);
  if (dueDateText) {
    normalized.dueDateText = dueDateText;
  }

  if (changes.clearDueDate === true || operation.clearDueDate === true) {
    normalized.clearDueDate = true;
  }

  return normalized;
}

async function executeUpdateLikeOperation(operation, context, action) {
  const selector = normalizeSelector(operation.selector, operation);
  const tasks = applySelector(await loadCurrentUserTasks(context), selector, context.tenantTimeZone);
  if (!tasks.length) {
    return {
      ok: false,
      action,
      message: 'No matching tasks were found for this operation.',
    };
  }

  const changes = action === 'archive_tasks'
    ? { status: 'Archived' }
    : normalizeChanges(operation.changes || {}, operation);

  const payload = {};
  if (Object.prototype.hasOwnProperty.call(changes, 'title')) {
    if (!changes.title) {
      return { ok: false, action, message: 'Updated title cannot be empty.' };
    }
    payload.title = changes.title;
  }
  if (Object.prototype.hasOwnProperty.call(changes, 'details')) {
    payload.details = changes.details;
  }
  if (Object.prototype.hasOwnProperty.call(changes, 'status')) {
    if (!VALID_STATUSES.includes(changes.status)) {
      return { ok: false, action, message: `Invalid status "${changes.status}".` };
    }
    payload.status = changes.status;
  }
  if (changes.clearDueDate) {
    payload.dueDate = null;
  } else if (changes.dueDateText) {
    const dueDate = parseNaturalDueDate(changes.dueDateText, context.tenantTimeZone);
    if (dueDate.ambiguous || !dueDate.iso) {
      return {
        ok: false,
        action,
        message: `Could not understand dueDateText "${changes.dueDateText}".`,
      };
    }
    payload.dueDate = dueDate.iso;
  }

  if (!Object.keys(payload).length) {
    return {
      ok: false,
      action,
      message: `${action} requires at least one change.`,
    };
  }

  await Promise.all(
    tasks.map((task) => updateTodo({
      authToken: context.authToken,
      todoId: task.id,
      payload,
    }))
  );

  return {
    ok: true,
    action,
    updated: tasks.map((task) => task.id),
    count: tasks.length,
    message: action === 'archive_tasks'
      ? `Archived ${tasks.length} task${tasks.length === 1 ? '' : 's'}.`
      : `Updated ${tasks.length} task${tasks.length === 1 ? '' : 's'}.`,
  };
}

async function executeQueryOperation(operation, context) {
  const selector = normalizeSelector(operation.selector, operation);
  const matches = applySelector(await loadCurrentUserTasks(context), selector, context.tenantTimeZone);
  const limit = selector.limit > 0 ? selector.limit : 10;
  const visible = matches.slice(0, limit);

  return {
    ok: true,
    action: 'query_tasks',
    count: matches.length,
    tasks: visible.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      dueDate: task.rawDueDate || null,
      details: task.details || '',
    })),
    message: !matches.length
      ? 'No matching tasks found.'
      : [
          `Found ${matches.length} matching task${matches.length === 1 ? '' : 's'}:`,
          ...visible.map(buildTaskLine),
        ].join('\n'),
  };
}

async function executeOperation(operation, context) {
  const action = normalizeAction(operation.action);
  if (!VALID_ACTIONS.includes(action)) {
    return {
      ok: false,
      action: action || 'unknown',
      message: `Unsupported action "${operation.action || ''}".`,
    };
  }

  if (action === 'create_task') {
    return executeCreateOperation(operation, context);
  }

  if (action === 'update_tasks') {
    return executeUpdateLikeOperation(operation, context, action);
  }

  if (action === 'archive_tasks') {
    return executeUpdateLikeOperation(operation, context, action);
  }

  return executeQueryOperation(operation, context);
}

function buildExecutionMessage(results = []) {
  const messages = results.map((result) => result.message).filter(Boolean);
  return messages.length
    ? messages.join('\n\n')
    : 'No task operations were executed.';
}

async function execute({ input = {}, context = {} }) {
  const operations = normalizeOperations(input);
  if (!operations.length) {
    return {
      message: [
        'Use the task tool with an operations array.',
        'Valid actions are create_task, update_tasks, archive_tasks, and query_tasks.',
      ].join(' '),
      sessionStatePatch: null,
      results: [],
    };
  }

  const results = [];
  for (const operation of operations) {
    try {
      results.push(await executeOperation(operation, context));
    } catch (error) {
      results.push({
        ok: false,
        action: normalizeAction(operation.action) || 'unknown',
        message: error?.message || 'Task operation failed.',
      });
    }
  }

  return {
    message: buildExecutionMessage(results),
    sessionStatePatch: null,
    results,
  };
}

function formatResultForAssistant({ result }) {
  return String(result?.message || '').trim();
}

module.exports = {
  execute,
  formatResultForAssistant,
  getPromptDefinition,
  shouldDirectHandle,
  shouldAutoExecute,
};
