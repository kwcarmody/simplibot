const initialState = {
  sidebarMinimized: false,
  mobileMenuOpen: false,
  currentRoute: "home",
  todoFlyoutId: null,
  toolDrawerId: null,
  reportDrawerId: null,
  channelDrawerId: null,
  memoryDrawerOpen: false,
  selectedTool: "Web Search",
  memoryFilters: {
    search: "",
    type: "All",
  },
  profile: {
    fullName: "Kevin Carmody",
    role: "Operator",
    email: "kevin@company.com",
    phone: "+1 (555) 010-4021",
    location: "New York, NY",
    timezone: "America/New_York",
    company: "SimpliBot",
    bio: "Builder focused on agentic tooling, operations workflows, and crisp internal products.",
  },
  settings: {
    model: {
      provider: "Local",
      model: "GPT-4.1-mini",
      apiKey: "",
      endpoint: "http://localhost:11434/v1",
    },
    memory: {
      enabled: true,
      maxSize: 2048,
      userName: "Kevin",
      userDescription: "Founder focused on shipping useful internal tools.",
      botName: "SimpliBot",
      botDescription: "An operations-minded assistant that coordinates tools and reports.",
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
  stats: {
    activeTodos: 0,
    enabledTools: 0,
    messagesToday: 19,
    activeChannels: 0,
  },
  actions: [
    {
      id: "todos",
      title: "ToDos",
      description: "Review priorities, due dates, and blockers across the queue.",
      icon: "uil uil-check-circle",
      route: "todos",
    },
    {
      id: "reports",
      title: "Reports",
      description: "Launch static analysis runs and summarize operating signals.",
      icon: "uil uil-chart-line",
      route: "reports",
    },
    {
      id: "tools",
      title: "Tools",
      description: "Enable capabilities for search, retrieval, and automation.",
      icon: "uil uil-wrench",
      route: "tools",
    },
    {
      id: "mail",
      title: "Mail",
      description: "Jump into connected channels and respond across inboxes.",
      icon: "uil uil-envelope",
      route: "channels",
    },
  ],
  chatMessages: [
    {
      id: 1,
      role: "assistant",
      author: "SimpliBot",
      text: "Morning sync is ready. Two blockers need approval and three reports finished overnight.",
      time: "08:42",
    },
    {
      id: 2,
      role: "user",
      author: "You",
      text: "Summarize the biggest blocker and prep a follow-up draft.",
      time: "08:44",
    },
    {
      id: 3,
      role: "assistant",
      author: "SimpliBot",
      text: "The deployment checklist is blocked on missing channel credentials. I drafted a concise handoff note and pinned it in Reports.",
      time: "08:44",
    },
  ],
  memories: [
    {
      id: "MEM-201",
      title: "Preferred meeting window",
      content: "Kevin prefers product and operations reviews after 1:00 PM Eastern on weekdays.",
      type: "Preference",
      savedAt: "Today",
    },
    {
      id: "MEM-202",
      title: "Workspace tone",
      content: "Responses should stay concise, practical, and bias toward shipping useful internal tools.",
      type: "Profile",
      savedAt: "Today",
    },
    {
      id: "MEM-203",
      title: "Reporting follow-up",
      content: "Weekly reports should call out blockers, tool usage shifts, and channels needing credentials.",
      type: "Workflow",
      savedAt: "Yesterday",
    },
    {
      id: "MEM-204",
      title: "Custom tools interest",
      content: "The team is interested in custom CRM and support inbox connectors once the core dashboard ships.",
      type: "Product",
      savedAt: "Mar 18",
    },
  ],
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
  filters: {
    toolSearch: "",
    reportSearch: "",
    todoSearch: "",
    todoStatus: "All",
  },
};

export const state = structuredClone(initialState);

const subscribers = new Set();

function syncStats(draft) {
  draft.stats.activeTodos = draft.todos.filter(
    (item) => !["Done", "Archived"].includes(item.status)
  ).length;
  draft.stats.enabledTools = draft.tools.filter((item) => item.enabled).length;
  draft.stats.activeChannels = draft.channels.filter((item) => item.enabled).length;
}

syncStats(state);

export function subscribe(listener) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

export function updateState(updater) {
  updater(state);
  syncStats(state);
  subscribers.forEach((listener) => listener(state));
}

export function setRoute(route) {
  updateState((draft) => {
    draft.currentRoute = route;
  });
}

export function toggleSidebar() {
  updateState((draft) => {
    draft.sidebarMinimized = !draft.sidebarMinimized;
  });
}

export function toggleMobileMenu() {
  updateState((draft) => {
    draft.mobileMenuOpen = !draft.mobileMenuOpen;
  });
}

export function closeMobileMenu() {
  updateState((draft) => {
    draft.mobileMenuOpen = false;
  });
}

export function setToolSearch(value) {
  updateState((draft) => {
    draft.filters.toolSearch = value;
  });
}

export function setReportSearch(value) {
  updateState((draft) => {
    draft.filters.reportSearch = value;
  });
}

export function setTodoSearch(value) {
  updateState((draft) => {
    draft.filters.todoSearch = value;
  });
}

export function setTodoStatus(value) {
  updateState((draft) => {
    draft.filters.todoStatus = value;
  });
}

export function toggleTool(id) {
  updateState((draft) => {
    const tool = draft.tools.find((item) => item.id === id);
    if (tool) {
      tool.enabled = !tool.enabled;
    }
  });
}

export function toggleChannel(id) {
  updateState((draft) => {
    const channel = draft.channels.find((item) => item.id === id);
    if (channel) {
      channel.enabled = !channel.enabled;
    }
  });
}

export function selectTodo(id) {
  updateState((draft) => {
    draft.todoFlyoutId = id;
    draft.toolDrawerId = null;
    draft.reportDrawerId = null;
    draft.channelDrawerId = null;
    draft.memoryDrawerOpen = false;
  });
}

export function closeTodoFlyout() {
  updateState((draft) => {
    draft.todoFlyoutId = null;
  });
}

export function openToolDrawer(id) {
  updateState((draft) => {
    draft.toolDrawerId = id;
    draft.reportDrawerId = null;
    draft.channelDrawerId = null;
    draft.todoFlyoutId = null;
    draft.memoryDrawerOpen = false;
  });
}

export function closeToolDrawer() {
  updateState((draft) => {
    draft.toolDrawerId = null;
  });
}

export function openReportDrawer(id) {
  updateState((draft) => {
    draft.reportDrawerId = id;
    draft.toolDrawerId = null;
    draft.channelDrawerId = null;
    draft.todoFlyoutId = null;
    draft.memoryDrawerOpen = false;
  });
}

export function closeReportDrawer() {
  updateState((draft) => {
    draft.reportDrawerId = null;
  });
}

export function updateReportConfigField(id, field, value) {
  updateState((draft) => {
    const report = draft.reports.find((item) => item.id === id);
    if (report) {
      report.config[field] = value;
    }
  });
}

export function openChannelDrawer(id) {
  updateState((draft) => {
    draft.channelDrawerId = id;
    draft.reportDrawerId = null;
    draft.toolDrawerId = null;
    draft.todoFlyoutId = null;
    draft.memoryDrawerOpen = false;
  });
}

export function closeChannelDrawer() {
  updateState((draft) => {
    draft.channelDrawerId = null;
  });
}

export function updateChannelConfigField(id, field, value) {
  updateState((draft) => {
    const channel = draft.channels.find((item) => item.id === id);
    if (channel) {
      channel.config[field] = value;
    }
  });
}

export function updateToolConfigField(id, field, value) {
  updateState((draft) => {
    const tool = draft.tools.find((item) => item.id === id);
    if (tool) {
      tool.config[field] = value;
    }
  });
}

export function openMemoryDrawer() {
  updateState((draft) => {
    draft.channelDrawerId = null;
    draft.reportDrawerId = null;
    draft.toolDrawerId = null;
    draft.memoryDrawerOpen = true;
    draft.todoFlyoutId = null;
  });
}

export function closeMemoryDrawer() {
  updateState((draft) => {
    draft.memoryDrawerOpen = false;
  });
}

export function setMemorySearch(value) {
  updateState((draft) => {
    draft.memoryFilters.search = value;
  });
}

export function setMemoryType(value) {
  updateState((draft) => {
    draft.memoryFilters.type = value;
  });
}

export function deleteMemory(id) {
  updateState((draft) => {
    draft.memories = draft.memories.filter((memory) => memory.id !== id);
  });
}

export function updateTodoField(id, field, value) {
  updateState((draft) => {
    const todo = draft.todos.find((item) => item.id === id);
    if (todo) {
      todo[field] = value;
    }
  });
}

export function setSelectedTool(value) {
  updateState((draft) => {
    draft.selectedTool = value;
  });
}

export function updateSetting(section, field, value) {
  updateState((draft) => {
    draft.settings[section][field] = value;
  });
}

export function updateProfileField(field, value) {
  updateState((draft) => {
    draft.profile[field] = value;
  });
}

export function clearMemory() {
  updateState((draft) => {
    draft.settings.memory.maxSize = 0;
    draft.settings.memory.userDescription = "";
    draft.settings.memory.botDescription = "";
    draft.memories = [];
  });
}

export function sendMessage(message) {
  if (!message.trim()) {
    return;
  }

  updateState((draft) => {
    draft.chatMessages.push({
      id: Date.now(),
      role: "user",
      author: "You",
      text: message.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });

    draft.chatMessages.push({
      id: Date.now() + 1,
      role: "assistant",
      author: "SimpliBot",
      text: `Placeholder response: queued "${message.trim()}" with ${draft.selectedTool}.`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });

    draft.stats.messagesToday += 2;
  });
}

export function runReport(id) {
  updateState((draft) => {
    draft.chatMessages.push({
      id: Date.now(),
      role: "assistant",
      author: "SimpliBot",
      text: `Placeholder report run started for ${id}. Backend wiring can replace this action later.`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
    draft.stats.messagesToday += 1;
  });
}

export function saveTodo(todo) {
  updateState((draft) => {
    const index = draft.todos.findIndex((item) => item.id === todo.id);
    if (index >= 0) {
      draft.todos[index] = { ...todo };
    }
  });
}

window.runReport = runReport;
window.saveTodo = saveTodo;
window.sendMessage = sendMessage;
