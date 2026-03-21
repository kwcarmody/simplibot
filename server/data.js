const brandMark = `<svg viewBox="0 0 40 48" fill="none" aria-hidden="true"><path d="M1.278 27.136c-.019-2.147 2.3-4.5 2.284-7.093s-.028-5.33-.028-8.217a18.024 18.024 0 0 1 .5-4.164 9.359 9.359 0 0 1 1.915-3.831 9.936 9.936 0 0 1 3.942-2.776C11.575.356 22.18 0 24.882 0a23.09 23.09 0 0 1 5.386.611 11.729 11.729 0 0 1 4.5 2.11 10.594 10.594 0 0 1 3.109 4 14.682 14.682 0 0 1 1.166 6.218 14.357 14.357 0 0 1-1.277 6.44c-.851 1.7-1.717 3.406-3.4 4.364s-2.023 1.534-5.758 1.8-12.909.611-15.463.611H11.252q-.944 0-2.11-.111s-7.842 3.247-7.864 1.1ZM33.488 12.825a7.189 7.189 0 0 0-2.082-5.608q-2.082-1.888-6.912-1.888c-1.221 0-10.679.1-11.549.305A4.745 4.745 0 0 0 10.807 6.69a4.558 4.558 0 0 0-1.249 2.027 10.548 10.548 0 0 0-.416 3.22c0 .22-.1 3.551 0 4.292.932 3.3 1.9 3.774 6.5 4.017 3.53.116 5.719 0 6.644 0 8.34.009 9.747-1.484 10.376-2.539a10.876 10.876 0 0 0 .832-4.882Z" fill="#6984ed" stroke="#6984ed" stroke-width="1"/><path d="M11.784 0c6.51 0 11.655.183 11.788 2.806S18.294 5.611 11.784 5.611.208 5.748 0 2.805 5.273 0 11.784 0Z" transform="translate(10.359 36.596)" fill="#6984ed"/></svg>`;

const navItems = [
  { id: "home", label: "Home", icon: "uil uil-estate", href: "/home" },
  { id: "chat", label: "Chat", icon: "uil uil-comment-message", href: "/chat" },
  { id: "tools", label: "Tools", icon: "uil uil-wrench", href: "/tools" },
  { id: "todos", label: "ToDos", icon: "uil uil-check-circle", href: "/todos" },
  { id: "reports", label: "Reports", icon: "uil uil-chart-line", href: "/reports" },
  { id: "channels", label: "Channels", icon: "uil uil-comments", href: "/channels" },
  { id: "settings", label: "Settings", icon: "uil uil-setting", href: "/settings" },
  { id: "docs", label: "Docs", icon: "uil uil-book-open", href: "/docs" },
];

const toolOptions = ["Web Search", "Calendar", "Filesystem", "CRM", "Automation"];

