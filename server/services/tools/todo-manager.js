const {
  createTodo,
  findTodosForUserByTitle,
  getOwnedTodoById,
  listTodosForTenant,
  parseDateTimeLocalInTenantTimeZone,
  resolveTenantTimeZone,
  updateTodo,
} = require('../todos');

const VALID_STATUSES = ['ToDo', 'Working', 'Blocked', 'Done', 'Archived'];
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

function getPromptDefinition({ tool }) {
  return {
    toolKey: tool.toolKey,
    name: tool.title,
    description: 'Create personal todos, update todo status, set due dates, and look up task details for your own tasks.',
    autonomous: Boolean(tool.autonomous),
    inputs: [
      {
        key: 'action',
        description: 'One of create_todo, update_todo_status, set_todo_due_date, or get_todo_details.',
        required: true,
      },
      {
        key: 'title',
        description: 'The todo title for creation.',
        required: false,
      },
      {
        key: 'details',
        description: 'Optional extra task details.',
        required: false,
      },
      {
        key: 'dueDateText',
        description: 'Optional natural language due date and time. If only a date is provided, default to 5:00 PM America/New_York.',
        required: false,
      },
      {
        key: 'todoId',
        description: 'Todo id for updates.',
        required: false,
      },
      {
        key: 'todoTitle',
        description: 'Todo title for status updates when id is not provided.',
        required: false,
      },
      {
        key: 'status',
        description: 'New status: ToDo, Working, Blocked, Done, or Archived.',
        required: false,
      },
      {
        key: 'detailType',
        description: 'Optional lookup target such as due_date, status, details, or summary.',
        required: false,
      },
    ],
  };
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  const mapping = {
    todo: 'ToDo',
    'to do': 'ToDo',
    working: 'Working',
    inprogress: 'Working',
    'in progress': 'Working',
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

function isLikelyTodoIntent(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return [
    /\b(add|create|make|set up)\b.*\b(task|todo|reminder)\b/,
    /\bremind me to\b/,
    /\b(set|mark|change|update)\b.*\b(task|todo)\b/,
    /\b(delete|archive)\b.*\b(task|todo)\b/,
    /\b(due date|deadline)\b/,
    /\bwhen is\b.*\b(task|todo)\b/,
    /\bwhat is\b.*\b(task|todo)\b/,
    /\btell me about\b.*\b(task|todo)\b/,
    /\bhow many\b.*\b(tasks|todos)\b/,
    /\blist all\b.*\b(tasks|todos|them)\b/,
  ].some((pattern) => pattern.test(normalized));
}

function looksLikeTodoQuery(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return [
    /\bwhen is\b.*\b(task|todo)\b/,
    /\bwhen\b.*\bdue\b/,
    /\bwhat is\b.*\b(task|todo)\b/,
    /\bwhat's\b.*\b(task|todo)\b/,
    /\btell me about\b.*\b(task|todo)\b/,
    /\bshow me\b.*\b(task|todo)\b/,
    /\bstatus of\b.*\b(task|todo)\b/,
    /\bdetails for\b.*\b(task|todo)\b/,
  ].some((pattern) => pattern.test(normalized));
}

function shouldAutoExecute({ latestUserMessage, input = {}, context = {} }) {
  return Boolean(determineAction({
    latestUserMessage,
    input,
    context,
  }));
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

function buildLocalDateTime(year, month, day, hour = 17, minute = 0) {
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

function parseTimeFromText(value) {
  const text = String(value || '').trim();
  const match = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
  if (!match) {
    return { hour: 17, minute: 0, explicit: false };
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

  return { hour, minute, explicit: true };
}

function resolveRelativeDateToken(token, timeZone) {
  const now = getNowInTimeZone(timeZone);
  const today = new Date(Date.UTC(now.year, now.month - 1, now.day));
  const normalized = String(token || '').trim().toLowerCase();

  if (normalized === 'today') {
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

  return null;
}

function parseMonthDateToken(token, timeZone) {
  const normalized = normalizeText(token).toLowerCase();
  const match = normalized.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\b/);
  if (!match) {
    return null;
  }

  const now = getNowInTimeZone(timeZone);
  const month = MONTH_INDEX[match[1]] + 1;
  const day = Number(match[2]);
  const explicitYear = match[3] ? Number(match[3]) : null;
  let year = explicitYear || now.year;

  if (!explicitYear) {
    const candidate = new Date(Date.UTC(year, month - 1, day));
    const current = new Date(Date.UTC(now.year, now.month - 1, now.day));
    if (candidate < current) {
      year += 1;
    }
  }

  return { year, month, day };
}

function extractDueDateText(text) {
  const value = String(text || '');
  const patterns = [
    /\b(?:by|due)\s+((?:tomorrow|today|next\s+\w+|[A-Z][a-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)\s+by\s+\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i,
    /\bby\s+((?:\d{1,2}(?::\d{2})?\s*(?:am|pm)\s+(?:on\s+)?(?:tomorrow|today|next\s+\w+|[A-Z][a-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)))\b/i,
    /\bdue\s+((?:\d{1,2}(?::\d{2})?\s*(?:am|pm)\s+(?:on\s+)?(?:tomorrow|today|next\s+\w+|[A-Z][a-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)))\b/i,
    /\bby\s+((?:\d{1,2}(?::\d{2})?\s*(?:am|pm))|(?:tomorrow|today|next\s+\w+)|(?:[A-Z][a-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm))?)/i,
    /\bdue\s+((?:\d{1,2}(?::\d{2})?\s*(?:am|pm))|(?:tomorrow|today|next\s+\w+)|(?:[A-Z][a-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)(?:\s+at\s+\d{1,2}(?::\d{2})?\s*(?:am|pm))?)/i,
    /\bon\s+((?:tomorrow|today|next\s+\w+)|(?:[A-Z][a-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?))(?:\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)))?/i,
    /\b((?:tomorrow|today|next\s+\w+|[A-Z][a-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?))(?:\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)))\b/i,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) {
      const dueDateText = normalizeText([match[1], match[2]].filter(Boolean).join(' '));
      return {
        dueDateText,
        remainingText: normalizeText(value.replace(match[0], ' ')),
      };
    }
  }

  return {
    dueDateText: '',
    remainingText: normalizeText(value),
  };
}

function parseNaturalDueDate(dueDateText, tenantTimeZoneLabel) {
  const normalized = normalizeText(dueDateText);
  if (!normalized) {
    return { iso: null, display: '', ambiguous: false };
  }

  const normalizedWithoutTime = normalizeText(
    normalized
      .replace(/\bby\s+\d{1,2}(?::\d{2})?\s*(am|pm)\b/i, '')
      .replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(am|pm)\b/i, '')
      .replace(/\b\d{1,2}(?::\d{2})?\s*(am|pm)\b/i, '')
      .replace(/\bon\s+/i, '')
  );
  const timeZone = resolveTenantTimeZone(tenantTimeZoneLabel);
  const relativeDate = resolveRelativeDateToken(normalizedWithoutTime, timeZone);
  const monthDate = parseMonthDateToken(normalizedWithoutTime, timeZone);
  const { hour, minute } = parseTimeFromText(normalized);

  let dateParts = relativeDate || monthDate;
  if (!dateParts) {
    if (/\b\d{1,2}(?::\d{2})?\s*(am|pm)\b/i.test(normalized)) {
      return { iso: null, display: '', ambiguous: true };
    }
    return { iso: null, display: '', ambiguous: false };
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

function stripCreatePrefixes(text) {
  return normalizeText(
    String(text || '')
      .replace(/^\b(add|create|make|set up)\b\s+(?:a\s+)?(?:task|todo|reminder)\b(?:\s+for me)?/i, '')
      .replace(/^\bnew\b/i, '')
      .replace(/^\bcalled\b/i, '')
      .replace(/^\bremind me to\b/i, '')
      .replace(/^\bto\b/i, '')
      .replace(/^\bfor me to\b/i, '')
      .replace(/^\bit(?:'s| is)\b/i, '')
  );
}

function parseCreateAction({ latestUserMessage, input = {} }) {
  const explicitTitle = normalizeText(input.title);
  const explicitDetails = normalizeText(input.details);
  const explicitDueDateText = normalizeText(input.dueDateText);

  if (explicitTitle) {
    return {
      title: explicitTitle,
      details: explicitDetails,
      dueDateText: explicitDueDateText,
    };
  }

  const extracted = extractDueDateText(latestUserMessage);
  const title = stripCreatePrefixes(extracted.remainingText);

  return {
    title,
    details: explicitDetails,
    dueDateText: explicitDueDateText || extracted.dueDateText,
  };
}

function parseStatusAction({ latestUserMessage, input = {} }) {
  const explicitStatus = normalizeStatus(input.status);
  const explicitTodoId = normalizeText(input.todoId);
  const explicitTodoTitle = normalizeText(input.todoTitle);

  if (explicitStatus && (explicitTodoId || explicitTodoTitle)) {
    return {
      status: explicitStatus,
      todoId: explicitTodoId,
      todoTitle: explicitTodoTitle,
    };
  }

  const text = String(latestUserMessage || '');
  const todoIdMatch = text.match(/\b(?:task|todo)\s+id\s+([A-Za-z0-9_-]+)\b/i) || text.match(/\b(?:task|todo)\s+([A-Za-z0-9_-]{6,})\b/i);
  const quotedTitleMatch = text.match(/["“](.+?)["”]/);
  const statusMatch = text.match(/\b(todo|working|blocked|done|archived|archive|delete|deleted|complete|completed)\b/i);

  return {
    status: normalizeStatus(statusMatch?.[1] || ''),
    todoId: explicitTodoId || normalizeText(todoIdMatch?.[1] || ''),
    todoTitle: explicitTodoTitle || normalizeText(quotedTitleMatch?.[1] || ''),
  };
}

function parseDueDateFollowup({ latestUserMessage, input = {} }) {
  const dueDateText = normalizeText(input.dueDateText || latestUserMessage);
  return {
    dueDateText,
    todoId: normalizeText(input.todoId),
  };
}

function parseTaskReference(text, explicitTodoTitle = '', explicitTodoId = '') {
  if (explicitTodoId || explicitTodoTitle) {
    return {
      todoId: normalizeText(explicitTodoId),
      todoTitle: normalizeText(explicitTodoTitle),
    };
  }

  const value = String(text || '').trim();
  const todoIdMatch = value.match(/\b(?:task|todo)\s+id\s+([A-Za-z0-9_-]+)\b/i) || value.match(/\b(?:task|todo)\s+([A-Za-z0-9_-]{6,})\b/i);
  if (todoIdMatch?.[1]) {
    return {
      todoId: normalizeText(todoIdMatch[1]),
      todoTitle: '',
    };
  }

  const quotedTitleMatch = value.match(/["“](.+?)["”]/);
  if (quotedTitleMatch?.[1]) {
    return {
      todoId: '',
      todoTitle: normalizeText(quotedTitleMatch[1]),
    };
  }

  const dueTitleMatch = value.match(/\b(?:task|todo)\s+(.+?)\s+due\??$/i);
  if (dueTitleMatch?.[1]) {
    return {
      todoId: '',
      todoTitle: normalizeText(dueTitleMatch[1]),
    };
  }

  const aboutTitleMatch = value.match(/\b(?:task|todo)\s+(.+?)\??$/i);
  if (aboutTitleMatch?.[1] && /\b(when|what|tell me|show me|status|details)\b/i.test(value)) {
    return {
      todoId: '',
      todoTitle: normalizeText(aboutTitleMatch[1]),
    };
  }

  return {
    todoId: '',
    todoTitle: '',
  };
}

function parseLookupAction({ latestUserMessage, input = {} }) {
  const detailType = normalizeText(input.detailType).toLowerCase();
  const reference = parseTaskReference(latestUserMessage, input.todoTitle, input.todoId);
  const text = String(latestUserMessage || '').toLowerCase();
  const inputStatus = normalizeStatus(input.status || '');
  const inputDueDateText = normalizeText(input.dueDateText || '');

  if (detailType) {
    return {
      ...reference,
      detailType,
      status: inputStatus,
      dueDateText: inputDueDateText,
    };
  }

  if (/\bdue\b|\bdeadline\b/.test(text)) {
    return {
      ...reference,
      detailType: 'due_date',
    };
  }

  if (/\bstatus\b/.test(text)) {
    return {
      ...reference,
      detailType: 'status',
    };
  }

  if (/\bdetails?\b/.test(text)) {
    return {
      ...reference,
      detailType: 'details',
    };
  }

  return {
    ...reference,
    detailType: 'summary',
    status: inputStatus,
    dueDateText: inputDueDateText,
  };
}

function extractRequestedStatus(text) {
  const normalized = String(text || '').toLowerCase();
  if (/\barchived?\b/.test(normalized) || /\bdeleted?\b/.test(normalized)) {
    return 'Archived';
  }
  if (/\bblocked\b/.test(normalized)) {
    return 'Blocked';
  }
  if (/\bworking\b/.test(normalized) || /\bin progress\b/.test(normalized)) {
    return 'Working';
  }
  if (/\bdone\b/.test(normalized) || /\bcompleted?\b/.test(normalized)) {
    return 'Done';
  }
  if (/\btodo\b|\bto do\b/.test(normalized)) {
    return 'ToDo';
  }
  return '';
}

function looksLikeTodoListQuery(text) {
  const normalized = String(text || '').toLowerCase();
  return [
    /\bwhat\b.*\b(tasks|todos)\b/,
    /\bwhich\b.*\b(tasks|todos)\b/,
    /\bdo i have any\b.*\b(tasks|todos)\b/,
    /\bdo (?:i )?have any\b.*\b(tasks|todos)\b/,
    /\bdo (?:i )?have\b.*\b(tasks|todos)\b/,
    /\bdo i have any\b.*\bdue\b/,
    /\bdo (?:i )?have any\b.*\bdue\b/,
    /\bdo (?:i )?have\b.*\bdue\b/,
    /\bwhat\b.*\b(tasks|todos)\b.*\bdue\b/,
    /\bwhich\b.*\b(tasks|todos)\b.*\bdue\b/,
    /\bhow many\b.*\b(tasks|todos)\b/,
    /\bshow me\b.*\b(tasks|todos)\b/,
    /\blist\b.*\b(tasks|todos)\b/,
    /\blist all of them\b/,
    /\bshow all of them\b/,
    /\bany\b.*\barchived tasks\b/,
    /\bany\b.*\bblocked tasks\b/,
    /\bany\b.*\bdone tasks\b/,
    /\bany\b.*\bworking tasks\b/,
    /\bany\b.*\btasks due\b/,
    /\bany\b.*\bdue today\b/,
    /\bany\b.*\bdue tomorrow\b/,
    /\b(tasks|todos)\b.*\bare archived\b/,
    /\b(tasks|todos)\b.*\bare done\b/,
    /\b(tasks|todos)\b.*\bare blocked\b/,
    /\b(tasks|todos)\b.*\bare working\b/,
  ].some((pattern) => pattern.test(normalized));
}

function isCountQuery(text) {
  return /\bhow many\b/i.test(String(text || ''));
}

function isListAllFollowup(text, pendingTodoQuery) {
  if (!pendingTodoQuery) {
    return false;
  }

  return /\b(list|show)\s+all\b|\ball of them\b/i.test(String(text || ''));
}

function buildSearchKeywords(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .filter((word) => ![
      'any',
      'all',
      'many',
      'have',
      'list',
      'show',
      'task',
      'tasks',
      'todo',
      'todos',
      'due',
      'about',
      'tell',
      'what',
      'when',
      'with',
      'your',
      'mine',
      'supposed',
      'check',
      'marked',
      'that',
      'today',
      'are',
      'did',
      'there',
      'them',
      'this',
      'these',
      'those',
    ].includes(word));
}

function determineAction({ latestUserMessage, input = {}, context = {} }) {
  const explicitAction = normalizeText(input.action).toLowerCase();
  if (context?.pendingTodoFollowup) {
    return 'set_todo_due_date';
  }

  if (looksLikeTodoQuery(latestUserMessage) || looksLikeTodoListQuery(latestUserMessage) || isListAllFollowup(latestUserMessage, context?.pendingTodoQuery)) {
    return 'get_todo_details';
  }

  if (explicitAction) {
    return explicitAction;
  }

  const normalized = String(latestUserMessage || '').trim().toLowerCase();
  if (/\b(add|create|make|set up)\b/.test(normalized) && /\b(task|todo|reminder)\b/.test(normalized)) {
    return 'create_todo';
  }

  if (/\bremind me to\b/.test(normalized)) {
    return 'create_todo';
  }

  if (/\b(set|mark|change|update|delete|archive)\b/.test(normalized) && /\b(task|todo)\b/.test(normalized)) {
    return 'update_todo_status';
  }

  return '';
}

function shouldDirectHandle({ latestUserMessage, context = {} }) {
  return Boolean(determineAction({
    latestUserMessage,
    input: {},
    context,
  }));
}

async function createTodoAction({ latestUserMessage, input, context }) {
  const parsed = parseCreateAction({ latestUserMessage, input });
  if (!parsed.title) {
    return {
      message: 'What would you like the task title to be?',
      sessionStatePatch: context.pendingTodoFollowup || null,
    };
  }

  const dueDate = parseNaturalDueDate(parsed.dueDateText, context.tenantTimeZone);
  if (parsed.dueDateText && dueDate.ambiguous) {
    return {
      message: `I can create that task, but I need a date for "${parsed.dueDateText}". What due date should I use?`,
      sessionStatePatch: context.pendingTodoFollowup || null,
    };
  }

  const record = await createTodo({
    authToken: context.authToken,
    payload: {
      tenant: context.tenantId,
      title: parsed.title,
      status: 'ToDo',
      dueDate: dueDate.iso || null,
      details: parsed.details || '',
      ownerType: 'user',
      ownerUser: context.currentUserId,
      ownerLabel: '',
      createdBy: context.currentUserId,
      priority: '',
    },
  });

  if (dueDate.iso) {
    return {
      message: `Task ${record.id} created with a due date of ${dueDate.display}.`,
      sessionStatePatch: null,
    };
  }

  return {
    message: `Task ${record.id} created with no due date, would you like to set a due date?`,
    sessionStatePatch: {
      todoId: record.id,
      title: parsed.title,
      action: 'awaiting_due_date',
    },
  };
}

async function resolveTodoForStatusUpdate({ parsed, context }) {
  if (parsed.todoId) {
    const todo = await getOwnedTodoById({
      authToken: context.authToken,
      todoId: parsed.todoId,
      tenantId: context.tenantId,
      currentUserId: context.currentUserId,
      tenantTimeZone: context.tenantTimeZone,
    });

    if (!todo) {
      return {
        error: "That ID doesn't match your current todos, please provide the ID.",
      };
    }

    return { todo };
  }

  if (!parsed.todoTitle) {
    return {
      error: 'Please provide the task ID or exact task title you want to update.',
    };
  }

  const matches = await findTodosForUserByTitle({
    authToken: context.authToken,
    tenantId: context.tenantId,
    currentUserId: context.currentUserId,
    title: parsed.todoTitle,
    tenantTimeZone: context.tenantTimeZone,
  });

  if (!matches.length) {
    return {
      error: `I couldn't find a current task titled "${parsed.todoTitle}". Please provide the task ID.`,
    };
  }

  if (matches.length > 1) {
    const options = matches
      .slice(0, 5)
      .map((todo) => `- ${todo.id}: ${todo.title} (${todo.status})`)
      .join('\n');
    return {
      error: `I found multiple matching tasks. Please provide the task ID.\n${options}`,
    };
  }

  return { todo: matches[0] };
}

async function resolveTodoForLookup({ parsed, context }) {
  if (!parsed.todoId && !parsed.todoTitle) {
    const todos = await listTodosForTenant({
      authToken: context.authToken,
      tenantId: context.tenantId,
      currentUserId: context.currentUserId,
      tenantUsers: [],
      tenantTimeZone: context.tenantTimeZone,
      status: 'All',
    });
    const keywords = buildSearchKeywords(parsed.searchText || '');

    if (keywords.length) {
      const rankedMatches = todos
        .map((todo) => {
          const haystack = `${String(todo.title || '')} ${String(todo.details || '')}`.toLowerCase();
          const score = keywords.reduce((total, word) => total + (haystack.includes(word) ? 1 : 0), 0);
          return { todo, score };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score);

      if (rankedMatches.length === 1 || (rankedMatches[0] && rankedMatches[0].score > (rankedMatches[1]?.score || 0))) {
        return { todo: rankedMatches[0].todo };
      }

      if (rankedMatches.length > 1) {
        const options = rankedMatches
          .slice(0, 5)
          .map((item) => `- ${item.todo.id}: ${item.todo.title} (${item.todo.status})`)
          .join('\n');
        return {
          error: `I found multiple matching tasks. Please provide the task ID.\n${options}`,
        };
      }
    }
  }

  return resolveTodoForStatusUpdate({
    parsed: {
      todoId: parsed.todoId,
      todoTitle: parsed.todoTitle,
    },
    context,
  });
}

async function listTodosForLookup({ parsed, context }) {
  const searchText = parsed.searchText || '';
  const requestedStatus = normalizeStatus(parsed.status || '') || extractRequestedStatus(searchText) || 'ToDo';
  const tenantTimeZone = resolveTenantTimeZone(context.tenantTimeZone);
  const todos = await listTodosForTenant({
    authToken: context.authToken,
    tenantId: context.tenantId,
    currentUserId: context.currentUserId,
    tenantUsers: [],
    tenantTimeZone: context.tenantTimeZone,
    status: 'All',
  });

  let matches = todos;

  if (requestedStatus) {
    matches = matches.filter((todo) => todo.status === requestedStatus);
  }

  if (/\bdue\b/.test(String(searchText).toLowerCase()) || /\b(today|tomorrow|next\s+\w+)\b/i.test(parsed.dueDateText || '')) {
    matches = matches.filter((todo) => todo.rawDueDate);
  }

  if (/\btoday\b|\btomorrow\b/.test(String(searchText).toLowerCase()) || /\btoday\b|\btomorrow\b/i.test(parsed.dueDateText || '')) {
    const baseDate = new Date();
    if (/\btomorrow\b/.test(String(searchText).toLowerCase()) || /\btomorrow\b/i.test(parsed.dueDateText || '')) {
      baseDate.setDate(baseDate.getDate() + 1);
    }

    const targetDay = new Intl.DateTimeFormat('en-CA', {
      timeZone: tenantTimeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(baseDate);

    matches = matches.filter((todo) => {
      if (!todo.rawDueDate) {
        return false;
      }

      const dueDay = new Intl.DateTimeFormat('en-CA', {
        timeZone: tenantTimeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(todo.rawDueDate));

      return dueDay === targetDay;
    });
  }

  const keywords = buildSearchKeywords(searchText);
  if (keywords.length) {
    matches = matches.filter((todo) => {
      const haystack = `${String(todo.title || '')} ${String(todo.details || '')}`.toLowerCase();
      return keywords.some((word) => haystack.includes(word));
    });
  }

  return matches;
}

async function updateTodoStatusAction({ latestUserMessage, input, context }) {
  const parsed = parseStatusAction({ latestUserMessage, input });
  if (!parsed.status || !VALID_STATUSES.includes(parsed.status)) {
    return {
      message: 'Please tell me which status to use: ToDo, Working, Blocked, Done, or Archived.',
      sessionStatePatch: context.pendingTodoFollowup || null,
    };
  }

  const resolved = await resolveTodoForStatusUpdate({ parsed, context });
  if (resolved.error) {
    return {
      message: resolved.error,
      sessionStatePatch: context.pendingTodoFollowup || null,
    };
  }

  await updateTodo({
    authToken: context.authToken,
    todoId: resolved.todo.id,
    payload: {
      status: parsed.status,
    },
  });

  return {
    message: `Task ${resolved.todo.id} updated to ${parsed.status}.`,
    sessionStatePatch: null,
  };
}

async function updateTodoDueDateAction({ latestUserMessage, input, context }) {
  const parsed = parseDueDateFollowup({ latestUserMessage, input });
  const pending = context.pendingTodoFollowup || null;
  const todoId = parsed.todoId || pending?.todoId || '';

  if (!todoId) {
    return {
      message: 'Please tell me which task ID to update and what due date to use.',
      sessionStatePatch: pending,
    };
  }

  const dueDate = parseNaturalDueDate(parsed.dueDateText, context.tenantTimeZone);
  if (!parsed.dueDateText || dueDate.ambiguous || !dueDate.iso) {
    return {
      message: 'Please provide the due date and time you want to use.',
      sessionStatePatch: pending || { todoId, action: 'awaiting_due_date' },
    };
  }

  const todo = await getOwnedTodoById({
    authToken: context.authToken,
    todoId,
    tenantId: context.tenantId,
    currentUserId: context.currentUserId,
    tenantTimeZone: context.tenantTimeZone,
  });

  if (!todo) {
    return {
      message: "That ID doesn't match your current todos, please provide the ID.",
      sessionStatePatch: pending,
    };
  }

  await updateTodo({
    authToken: context.authToken,
    todoId,
    payload: {
      dueDate: dueDate.iso,
    },
  });

  return {
    message: `Task ${todoId} due date set to ${dueDate.display}.`,
    sessionStatePatch: null,
  };
}

async function getTodoDetailsAction({ latestUserMessage, input, context }) {
  const parsed = parseLookupAction({ latestUserMessage, input });
  parsed.searchText = latestUserMessage;

  if (isListAllFollowup(latestUserMessage, context.pendingTodoQuery)) {
    parsed.searchText = context.pendingTodoQuery.searchText || '';
    parsed.status = context.pendingTodoQuery.status || '';
  }

  const shouldList = looksLikeTodoListQuery(latestUserMessage)
    || (!parsed.todoId && !parsed.todoTitle && (parsed.status || parsed.dueDateText));

  if (shouldList) {
    const matches = await listTodosForLookup({ parsed, context });
    const requestedStatus = normalizeStatus(parsed.status || '') || extractRequestedStatus(parsed.searchText || latestUserMessage) || 'ToDo';

    if (!matches.length) {
      if (requestedStatus) {
        return {
          message: `You don't have any ${requestedStatus.toLowerCase()} tasks right now.`,
          sessionStatePatch: {
            pendingTodoFollowup: context.pendingTodoFollowup || null,
            pendingTodoQuery: null,
          },
        };
      }

      return {
        message: "I couldn't find any matching tasks right now.",
        sessionStatePatch: {
          pendingTodoFollowup: context.pendingTodoFollowup || null,
          pendingTodoQuery: null,
        },
      };
    }

    if (isCountQuery(latestUserMessage)) {
      const label = requestedStatus ? requestedStatus.toLowerCase() : 'matching';
      return {
        message: `You have ${matches.length} ${label} task${matches.length === 1 ? '' : 's'}. Would you like me to list all of them?`,
        sessionStatePatch: {
          pendingTodoFollowup: context.pendingTodoFollowup || null,
          pendingTodoQuery: {
            searchText: parsed.searchText || latestUserMessage,
            status: requestedStatus || '',
          },
        },
      };
    }

    const lines = matches
      .slice(0, 5)
      .map((todo) => {
        const dueText = todo.rawDueDate ? `, due ${formatDueDateForResponse(todo.rawDueDate)}` : '';
        return `- ${todo.id}: ${todo.title} (${todo.status}${dueText})`;
      });

    const intro = requestedStatus
      ? `Here ${matches.length === 1 ? 'is' : 'are'} your ${requestedStatus.toLowerCase()} task${matches.length === 1 ? '' : 's'}:`
      : `Here ${matches.length === 1 ? 'is' : 'are'} the matching task${matches.length === 1 ? '' : 's'} I found:`;

    return {
      message: [intro, ...lines].join('\n'),
      sessionStatePatch: {
        pendingTodoFollowup: context.pendingTodoFollowup || null,
        pendingTodoQuery: {
          searchText: parsed.searchText || latestUserMessage,
          status: requestedStatus || '',
        },
      },
    };
  }

  const resolved = await resolveTodoForLookup({ parsed, context });

  if (resolved.error) {
    return {
      message: resolved.error.replace('update', 'look up'),
      sessionStatePatch: context.pendingTodoFollowup || null,
    };
  }

  const todo = resolved.todo;

  if (parsed.detailType === 'due_date') {
    if (todo.rawDueDate) {
      return {
        message: `Task ${todo.id} is due ${formatDueDateForResponse(todo.rawDueDate)}.`,
        sessionStatePatch: context.pendingTodoFollowup || null,
      };
    }

    return {
      message: `Task ${todo.id} has no due date set.`,
      sessionStatePatch: context.pendingTodoFollowup || null,
    };
  }

  if (parsed.detailType === 'status') {
    return {
      message: `Task ${todo.id} is currently ${todo.status}.`,
      sessionStatePatch: context.pendingTodoFollowup || null,
    };
  }

  if (parsed.detailType === 'details') {
    return {
      message: todo.details
        ? `Task ${todo.id} details: ${todo.details}`
        : `Task ${todo.id} has no additional details.`,
      sessionStatePatch: context.pendingTodoFollowup || null,
    };
  }

  return {
    message: [
      `Task ${todo.id}: ${todo.title}`,
      `Status: ${todo.status}`,
      todo.rawDueDate ? `Due: ${formatDueDateForResponse(todo.rawDueDate)}` : 'Due: No due date set',
      todo.details ? `Details: ${todo.details}` : '',
    ].filter(Boolean).join('\n'),
    sessionStatePatch: context.pendingTodoFollowup || null,
  };
}

async function execute({ input = {}, context = {}, latestUserMessage = '' }) {
  const action = determineAction({ latestUserMessage, input, context });

  if (action === 'create_todo') {
    return createTodoAction({ latestUserMessage, input, context });
  }

  if (action === 'update_todo_status') {
    return updateTodoStatusAction({ latestUserMessage, input, context });
  }

  if (action === 'set_todo_due_date') {
    return updateTodoDueDateAction({ latestUserMessage, input, context });
  }

  if (action === 'get_todo_details') {
    return getTodoDetailsAction({ latestUserMessage, input, context });
  }

  return {
    message: 'I can create tasks, update task statuses, or set due dates. Tell me what task you want to manage.',
    sessionStatePatch: context.pendingTodoFollowup || null,
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