const initialState = {
  profile: {
    fullName: "Kevin Carmody",
    role: "Operator",
    email: "kevin@company.com",
    phone: "+1 (555) 010-4021",
    location: "New York, NY",
    timezone: "America/New_York",
    company: "Pikori",
    bio: "Builder focused on agentic tooling, operations workflows, and crisp internal products.",
  },
  settings: {
    model: {
      provider: "None",
      model: "",
      apiKey: "",
      endpoint: "",
    },
    memory: {
      enabled: false,
      maxSize: 100,
      userName: "User",
      userDescription: "",
      botName: "Pikori",
      botDescription: "You're a helpful robot assistant.",
    },
    tools: {
      apiBase: "api.people.engineering",
      apiKey: "sk-demo-people-engineering",
    },
    channels: {
      telegramToken: "",
      emailAddress: "ops@company.com",
      emailPassword: "",
      emailServer: "smtp.mailserver.com",
      emailPort: "587",
    },
  },
  actions: [
    {
      id: "todos",
      title: "ToDos",
      description: "Review priorities, due dates, and blockers across the queue.",
      icon: "uil uil-check-circle",
      route: "/todos",
    },
    {
      id: "reports",
      title: "Reports",
      description: "Launch static analysis runs and summarize operating signals.",
      icon: "uil uil-chart-line",
      route: "/reports",
    },
    {
      id: "tools",
      title: "Tools",
      description: "Enable capabilities for search, retrieval, and automation.",
      icon: "uil uil-wrench",
      route: "/tools",
    },
    {
      id: "mail",
      title: "Mail",
      description: "Jump into connected channels and respond across inboxes.",
      icon: "uil uil-envelope",
      route: "/channels",
    },
  ],
  chatMessages: [],
  memories: [],
  tools: [
    {
      id: "web-search",
      title: "Web Search",
      description: "Pull external context into agent decisions.",
      enabled: true,
      config: {
        endpoint: "https://search.internal",
        scope: "Workspace",
        refresh: "5 min",
        notes: "Prioritize approved sources and internal workspace context.",
      },
    },
    {
      id: "calendar",
      title: "Calendar",
      description: "Schedule work blocks and reminder prompts.",
      enabled: true,
      config: {
        endpoint: "calendar://default",
        scope: "Personal",
        refresh: "15 min",
        notes: "Sync working hours and event reminders.",
      },
    },
    {
      id: "filesystem",
      title: "Filesystem",
      description: "Read and update approved local workspace files.",
      enabled: true,
      config: {
        endpoint: "file:///workspace",
        scope: "Approved paths",
        refresh: "On demand",
        notes: "Allow read/write access only within approved roots.",
      },
    },
    {
      id: "monitoring",
      title: "Monitoring",
      description: "Inspect incidents, logs, and service health snapshots.",
      enabled: false,
      config: {
        endpoint: "https://monitoring.internal",
        scope: "Ops",
        refresh: "1 min",
        notes: "Collect active incidents and service health summaries.",
      },
    },
    {
      id: "crm",
      title: "CRM",
      description: "Reference account notes and customer contact state.",
      enabled: true,
      config: {
        endpoint: "https://crm.internal",
        scope: "Sales",
        refresh: "30 min",
        notes: "Read account details and customer contact history.",
      },
    },
    {
      id: "automation",
      title: "Automation",
      description: "Trigger recurring workflows and asynchronous jobs.",
      enabled: true,
      config: {
        endpoint: "automation://jobs",
        scope: "Workspace",
        refresh: "10 min",
        notes: "Queue and monitor recurring jobs with approval gates.",
      },
    },
  ],
  todos: [
    {
      id: "TD-104",
      title: "Review onboarding agent prompts",
      status: "Working",
      owner: "Kevin",
      dueDate: "Today",
      details: "Tighten the system prompt and trim duplicate instructions before demo prep.",
      priority: "High",
    },
    {
      id: "TD-105",
      title: "Upload Q2 finance CSV",
      status: "ToDo",
      owner: "Operations",
      dueDate: "Today",
      details: "Finance shared the export. Needs import validation against the reporting schema.",
      priority: "Medium",
    },
    {
      id: "TD-110",
      title: "Rotate Telegram bot token",
      status: "Blocked",
      owner: "Infra",
      dueDate: "Tomorrow",
      details: "Waiting on new secrets from the infrastructure vault workflow.",
      priority: "High",
    },
    {
      id: "TD-111",
      title: "Archive resolved hiring tasks",
      status: "Done",
      owner: "Sam",
      dueDate: "Tomorrow",
      details: "Clean up completed tasks from the recruiting board before the weekly summary runs.",
      priority: "Low",
    },
    {
      id: "TD-118",
      title: "Draft incident report follow-up",
      status: "ToDo",
      owner: "Kevin",
      dueDate: "Mar 22",
      details: "Add action items, owners, and postmortem links for the customer-facing update.",
      priority: "High",
    },
    {
      id: "TD-119",
      title: "Refine knowledge base sync",
      status: "Archived",
      owner: "System",
      dueDate: "Mar 22",
      details: "Superseded by the new unified document ingestion pipeline.",
      priority: "Low",
    },
  ],
  reports: [
    {
      id: "ops-digest",
      title: "Ops Digest",
      description: "Summarize system health, open blockers, and SLA drift.",
      config: {
        audience: "Operations",
        output: "Summary",
        frequency: "Daily",
        notes: "Include open incidents, blockers, and SLA drift callouts.",
      },
    },
    {
      id: "tool-usage",
      title: "Tool Usage",
      description: "Review enabled tools, adoption trends, and disabled capabilities.",
      config: {
        audience: "Product",
        output: "Detailed",
        frequency: "Weekly",
        notes: "Highlight enabled tools, adoption shifts, and disabled capabilities.",
      },
    },
    {
      id: "channel-check",
      title: "Channel Check",
      description: "Audit connected messaging channels and delivery readiness.",
      config: {
        audience: "Support",
        output: "Executive",
        frequency: "On demand",
        notes: "Focus on delivery readiness and any missing credentials.",
      },
    },
  ],
  channels: [
    {
      id: "telegram",
      title: "Telegram",
      description: "Receive bot commands and outbound agent notifications.",
      enabled: true,
      config: {
        endpoint: "https://api.telegram.org",
        identity: "@pikori_ops_bot",
        delivery: "Instant",
        notes: "Used for bot commands and urgent outbound notifications.",
      },
    },
    {
      id: "email",
      title: "Email",
      description: "Handle inbound summaries, approvals, and report distribution.",
      enabled: true,
      config: {
        endpoint: "smtp.mailserver.com",
        identity: "ops@company.com",
        delivery: "Digest",
        notes: "Use for summaries, approvals, and scheduled report delivery.",
      },
    },
    {
      id: "text-messaging",
      title: "Text Messaging",
      description: "Send SMS alerts and lightweight follow-ups to mobile recipients.",
      enabled: false,
      config: {
        endpoint: "https://sms.gateway.internal",
        identity: "+1 (555) 010-4477",
        delivery: "Instant",
        notes: "Use for urgent alerts, OTP-style prompts, and short customer follow-ups.",
      },
    },
  ],
};

function cloneState() {
  return structuredClone(initialState);
}

function computeStats(state) {
  return {
    activeTodos: state.todos.filter((item) => !["Done", "Archived"].includes(item.status)).length,
    enabledTools: state.tools.filter((item) => item.enabled).length,
    messagesToday: 19,
    activeChannels: state.channels.filter((item) => item.enabled).length,
  };
}

function normalizeString(value) {
  return String(value || "").trim().toLowerCase();
}

function groupTodos(todos) {
  return todos.reduce((groups, todo) => {
    const key = todo.dueDate;
    groups[key] = groups[key] || [];
    groups[key].push(todo);
    return groups;
  }, {});
}

function getMemoryResults(state, query) {
  const search = normalizeString(query.memorySearch);
  const type = query.memoryType || "All";
  return state.memories.filter((memory) => {
    const matchesSearch = [memory.id, memory.title, memory.content, memory.type].some((value) =>
      value.toLowerCase().includes(search)
    );
    const matchesType = type === "All" || memory.type === type;
    return matchesSearch && matchesType;
  });
}

function getViewModel(route, query = {}, auth = null, extras = {}) {
  const state = cloneState();
  const features = normalizeFeatureMap(auth?.authorization?.features);
  const activeNavItems = navItems.filter((item) => features[item.id] !== false);
  const actions = state.actions.filter((item) => {
    const routeKey = item.route.replace("/", "");
    return features[routeKey] !== false;
  });

  if (auth?.user) {
    state.profile.fullName = auth.user.name || state.profile.fullName;
    state.profile.email = auth.user.email || state.profile.email;
  }

  if (auth?.api) {
    state.settings.tools.apiBase = auth.api.endpoint || state.settings.tools.apiBase;
  }

  if (extras.settingsOverride) {
    state.settings = {
      ...state.settings,
      ...Object.fromEntries(
        Object.entries(extras.settingsOverride).map(([key, value]) => [
          key,
          value && typeof value === "object"
            ? {
                ...(state.settings[key] || {}),
                ...value,
              }
            : value,
        ])
      ),
    };
  }

  const effectiveTools = extras.tools || state.tools;
  const effectiveTodos = extras.todos || state.todos;
  const stats = computeStats({ ...state, tools: effectiveTools, todos: effectiveTodos });
  const selectedTodo = extras.selectedTodo || effectiveTodos.find((item) => item.id === query.todo) || null;
  const toolSearch = String(query.toolSearch || "");
  const reportSearch = String(query.reportSearch || "");
  const todoSearch = String(query.todoSearch || "");
  const todoStatus = String(query.todoStatus || "ToDo");
  const selectedTool = String(query.selectedTool || toolOptions[0]);

  const visibleTools = effectiveTools.filter((tool) =>
    [tool.title, tool.description].some((value) => value.toLowerCase().includes(normalizeString(toolSearch)))
  );
  const visibleReports = state.reports.filter((report) =>
    [report.title, report.description].some((value) => value.toLowerCase().includes(normalizeString(reportSearch)))
  );
  const filteredTodos = effectiveTodos.filter((todo) => {
    const matchesSearch = [todo.id, todo.title, todo.owner, todo.details].some((value) =>
      value.toLowerCase().includes(normalizeString(todoSearch))
    );
    const matchesStatus = todoStatus === "All" || todo.status === todoStatus;
    return matchesSearch && matchesStatus;
  });

  const memoryResults = getMemoryResults(state, query);

  return {
    route,
    title: route === "home" ? "Pikori" : `${capitalize(route)} | Pikori`,
    appName: "Pikori",
    appTagline: "Agentic Control Surface",
    brandMark,
    navItems: activeNavItems,
    toolOptions,
    selectedTool,
    stats,
    profile: state.profile,
    settings: state.settings,
    actions,
    chatMessages: extras.chatMessages || state.chatMessages,
    tools: effectiveTools,
    visibleTools,
    reports: state.reports,
    visibleReports,
    channels: state.channels,
    todos: effectiveTodos,
    filteredTodos,
    groupedTodos: groupTodos(filteredTodos),
    memories: state.memories,
    memoryResults,
    memoryFilters: {
      search: String(query.memorySearch || ""),
      type: String(query.memoryType || "All"),
    },
    filters: {
      toolSearch,
      reportSearch,
      todoSearch,
      todoStatus,
    },
    selectedTodo,
    selectedToolConfig: state.tools.find((item) => item.id === query.configureTool) || null,
    selectedReportConfig: state.reports.find((item) => item.id === query.configureReport) || null,
    selectedChannelConfig: state.channels.find((item) => item.id === query.configureChannel) || null,
    showMemoryDrawer: route === "settings" && query.drawer === "memory",
    auth,
    signin: extras.signin || {
      email: "",
      error: "",
    },
    docs: extras.docs || null,
    tenant: extras.tenant || null,
    isNewTodo: Boolean(extras.isNewTodo),
  };
}

function capitalize(value) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

function normalizeFeatureMap(features) {
  return {
    home: true,
    chat: true,
    tools: true,
    todos: true,
    reports: true,
    channels: true,
    settings: true,
    profile: true,
    docs: false,
    ...(features || {}),
  };
}

module.exports = {
  brandMark,
  navItems,
  toolOptions,
  getViewModel,
};
