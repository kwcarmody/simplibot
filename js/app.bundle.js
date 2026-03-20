(function () {
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

  const state = structuredClone(initialState);
  const subscribers = new Set();
  const routes = new Set(["home", "chat", "tools", "todos", "reports", "channels", "settings", "profile", "signin"]);
  const navItems = [
    { id: "home", label: "Home", icon: "uil uil-estate" },
    { id: "chat", label: "Chat", icon: "uil uil-comment-message" },
    { id: "tools", label: "Tools", icon: "uil uil-wrench" },
    { id: "todos", label: "ToDos", icon: "uil uil-check-circle" },
    { id: "reports", label: "Reports", icon: "uil uil-chart-line" },
    { id: "channels", label: "Channels", icon: "uil uil-comments" },
    { id: "settings", label: "Settings", icon: "uil uil-setting" },
  ];
  const brandMark =
    '<svg viewBox="0 0 40 48" fill="none" aria-hidden="true">' +
    '<path d="M1.278 27.136c-.019-2.147 2.3-4.5 2.284-7.093s-.028-5.33-.028-8.217a18.024 18.024 0 0 1 .5-4.164 9.359 9.359 0 0 1 1.915-3.831 9.936 9.936 0 0 1 3.942-2.776C11.575.356 22.18 0 24.882 0a23.09 23.09 0 0 1 5.386.611 11.729 11.729 0 0 1 4.5 2.11 10.594 10.594 0 0 1 3.109 4 14.682 14.682 0 0 1 1.166 6.218 14.357 14.357 0 0 1-1.277 6.44c-.851 1.7-1.717 3.406-3.4 4.364s-2.023 1.534-5.758 1.8-12.909.611-15.463.611H11.252q-.944 0-2.11-.111s-7.842 3.247-7.864 1.1ZM33.488 12.825a7.189 7.189 0 0 0-2.082-5.608q-2.082-1.888-6.912-1.888c-1.221 0-10.679.1-11.549.305A4.745 4.745 0 0 0 10.807 6.69a4.558 4.558 0 0 0-1.249 2.027 10.548 10.548 0 0 0-.416 3.22c0 .22-.1 3.551 0 4.292.932 3.3 1.9 3.774 6.5 4.017 3.53.116 5.719 0 6.644 0 8.34.009 9.747-1.484 10.376-2.539a10.876 10.876 0 0 0 .832-4.882Z" fill="#6984ed" stroke="#6984ed" stroke-width="1"/>' +
    '<path d="M11.784 0c6.51 0 11.655.183 11.788 2.806S18.294 5.611 11.784 5.611.208 5.748 0 2.805 5.273 0 11.784 0Z" transform="translate(10.359 36.596)" fill="#6984ed"/>' +
    "</svg>";
  const signinBrandMark = brandMark;
  const toolOptions = ["Web Search", "Calendar", "Filesystem", "CRM", "Automation"];
  const toolScopeOptions = ["Workspace", "Personal", "Approved paths", "Ops", "Sales"];
  const toolRefreshOptions = ["On demand", "1 min", "5 min", "10 min", "15 min", "30 min"];
  const reportOutputOptions = ["Summary", "Detailed", "Executive"];
  const reportFrequencyOptions = ["On demand", "Hourly", "Daily", "Weekly"];
  const channelDeliveryOptions = ["Instant", "Digest", "Manual review"];
  const orderedStatuses = ["All", "Done", "ToDo", "Working", "Blocked", "Archived"];

  function syncStats(draft) {
    draft.stats.activeTodos = draft.todos.filter(
      (item) => !["Done", "Archived"].includes(item.status)
    ).length;
    draft.stats.enabledTools = draft.tools.filter((item) => item.enabled).length;
    draft.stats.activeChannels = draft.channels.filter((item) => item.enabled).length;
  }

  function subscribe(listener) {
    subscribers.add(listener);
    return function () {
      subscribers.delete(listener);
    };
  }

  function updateState(updater) {
    updater(state);
    syncStats(state);
    subscribers.forEach(function (listener) {
      listener(state);
    });
  }

  function setRoute(route) {
    updateState(function (draft) {
      draft.currentRoute = route;
    });
  }

  function toggleSidebar() {
    updateState(function (draft) {
      draft.sidebarMinimized = !draft.sidebarMinimized;
    });
  }

  function toggleMobileMenu() {
    updateState(function (draft) {
      draft.mobileMenuOpen = !draft.mobileMenuOpen;
    });
  }

  function closeMobileMenu() {
    updateState(function (draft) {
      draft.mobileMenuOpen = false;
    });
  }

  function setToolSearch(value) {
    updateState(function (draft) {
      draft.filters.toolSearch = value;
    });
  }

  function setReportSearch(value) {
    updateState(function (draft) {
      draft.filters.reportSearch = value;
    });
  }

  function setTodoSearch(value) {
    updateState(function (draft) {
      draft.filters.todoSearch = value;
    });
  }

  function setTodoStatus(value) {
    updateState(function (draft) {
      draft.filters.todoStatus = value;
    });
  }

  function toggleTool(id) {
    updateState(function (draft) {
      const tool = draft.tools.find(function (item) {
        return item.id === id;
      });
      if (tool) {
        tool.enabled = !tool.enabled;
      }
    });
  }

  function toggleChannel(id) {
    updateState(function (draft) {
      const channel = draft.channels.find(function (item) {
        return item.id === id;
      });
      if (channel) {
        channel.enabled = !channel.enabled;
      }
    });
  }

  function selectTodo(id) {
    updateState(function (draft) {
      draft.todoFlyoutId = id;
      draft.toolDrawerId = null;
      draft.reportDrawerId = null;
      draft.channelDrawerId = null;
      draft.memoryDrawerOpen = false;
    });
  }

  function closeTodoFlyout() {
    updateState(function (draft) {
      draft.todoFlyoutId = null;
    });
  }

  function openToolDrawer(id) {
    updateState(function (draft) {
      draft.toolDrawerId = id;
      draft.reportDrawerId = null;
      draft.channelDrawerId = null;
      draft.todoFlyoutId = null;
      draft.memoryDrawerOpen = false;
    });
  }

  function closeToolDrawer() {
    updateState(function (draft) {
      draft.toolDrawerId = null;
    });
  }

  function openReportDrawer(id) {
    updateState(function (draft) {
      draft.reportDrawerId = id;
      draft.toolDrawerId = null;
      draft.channelDrawerId = null;
      draft.todoFlyoutId = null;
      draft.memoryDrawerOpen = false;
    });
  }

  function closeReportDrawer() {
    updateState(function (draft) {
      draft.reportDrawerId = null;
    });
  }

  function updateReportConfigField(id, field, value) {
    updateState(function (draft) {
      const report = draft.reports.find(function (item) {
        return item.id === id;
      });
      if (report) {
        report.config[field] = value;
      }
    });
  }

  function openChannelDrawer(id) {
    updateState(function (draft) {
      draft.channelDrawerId = id;
      draft.reportDrawerId = null;
      draft.toolDrawerId = null;
      draft.todoFlyoutId = null;
      draft.memoryDrawerOpen = false;
    });
  }

  function closeChannelDrawer() {
    updateState(function (draft) {
      draft.channelDrawerId = null;
    });
  }

  function updateChannelConfigField(id, field, value) {
    updateState(function (draft) {
      const channel = draft.channels.find(function (item) {
        return item.id === id;
      });
      if (channel) {
        channel.config[field] = value;
      }
    });
  }

  function updateToolConfigField(id, field, value) {
    updateState(function (draft) {
      const tool = draft.tools.find(function (item) {
        return item.id === id;
      });
      if (tool) {
        tool.config[field] = value;
      }
    });
  }

  function openMemoryDrawer() {
    updateState(function (draft) {
      draft.channelDrawerId = null;
      draft.reportDrawerId = null;
      draft.toolDrawerId = null;
      draft.memoryDrawerOpen = true;
      draft.todoFlyoutId = null;
    });
  }

  function closeMemoryDrawer() {
    updateState(function (draft) {
      draft.memoryDrawerOpen = false;
    });
  }

  function setMemorySearch(value) {
    updateState(function (draft) {
      draft.memoryFilters.search = value;
    });
  }

  function setMemoryType(value) {
    updateState(function (draft) {
      draft.memoryFilters.type = value;
    });
  }

  function deleteMemory(id) {
    updateState(function (draft) {
      draft.memories = draft.memories.filter(function (memory) {
        return memory.id !== id;
      });
    });
  }

  function updateTodoField(id, field, value) {
    updateState(function (draft) {
      const todo = draft.todos.find(function (item) {
        return item.id === id;
      });
      if (todo) {
        todo[field] = value;
      }
    });
  }

  function setSelectedTool(value) {
    updateState(function (draft) {
      draft.selectedTool = value;
    });
  }

  function updateSetting(section, field, value) {
    updateState(function (draft) {
      draft.settings[section][field] = value;
    });
  }

  function updateProfileField(field, value) {
    updateState(function (draft) {
      draft.profile[field] = value;
    });
  }

  function clearMemory() {
    updateState(function (draft) {
      draft.settings.memory.maxSize = 0;
      draft.settings.memory.userDescription = "";
      draft.settings.memory.botDescription = "";
      draft.memories = [];
    });
  }

  function sendMessage(message) {
    if (!message.trim()) {
      return;
    }

    updateState(function (draft) {
      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      draft.chatMessages.push({
        id: Date.now(),
        role: "user",
        author: "You",
        text: message.trim(),
        time: timestamp,
      });
      draft.chatMessages.push({
        id: Date.now() + 1,
        role: "assistant",
        author: "SimpliBot",
        text: 'Placeholder response: queued "' + message.trim() + '" with ' + draft.selectedTool + ".",
        time: timestamp,
      });
      draft.stats.messagesToday += 2;
    });
  }

  function runReport(id) {
    updateState(function (draft) {
      draft.chatMessages.push({
        id: Date.now(),
        role: "assistant",
        author: "SimpliBot",
        text: "Placeholder report run started for " + id + ". Backend wiring can replace this action later.",
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      });
      draft.stats.messagesToday += 1;
    });
  }

  function saveTodo(todo) {
    updateState(function (draft) {
      const index = draft.todos.findIndex(function (item) {
        return item.id === todo.id;
      });
      if (index >= 0) {
        draft.todos[index] = Object.assign({}, todo);
      }
    });
  }

  function escapeValue(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function statusClass(status) {
    return "status-" + status.toLowerCase();
  }

  function getRouteFromHash() {
    const route = window.location.hash.replace(/^#\//, "") || "home";
    return routes.has(route) ? route : "home";
  }

  function navigate(route) {
    const nextRoute = routes.has(route) ? route : "home";
    if (getRouteFromHash() !== nextRoute) {
      window.location.hash = "/" + nextRoute;
    } else if (state.currentRoute !== nextRoute) {
      setRoute(nextRoute);
    }
  }

  function initRouter(onChange) {
    function syncRoute() {
      setRoute(getRouteFromHash());
      onChange();
    }

    window.addEventListener("hashchange", syncRoute);

    if (!window.location.hash) {
      window.location.hash = "/home";
    } else {
      syncRoute();
    }
  }

  function renderSidebar(container, appState) {
    container.classList.toggle("minimized", appState.sidebarMinimized);
    container.innerHTML =
      '<div class="d-flex align-items-center gap-3 mb-4">' +
      '<div class="d-flex align-items-center gap-3 min-w-0">' +
      '<div class="brand-mark">' +
      brandMark +
      "</div>" +
      '<div class="brand-copy"><div class="fw-semibold">Pikori</div><div class="text-secondary small">Agentic Control Surface</div></div>' +
      "</div>" +
      "</div>" +
      '<nav class="d-flex flex-column">' +
      navItems
        .map(function (item) {
          return (
            '<button class="sidebar-button ' +
            (appState.currentRoute === item.id ? "active" : "") +
            '" data-route="' +
            item.id +
            '">' +
            '<span class="icon"><i class="' +
            item.icon +
            '"></i></span><span class="nav-label">' +
            item.label +
            "</span></button>"
          );
        })
        .join("") +
      "</nav>" +
      '<div class="sidebar-footer pt-4">' +
      '<div class="surface-card sidebar-user" data-route="profile">' +
      '<div class="sidebar-avatar">KC</div>' +
      '<div class="footer-copy"><div class="fw-semibold">' +
      appState.profile.fullName +
      '</div><div class="text-secondary small">' +
      appState.profile.role +
      "</div></div>" +
      "</div>" +
      '<div class="sidebar-footer-actions">' +
      '<button class="sidebar-button" type="button" data-route="signin"><span class="icon"><i class="uil uil-signout"></i></span><span class="nav-label">Sign out</span></button>' +
      "</div>" +
      '<button id="drawer-toggle" class="sidebar-button collapse-control" type="button" aria-label="' +
      (appState.sidebarMinimized ? "Expand menu" : "Collapse menu") +
      '"><span class="icon"><i class="uil ' +
      (appState.sidebarMinimized ? "uil-angle-right" : "uil-angle-left") +
      '"></i></span></button>' +
      "</div>";

    container.querySelector("#drawer-toggle").addEventListener("click", toggleSidebar);
    container.querySelectorAll("[data-route]").forEach(function (button) {
      button.addEventListener("click", function () {
        navigate(button.dataset.route);
        closeMobileMenu();
      });
    });
  }

  function renderTodoFlyout(container, appState) {
    const todo = appState.todos.find(function (item) {
      return item.id === appState.todoFlyoutId;
    });

    if (!todo) {
      container.classList.remove("open");
      container.innerHTML = "";
      return;
    }

    container.classList.add("open");
    container.innerHTML =
      '<div class="drawer-header"><div class="d-flex align-items-start justify-content-between gap-3"><div><div class="muted-label">Todo Editor</div><h2 class="h4 mt-2 mb-1">' +
      todo.title +
      '</h2><div class="text-secondary small">' +
      todo.id +
      '</div></div><button id="close-flyout" class="btn btn-sm btn-secondary-global">Close</button></div></div><div class="drawer-body">' +
      '<div class="settings-stack mb-3"><div class="w-100"><label class="form-label">Title</label><input class="form-control" data-field="title" value="' +
      escapeValue(todo.title) +
      '" /></div></div>' +
      '<div class="settings-stack mb-3"><div class="w-100"><label class="form-label">Status</label><select class="form-select" data-field="status">' +
      ["ToDo", "Working", "Done", "Blocked", "Archived"]
        .map(function (status) {
          return "<option " + (todo.status === status ? "selected" : "") + ">" + status + "</option>";
        })
        .join("") +
      "</select></div></div>" +
      '<div class="settings-stack mb-3"><div class="w-100"><label class="form-label">Owner</label><input class="form-control" data-field="owner" value="' +
      escapeValue(todo.owner) +
      '" /></div></div>' +
      '<div class="settings-stack mb-3"><div class="w-100"><label class="form-label">Due Date</label><input class="form-control" data-field="dueDate" value="' +
      escapeValue(todo.dueDate) +
      '" /></div></div>' +
      '<div class="settings-stack mb-3"><div class="w-100"><label class="form-label">Priority</label><input class="form-control" data-field="priority" value="' +
      escapeValue(todo.priority) +
      '" /></div></div>' +
      '<div class="settings-stack mb-4"><div class="w-100"><label class="form-label">Details</label><textarea class="form-control" rows="6" data-field="details">' +
      escapeValue(todo.details) +
      '</textarea></div></div><button id="save-todo" class="btn btn-light w-100">Save</button></div>';

    container.querySelector("#close-flyout").addEventListener("click", closeTodoFlyout);
    container.querySelectorAll("[data-field]").forEach(function (field) {
      const eventName = field.tagName === "SELECT" ? "change" : "input";
      field.addEventListener(eventName, function (event) {
        updateTodoField(todo.id, field.dataset.field, event.target.value);
      });
    });
    container.querySelector("#save-todo").addEventListener("click", function () {
      const currentTodo = state.todos.find(function (item) {
        return item.id === todo.id;
      });
      saveTodo(currentTodo);
    });
  }

  function renderToolDrawer(container, appState) {
    const tool = appState.tools.find(function (item) {
      return item.id === appState.toolDrawerId;
    });

    if (!tool) {
      container.classList.remove("open");
      container.innerHTML = "";
      return;
    }

    container.classList.add("open");
    container.innerHTML =
      '<div class="drawer-header"><div class="d-flex align-items-start justify-content-between gap-3"><div><div class="muted-label">Tool Settings</div><h2 class="h4 mt-2 mb-1">Configure ' +
      tool.title +
      '</h2><div class="text-secondary small">' +
      tool.id +
      '</div></div><button id="close-tool-drawer" class="btn btn-sm btn-secondary-global">Close</button></div></div><div class="drawer-body">' +
      '<div class="toggle-row mb-4"><div><div class="fw-semibold">Enabled</div><div class="settings-help small">Allow this tool to appear in agent workflows.</div></div><div class="form-check form-switch"><input id="tool-enabled-toggle" class="form-check-input" type="checkbox" ' +
      (tool.enabled ? "checked" : "") +
      ' /></div></div>' +
      '<div class="settings-stack mb-3"><div class="w-100"><label class="form-label">Endpoint</label><input class="form-control" data-tool-config-field="endpoint" value="' +
      escapeValue(tool.config.endpoint) +
      '" /></div></div>' +
      '<div class="settings-stack mb-3"><div class="w-100"><label class="form-label">Access Scope</label><select class="form-select" data-tool-config-field="scope">' +
      toolScopeOptions
        .map(function (option) {
          return "<option " + (tool.config.scope === option ? "selected" : "") + ">" + option + "</option>";
        })
        .join("") +
      '</select></div></div>' +
      '<div class="settings-stack mb-3"><div class="w-100"><label class="form-label">Refresh Interval</label><select class="form-select" data-tool-config-field="refresh">' +
      toolRefreshOptions
        .map(function (option) {
          return "<option " + (tool.config.refresh === option ? "selected" : "") + ">" + option + "</option>";
        })
        .join("") +
      '</select></div></div>' +
      '<div class="settings-stack mb-4"><div class="w-100"><label class="form-label">Notes</label><textarea class="form-control" rows="6" data-tool-config-field="notes">' +
      escapeValue(tool.config.notes) +
      '</textarea></div></div><button id="save-tool-config" class="btn w-100" type="button">Save</button></div>';

    container.querySelector("#close-tool-drawer").addEventListener("click", closeToolDrawer);
    container.querySelector("#tool-enabled-toggle").addEventListener("change", function () {
      toggleTool(tool.id);
    });
    container.querySelectorAll("[data-tool-config-field]").forEach(function (field) {
      const eventName = field.tagName === "SELECT" ? "change" : "input";
      field.addEventListener(eventName, function (event) {
        updateToolConfigField(tool.id, field.dataset.toolConfigField, event.target.value);
      });
    });
    container.querySelector("#save-tool-config").addEventListener("click", closeToolDrawer);
  }

  function renderReportDrawer(container, appState) {
    const report = appState.reports.find(function (item) {
      return item.id === appState.reportDrawerId;
    });

    if (!report) {
      container.classList.remove("open");
      container.innerHTML = "";
      return;
    }

    container.classList.add("open");
    container.innerHTML =
      '<div class="drawer-header"><div class="d-flex align-items-start justify-content-between gap-3"><div><div class="muted-label">Report Settings</div><h2 class="h4 mt-2 mb-1">Configure ' +
      report.title +
      '</h2><div class="text-secondary small">' +
      report.id +
      '</div></div><button id="close-report-drawer" class="btn btn-sm btn-secondary-global">Close</button></div></div><div class="drawer-body">' +
      '<div class="settings-stack mb-3"><div class="w-100"><label class="form-label">Audience</label><input class="form-control" data-report-config-field="audience" value="' +
      escapeValue(report.config.audience) +
      '" /></div></div>' +
      '<div class="settings-stack mb-3"><div class="w-100"><label class="form-label">Output Format</label><select class="form-select" data-report-config-field="output">' +
      reportOutputOptions
        .map(function (option) {
          return "<option " + (report.config.output === option ? "selected" : "") + ">" + option + "</option>";
        })
        .join("") +
      '</select></div></div>' +
      '<div class="settings-stack mb-3"><div class="w-100"><label class="form-label">Frequency</label><select class="form-select" data-report-config-field="frequency">' +
      reportFrequencyOptions
        .map(function (option) {
          return "<option " + (report.config.frequency === option ? "selected" : "") + ">" + option + "</option>";
        })
        .join("") +
      '</select></div></div>' +
      '<div class="settings-stack mb-4"><div class="w-100"><label class="form-label">Notes</label><textarea class="form-control" rows="6" data-report-config-field="notes">' +
      escapeValue(report.config.notes) +
      '</textarea></div></div><button id="run-configured-report" class="btn w-100" type="button">Run Report</button></div>';

    container.querySelector("#close-report-drawer").addEventListener("click", closeReportDrawer);
    container.querySelectorAll("[data-report-config-field]").forEach(function (field) {
      const eventName = field.tagName === "SELECT" ? "change" : "input";
      field.addEventListener(eventName, function (event) {
        updateReportConfigField(report.id, field.dataset.reportConfigField, event.target.value);
      });
    });
    container.querySelector("#run-configured-report").addEventListener("click", function () {
      runReport(report.id);
    });
  }

  function renderChannelDrawer(container, appState) {
    const channel = appState.channels.find(function (item) {
      return item.id === appState.channelDrawerId;
    });

    if (!channel) {
      container.classList.remove("open");
      container.innerHTML = "";
      return;
    }

    container.classList.add("open");
    container.innerHTML =
      '<div class="drawer-header"><div class="d-flex align-items-start justify-content-between gap-3"><div><div class="muted-label">Channel Settings</div><h2 class="h4 mt-2 mb-1">Configure ' +
      channel.title +
      '</h2><div class="text-secondary small">' +
      channel.id +
      '</div></div><button id="close-channel-drawer" class="btn btn-sm btn-secondary-global">Close</button></div></div><div class="drawer-body">' +
      '<div class="toggle-row mb-4"><div><div class="fw-semibold">Enabled</div><div class="settings-help small">Allow outbound workflows to use this channel.</div></div><div class="form-check form-switch"><input id="channel-enabled-toggle" class="form-check-input" type="checkbox" ' +
      (channel.enabled ? "checked" : "") +
      ' /></div></div>' +
      '<div class="settings-stack mb-3"><div class="w-100"><label class="form-label">Endpoint</label><input class="form-control" data-channel-config-field="endpoint" value="' +
      escapeValue(channel.config.endpoint) +
      '" /></div></div>' +
      '<div class="settings-stack mb-3"><div class="w-100"><label class="form-label">Identity</label><input class="form-control" data-channel-config-field="identity" value="' +
      escapeValue(channel.config.identity) +
      '" /></div></div>' +
      '<div class="settings-stack mb-3"><div class="w-100"><label class="form-label">Delivery Mode</label><select class="form-select" data-channel-config-field="delivery">' +
      channelDeliveryOptions
        .map(function (option) {
          return "<option " + (channel.config.delivery === option ? "selected" : "") + ">" + option + "</option>";
        })
        .join("") +
      '</select></div></div>' +
      '<div class="settings-stack mb-4"><div class="w-100"><label class="form-label">Notes</label><textarea class="form-control" rows="6" data-channel-config-field="notes">' +
      escapeValue(channel.config.notes) +
      '</textarea></div></div><button id="save-channel-config" class="btn w-100" type="button">Save</button></div>';

    container.querySelector("#close-channel-drawer").addEventListener("click", closeChannelDrawer);
    container.querySelector("#channel-enabled-toggle").addEventListener("change", function () {
      toggleChannel(channel.id);
    });
    container.querySelectorAll("[data-channel-config-field]").forEach(function (field) {
      const eventName = field.tagName === "SELECT" ? "change" : "input";
      field.addEventListener(eventName, function (event) {
        updateChannelConfigField(channel.id, field.dataset.channelConfigField, event.target.value);
      });
    });
    container.querySelector("#save-channel-config").addEventListener("click", closeChannelDrawer);
  }

  function renderMemoryDrawer(container, appState) {
    if (!appState.memoryDrawerOpen) {
      container.classList.remove("open");
      container.innerHTML = "";
      return;
    }
    const query = appState.memoryFilters.search.trim().toLowerCase();
    const memories = appState.memories.filter(function (memory) {
      const matchesSearch = [memory.id, memory.title, memory.content, memory.type].some(function (value) {
        return value.toLowerCase().includes(query);
      });
      const matchesType = appState.memoryFilters.type === "All" || memory.type === appState.memoryFilters.type;
      return matchesSearch && matchesType;
    });
    container.classList.add("open");
    container.innerHTML =
      '<div class="drawer-header"><div class="d-flex align-items-start justify-content-between gap-3 mb-4"><div><div class="muted-label">Memory Drawer</div><h2 class="h4 mt-2 mb-1">Manage Memories</h2><div class="text-secondary small">' +
      memories.length +
      ' visible</div></div><button id="close-memory-drawer" class="btn btn-sm btn-secondary-global">Close</button></div><div class="toolbar"><div class="search-field"><span class="search-icon" aria-hidden="true"><i class="uil uil-search"></i></span><input id="memory-search" class="form-control" placeholder="Search memories" value="' +
      escapeValue(appState.memoryFilters.search) +
      '" /></div><select id="memory-filter" class="form-select" style="max-width: 170px;">' +
      ["All", "Preference", "Profile", "Workflow", "Product"]
        .map(function (type) {
          return "<option " + (appState.memoryFilters.type === type ? "selected" : "") + ">" + type + "</option>";
        })
        .join("") +
      '</select></div></div><div class="drawer-body"><div class="memory-list">' +
      (memories.length
        ? memories
            .map(function (memory) {
              return '<article class="memory-item"><div class="memory-item-body"><div class="d-flex align-items-center gap-2 flex-wrap"><span class="muted-label">' + memory.id + '</span><span class="status-label-disabled">' + memory.type + '</span></div><h3 class="h6 mt-2 mb-1">' + memory.title + '</h3><div class="memory-copy">' + memory.content + '</div><div class="text-secondary small mt-2">Saved ' + memory.savedAt + '</div></div><div class="memory-item-footer"><button class="btn btn-sm btn-danger-secondary" type="button" data-delete-memory="' + memory.id + '">Delete</button></div></article>';
            })
            .join("")
        : '<div class="empty-state">No memories match the current search and filter.</div>') +
      "</div></div>";
    container.querySelector("#close-memory-drawer").addEventListener("click", closeMemoryDrawer);
    container.querySelector("#memory-search").addEventListener("input", function (event) {
      setMemorySearch(event.target.value);
    });
    container.querySelector("#memory-filter").addEventListener("change", function (event) {
      setMemoryType(event.target.value);
    });
    container.querySelectorAll("[data-delete-memory]").forEach(function (button) {
      button.addEventListener("click", function () {
        deleteMemory(button.dataset.deleteMemory);
        if (!state.memories.length) {
          closeMemoryDrawer();
        }
      });
    });
  }

  function renderHomePage(appState) {
    return (
      '<section class="page-shell"><header class="page-header"><div><h1>Agentic Home</h1><p class="page-subtitle">A lightweight control surface for tasks, tools, reports, and channels. Everything on this screen is powered by local mock data so backend integration can drop in later.</p></div><div class="page-badge">Frontend-only preview</div></header><section class="stats-grid">' +
      [
        ["Active ToDos", appState.stats.activeTodos],
        ["Enabled Tools", appState.stats.enabledTools],
        ["Messages Today", appState.stats.messagesToday],
        ["Active Channels", appState.stats.activeChannels],
      ]
        .map(function (entry) {
          return (
            '<article class="stat-card"><div class="muted-label">' +
            entry[0] +
            '</div><div class="stat-value">' +
            entry[1] +
            "</div></article>"
          );
        })
        .join("") +
      '</section><section><div class="d-flex align-items-center justify-content-between mb-3"><div><div class="muted-label">Quick Actions</div><h2 class="h4 mb-0 mt-2">Jump straight into the work</h2></div></div><div class="action-grid">' +
      appState.actions
        .map(function (item) {
          return (
            '<article class="action-card" data-route="' +
            item.route +
            '"><div class="action-icon"><i class="' +
            item.icon +
            '"></i></div><h3 class="h5">' +
            item.title +
            '</h3><p class="tool-description mb-0">' +
            item.description +
            "</p></article>"
          );
        })
        .join("") +
      "</div></section></section>"
    );
  }

  function bindHomePage(container) {
    container.querySelectorAll("[data-route]").forEach(function (card) {
      card.addEventListener("click", function () {
        navigate(card.dataset.route);
      });
    });
  }

  function renderChatPage(appState) {
    return (
      '<section class="page-shell chat-page"><header class="page-header"><div><h1>Chat</h1><p class="page-subtitle">Converse with the agent, attach placeholders, and route messages through a static tool selection.</p></div><div class="page-badge">' +
      appState.chatMessages.length +
      ' messages</div></header><div class="chat-layout"><section class="chat-panel"><div class="chat-thread" id="chat-thread">' +
      appState.chatMessages
        .map(function (message) {
          return (
            '<div class="message-row ' +
            message.role +
            '"><div class="message-bubble"><div class="message-meta-row"><div class="message-meta">' +
            message.author +
            " • " +
            message.time +
            '</div><button class="btn memory-icon-button" type="button" data-bs-toggle="tooltip" data-bs-placement="top" title="Save to memory." aria-label="Save to memory"><i class="uil uil-brain"></i></button></div><div>' +
            message.text +
            "</div></div></div>"
          );
        })
        .join("") +
      '<div class="message-row actions"><div class="message-bubble action-bubble"><button class="message-action-chip" type="button">Review Missing Credentials</button><button class="message-action-chip" type="button">Open Reports</button></div></div>' +
      '</div></section><section class="composer-panel"><form id="chat-form"><div class="input-group mb-3"><input id="chat-input" class="form-control composer-input" type="text" placeholder="Ask the agent to summarize, draft, or run a placeholder action..." /><button class="btn chat-icon-button" type="submit" aria-label="Send message"><i class="uil uil-comment-message"></i></button></div><div class="d-flex justify-content-between align-items-center gap-2"><div class="d-flex gap-2 align-items-center"><button id="attach-button" class="btn chat-icon-button" type="button" aria-label="Attach"><i class="uil uil-plus attach-icon"></i></button><div class="dropdown mobile-tool-menu"><button id="tool-menu-button" class="btn chat-icon-button" type="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Choose tool"><i class="uil uil-ellipsis-v"></i></button><ul class="dropdown-menu mobile-tool-dropdown">' +
      toolOptions
        .map(function (tool) {
          return '<li><button class="dropdown-item ' + (appState.selectedTool === tool ? 'active' : '') + '" type="button" data-tool-option="' + tool + '">' + tool + '</button></li>';
        })
        .join('') +
      '</ul></div><select id="tool-select" class="form-select" style="width: 220px; flex: 0 0 220px;">' +
      toolOptions
        .map(function (tool) {
          return "<option " + (appState.selectedTool === tool ? "selected" : "") + ">" + tool + "</option>";
        })
        .join("") +
      '</select></div><button id="new-session-button" class="btn btn-sm btn-secondary-global" type="button">+ Session</button></div></form></section></div></section>'
    );
  }

  function bindChatPage(container) {
    const form = container.querySelector("#chat-form");
    const input = container.querySelector("#chat-input");
    const toolSelect = container.querySelector("#tool-select");
    const attachButton = container.querySelector("#attach-button");
    const newSessionButton = container.querySelector("#new-session-button");
    const panel = container.querySelector(".chat-panel");
    const thread = container.querySelector("#chat-thread");

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      sendMessage(input.value);
      input.value = "";
    });

    toolSelect.addEventListener("change", function (event) {
      setSelectedTool(event.target.value);
    });

    container.querySelectorAll("[data-tool-option]").forEach(function (button) {
      button.addEventListener("click", function () {
        setSelectedTool(button.dataset.toolOption);
      });
    });

    attachButton.addEventListener("click", function () {
      sendMessage("Attachment placeholder clicked.");
    });

    newSessionButton.addEventListener("click", function () {
      sendMessage("Started a new placeholder session.");
    });

    if (panel && thread) {
      panel.scrollTop = panel.scrollHeight;
    }

    container.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function (element) {
      bootstrap.Tooltip.getOrCreateInstance(element);
    });
  }

  function renderToolsPage(appState) {
    const query = appState.filters.toolSearch.trim().toLowerCase();
    const visibleTools = appState.tools.filter(function (tool) {
      return [tool.title, tool.description].some(function (value) {
        return value.toLowerCase().includes(query);
      });
    });

    return (
      '<section class="page-shell"><header class="page-header"><div><h1>Tools</h1><p class="page-subtitle">Search available capabilities and toggle them on or off without leaving the interface.</p></div><div class="page-badge">' +
      visibleTools.length +
      ' visible</div></header><div class="toolbar"><div class="search-field"><span class="search-icon" aria-hidden="true"><i class="uil uil-search"></i></span><input id="tool-search" class="form-control" placeholder="Search tools" value="' +
      escapeValue(appState.filters.toolSearch) +
      '" /></div></div><div class="tool-grid">' +
      visibleTools
        .map(function (tool) {
          return (
            '<article class="tool-card"><div class="tool-row mb-3"><div><h2 class="h5 mb-1">' +
            tool.title +
            '</h2><p class="tool-description mb-0">' +
            tool.description +
            '</p></div><div class="form-check form-switch"><input class="form-check-input" type="checkbox" data-tool-id="' +
            tool.id +
            '" ' +
            (tool.enabled ? "checked" : "") +
            ' /></div></div><div class="card-footer-row"><div class="' +
            (tool.enabled ? "status-label-enabled" : "status-label-disabled") +
            '">' +
            (tool.enabled ? "Enabled" : "Disabled") +
            '</div><button class="tool-config-button" type="button" data-configure-tool="' +
            tool.id +
            '"><span>Configure</span><i class="uil uil-setting"></i></button></div></article>'
          );
        })
        .join("") +
      "</div></section>"
    );
  }

  function bindToolsPage(container) {
    container.querySelector("#tool-search").addEventListener("input", function (event) {
      setToolSearch(event.target.value);
    });

    container.querySelectorAll("[data-tool-id]").forEach(function (toggle) {
      toggle.addEventListener("change", function () {
        toggleTool(toggle.dataset.toolId);
      });
    });

    container.querySelectorAll("[data-configure-tool]").forEach(function (button) {
      button.addEventListener("click", function () {
        openToolDrawer(button.dataset.configureTool);
      });
    });
  }

  function renderTodosPage(appState) {
    const query = appState.filters.todoSearch.trim().toLowerCase();
    const filteredTodos = appState.todos.filter(function (todo) {
      const matchesSearch = [todo.id, todo.title, todo.owner, todo.details].some(function (value) {
        return value.toLowerCase().includes(query);
      });
      const matchesStatus =
        appState.filters.todoStatus === "All" || todo.status === appState.filters.todoStatus;
      return matchesSearch && matchesStatus;
    });

    const groupedTodos = filteredTodos.reduce(function (groups, todo) {
      if (!groups[todo.dueDate]) {
        groups[todo.dueDate] = [];
      }
      groups[todo.dueDate].push(todo);
      return groups;
    }, {});

    const content = Object.keys(groupedTodos).length
      ? Object.entries(groupedTodos)
          .map(function (entry) {
            const dueDate = entry[0];
            const items = entry[1];
            return (
              '<section class="todo-group"><div class="todo-group-header"><div><div class="muted-label">Due Date</div><h2 class="h4 mb-0 mt-2">' +
              dueDate +
              '</h2></div><div class="page-badge">' +
              items.length +
              ' items</div></div>' +
              items
                .map(function (todo) {
                  return (
                    '<details class="todo-item" data-todo-id="' +
                    todo.id +
                    '"><summary><div class="d-flex justify-content-between gap-3 flex-wrap"><div><div class="d-flex align-items-center gap-2 flex-wrap"><span class="muted-label">' +
                    todo.id +
                    '</span><span class="status-pill ' +
                    statusClass(todo.status) +
                    '">' +
                    todo.status +
                    '</span></div><h3 class="h5 mt-2 mb-1">' +
                    todo.title +
                    '</h3><div class="todo-meta"><span class="tool-description">Owner: ' +
                    todo.owner +
                    '</span><span class="tool-description">Due: ' +
                    todo.dueDate +
                    '</span></div></div><button class="btn btn-sm btn-secondary-global align-self-start open-todo" type="button" data-open-id="' +
                    todo.id +
                    '">Edit</button></div></summary><div class="todo-copy mt-3">' +
                    todo.details +
                    "</div></details>"
                  );
                })
                .join("") +
              "</section>"
            );
          })
          .join("")
      : '<div class="empty-state">No todos match the current search and filter.</div>';

    return (
      '<section class="page-shell"><header class="page-header"><div><h1>ToDos</h1><p class="page-subtitle">Search, filter, inspect details inline, and open the right-side editor for updates.</p></div><div class="page-badge">' +
      filteredTodos.length +
      ' matching</div></header><div class="toolbar"><div class="search-field"><span class="search-icon" aria-hidden="true"><i class="uil uil-search"></i></span><input id="todo-search" class="form-control" placeholder="Search todos" value="' +
      escapeValue(appState.filters.todoSearch) +
      '" /></div><select id="todo-status" class="form-select" style="max-width: 220px;">' +
      orderedStatuses
        .map(function (status) {
          return "<option " + (appState.filters.todoStatus === status ? "selected" : "") + ">" + status + "</option>";
        })
        .join("") +
      "</select></div>" +
      content +
      "</section>"
    );
  }

  function bindTodosPage(container) {
    container.querySelector("#todo-search").addEventListener("input", function (event) {
      setTodoSearch(event.target.value);
    });

    container.querySelector("#todo-status").addEventListener("change", function (event) {
      setTodoStatus(event.target.value);
    });

    container.querySelectorAll("[data-open-id]").forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.stopPropagation();
        selectTodo(button.dataset.openId);
      });
    });

    container.querySelectorAll("[data-todo-id]").forEach(function (item) {
      item.addEventListener("click", function () {
        selectTodo(item.dataset.todoId);
      });
    });
  }

  function renderReportsPage(appState) {
    const query = appState.filters.reportSearch.trim().toLowerCase();
    const visibleReports = appState.reports.filter(function (report) {
      return [report.title, report.description].some(function (value) {
        return value.toLowerCase().includes(query);
      });
    });

    return (
      '<section class="page-shell"><header class="page-header"><div><h1>Reports</h1><p class="page-subtitle">Search static report definitions and run placeholder actions that can be wired to the backend later.</p></div><div class="page-badge">' +
      visibleReports.length +
      ' reports</div></header><div class="toolbar"><div class="search-field"><span class="search-icon" aria-hidden="true"><i class="uil uil-search"></i></span><input id="report-search" class="form-control" placeholder="Search reports" value="' +
      escapeValue(appState.filters.reportSearch) +
      '" /></div></div><div class="report-grid">' +
      visibleReports
        .map(function (report) {
          return (
            '<article class="report-card"><div class="muted-label">Report</div><h2 class="h5 mt-2">' +
            report.title +
            '</h2><p class="report-description">' +
            report.description +
            '</p><div class="card-footer-row"><button class="btn btn-sm btn-secondary-global" data-report-id="' +
            report.id +
            '">Run</button><button class="tool-config-button" type="button" data-configure-report="' +
            report.id +
            '"><span>Configure</span><i class="uil uil-setting"></i></button></div></article>'
          );
        })
        .join("") +
      "</div></section>"
    );
  }

  function renderProfilePage(appState) {
    const profile = appState.profile;
    return (
      '<section class="page-shell"><header class="page-header"><div><h1>Profile</h1><p class="page-subtitle">Manage the common user details that personalize the workspace and connected experiences.</p></div><div class="page-badge">User settings</div></header><div class="settings-grid">' +
      '<section class="settings-section"><div class="muted-label">Account</div><div class="settings-stack mt-3 mb-3"><div class="w-100"><label class="form-label">Full Name</label><input class="form-control" data-profile-field="fullName" value="' +
      escapeValue(profile.fullName) +
      '" /></div></div><div class="settings-stack mb-3"><div class="w-100"><label class="form-label">Role</label><input class="form-control" data-profile-field="role" value="' +
      escapeValue(profile.role) +
      '" /></div></div><div class="settings-stack mb-3"><div class="w-100"><label class="form-label">Email</label><input class="form-control" data-profile-field="email" value="' +
      escapeValue(profile.email) +
      '" /></div></div><div class="settings-stack"><div class="w-100"><label class="form-label">Phone</label><input class="form-control" data-profile-field="phone" value="' +
      escapeValue(profile.phone) +
      '" /></div></div></section>' +
      '<section class="settings-section"><div class="muted-label">Workspace</div><div class="settings-stack mt-3 mb-3"><div class="w-100"><label class="form-label">Company</label><input class="form-control" data-profile-field="company" value="' +
      escapeValue(profile.company) +
      '" /></div></div><div class="settings-stack mb-3"><div class="w-100"><label class="form-label">Location</label><input class="form-control" data-profile-field="location" value="' +
      escapeValue(profile.location) +
      '" /></div></div><div class="settings-stack mb-3"><div class="w-100"><label class="form-label">Timezone</label><input class="form-control" data-profile-field="timezone" value="' +
      escapeValue(profile.timezone) +
      '" /></div></div><div class="settings-stack"><div class="w-100"><label class="form-label">Bio</label><textarea class="form-control" rows="5" data-profile-field="bio">' +
      escapeValue(profile.bio) +
      '</textarea></div></div></section><section class="settings-section"><div class="muted-label">Subscription & Usage</div><div class="usage-stack mt-3"><div class="usage-row"><span class="tool-description">Current Subscription</span><span class="fw-semibold">Pro Team</span></div><div class="usage-row"><span class="tool-description">Monthly Messages</span><span>18,420 / 25,000</span></div><div class="usage-row"><span class="tool-description">Memory Storage</span><span>1.2 GB / 5 GB</span></div><div class="usage-row"><span class="tool-description">Custom Tools</span><span>6 active</span></div></div><div class="profile-action-row"><button class="btn btn-light" type="button">Upgrade</button><button class="btn btn-secondary-global" type="button">Request Custom Tools</button></div></section></div></section>'
    );
  }

  function renderSigninPage() {
    return (
      '<section class="auth-shell"><div class="surface-card auth-card"><div class="auth-brand"><div class="auth-brand-mark">' +
      signinBrandMark +
      '</div></div><h1>Sign In</h1><p class="page-subtitle">Continue into Pikori with your preferred identity provider. This is a static frontend flow for now.</p><form class="auth-form" id="signin-form"><div><label class="form-label" for="signin-username">Username</label><input id="signin-username" class="form-control" type="text" placeholder="Enter your username" /></div><div><label class="form-label" for="signin-password">Password</label><input id="signin-password" class="form-control" type="password" placeholder="Enter your password" /></div><div class="d-flex justify-content-between align-items-center gap-3 flex-wrap"><a href="#/signin" class="auth-link" id="forgot-password-link">Forgot my password</a><button class="btn btn-secondary-global" id="signin-button" type="submit">Sign In</button></div></form><div class="auth-actions"><button class="btn btn-light auth-provider-button" type="button" data-signin-provider="google"><i class="uil uil-google"></i><span>Continue with Google</span></button><button class="btn btn-secondary-global auth-provider-button" type="button" data-signin-provider="apple"><i class="uil uil-apple"></i><span>Continue with Apple</span></button></div></div></section>'
    );
  }

  function bindSigninPage(container) {
    container.querySelector("#signin-form").addEventListener("submit", function (event) {
      event.preventDefault();
      navigate("home");
    });

    container.querySelectorAll("[data-signin-provider]").forEach(function (button) {
      button.addEventListener("click", function () {
        navigate("home");
      });
    });

    container.querySelector("#forgot-password-link").addEventListener("click", function (event) {
      event.preventDefault();
    });
  }

  function bindProfilePage(container) {
    container.querySelectorAll("[data-profile-field]").forEach(function (field) {
      field.addEventListener("input", function (event) {
        updateProfileField(field.dataset.profileField, event.target.value);
      });
    });
  }

  function bindReportsPage(container) {
    container.querySelector("#report-search").addEventListener("input", function (event) {
      setReportSearch(event.target.value);
    });

    container.querySelectorAll("[data-report-id]").forEach(function (button) {
      button.addEventListener("click", function () {
        runReport(button.dataset.reportId);
      });
    });

    container.querySelectorAll("[data-configure-report]").forEach(function (button) {
      button.addEventListener("click", function () {
        openReportDrawer(button.dataset.configureReport);
      });
    });
  }

  function renderChannelsPage(appState) {
    return (
      '<section class="page-shell"><header class="page-header"><div><h1>Channels</h1><p class="page-subtitle">Manage static messaging endpoints and test enable or disable states for outbound workflows.</p></div><div class="page-badge">' +
      appState.channels.filter(function (item) {
        return item.enabled;
      }).length +
      ' enabled</div></header><div class="channel-grid">' +
      appState.channels
        .map(function (channel) {
          return (
            '<article class="channel-card"><div class="channel-row"><div><h2 class="h5 mb-1">' +
            channel.title +
            '</h2><p class="channel-description mb-0">' +
            channel.description +
            '</p></div><div class="form-check form-switch"><input class="form-check-input" type="checkbox" data-channel-id="' +
            channel.id +
            '" ' +
            (channel.enabled ? "checked" : "") +
            ' /></div></div><div class="card-footer-row"><button class="tool-config-button" type="button" data-configure-channel="' +
            channel.id +
            '"><span>Configure</span><i class="uil uil-setting"></i></button></div></article>'
          );
        })
        .join("") +
      "</div></section>"
    );
  }

  function bindChannelsPage(container) {
    container.querySelectorAll("[data-channel-id]").forEach(function (toggle) {
      toggle.addEventListener("change", function () {
        toggleChannel(toggle.dataset.channelId);
      });
    });

    container.querySelectorAll("[data-configure-channel]").forEach(function (button) {
      button.addEventListener("click", function () {
        openChannelDrawer(button.dataset.configureChannel);
      });
    });
  }

  function renderSettingsPage(appState) {
    const model = appState.settings.model;
    const memory = appState.settings.memory;
    const tools = appState.settings.tools;
    const channels = appState.settings.channels;

    return (
      '<section class="page-shell"><header class="page-header"><div><h1>Settings</h1><p class="page-subtitle">Configure model, memory, tool, and channel settings using frontend-only local state.</p></div><div class="page-badge">Local state only</div></header><div class="settings-grid">' +
      '<section class="settings-section"><div class="settings-section-header"><div class="muted-label">Model Settings</div><button class="btn btn-sm btn-secondary-global" type="button">Save</button></div><div class="settings-stack mt-3 mb-3"><div class="w-100"><label class="form-label">Provider</label><select class="form-select" data-section="model" data-field="provider">' +
      ["Local", "Ollama", "Other"]
        .map(function (item) {
          return "<option " + (model.provider === item ? "selected" : "") + ">" + item + "</option>";
        })
        .join("") +
      '</select></div></div><div class="settings-stack mb-3"><div class="w-100"><label class="form-label">Model</label><select class="form-select" data-section="model" data-field="model">' +
      ["GPT-4.1-mini", "llama3.2", "custom-endpoint"]
        .map(function (item) {
          return "<option " + (model.model === item ? "selected" : "") + ">" + item + "</option>";
        })
        .join("") +
      '</select></div></div><div class="settings-stack mb-3"><div class="w-100"><label class="form-label">API Key</label><input class="form-control" data-section="model" data-field="apiKey" value="' +
      escapeValue(model.apiKey) +
      '" /></div></div><div class="settings-stack"><div class="w-100"><label class="form-label">API Endpoint</label><input class="form-control" data-section="model" data-field="endpoint" value="' +
      escapeValue(model.endpoint) +
      '" /></div></div></section>' +
      '<section class="settings-section"><div class="settings-section-header"><div class="muted-label">Memory Settings</div><button class="btn btn-sm btn-secondary-global" type="button">Save</button></div><div class="toggle-row mt-3 mb-3"><div><div class="fw-semibold">Enable memory</div><div class="settings-help small">Keep user and bot context available across sessions.</div></div><div class="form-check form-switch"><input class="form-check-input" type="checkbox" data-memory-toggle ' +
      (memory.enabled ? "checked" : "") +
      ' /></div></div><div class="surface-card memory-summary mb-3"><div class="memory-summary-icon"><i class="uil uil-brain"></i></div><div class="memory-summary-content"><div class="fw-semibold">' +
      appState.memories.length +
      ' memories saved</div><div class="settings-help small">Search, filter, and remove saved context from the drawer.</div><button id="view-memories" class="btn btn-sm btn-secondary-global memory-summary-button" type="button">View</button></div></div><div class="settings-stack mb-3"><div class="w-100"><label class="form-label">Memory max size</label><input class="form-control" data-section="memory" data-field="maxSize" value="' +
      escapeValue(memory.maxSize) +
      '" /></div></div><div class="settings-stack mb-3"><div class="w-100"><label class="form-label">User name</label><input class="form-control" data-section="memory" data-field="userName" value="' +
      escapeValue(memory.userName) +
      '" /></div></div><div class="settings-stack mb-3"><div class="w-100"><label class="form-label">User description</label><textarea class="form-control" rows="3" data-section="memory" data-field="userDescription">' +
      escapeValue(memory.userDescription) +
      '</textarea></div></div><div class="settings-stack mb-3"><div class="w-100"><label class="form-label">Bot name</label><input class="form-control" data-section="memory" data-field="botName" value="' +
      escapeValue(memory.botName) +
      '" /></div></div><div class="settings-stack mb-3"><div class="w-100"><label class="form-label">Bot description</label><textarea class="form-control" rows="3" data-section="memory" data-field="botDescription">' +
      escapeValue(memory.botDescription) +
      '</textarea></div></div><button id="clear-memory" class="btn btn-danger-global">Delete All</button></section>' +
      '<section class="settings-section"><div class="settings-section-header"><div class="muted-label">Tools Settings</div><button class="btn btn-sm btn-secondary-global" type="button">Save</button></div><div class="settings-stack mt-3 mb-3"><div class="w-100"><label class="form-label">API</label><input class="form-control" value="' +
      escapeValue(tools.apiBase) +
      '" readonly /></div></div><div class="settings-stack"><div class="w-100"><label class="form-label">API Key</label><input class="form-control" data-section="tools" data-field="apiKey" value="' +
      escapeValue(tools.apiKey) +
      '" /></div></div></section>' +
      '<section class="settings-section"><div class="settings-section-header"><div class="muted-label">Channel Settings</div><button class="btn btn-sm btn-secondary-global" type="button">Save</button></div><div class="settings-stack mt-3 mb-3"><div class="w-100"><label class="form-label">Telegram Bot Token</label><input class="form-control" data-section="channels" data-field="telegramToken" value="' +
      escapeValue(channels.telegramToken) +
      '" /></div></div><div class="settings-stack mb-3"><div class="w-100"><label class="form-label">Email Address</label><input class="form-control" data-section="channels" data-field="emailAddress" value="' +
      escapeValue(channels.emailAddress) +
      '" /></div></div><div class="settings-stack mb-3"><div class="w-100"><label class="form-label">Password</label><input class="form-control" data-section="channels" data-field="emailPassword" value="' +
      escapeValue(channels.emailPassword) +
      '" /></div></div><div class="settings-stack mb-3"><div class="w-100"><label class="form-label">Server</label><input class="form-control" data-section="channels" data-field="emailServer" value="' +
      escapeValue(channels.emailServer) +
      '" /></div></div><div class="settings-stack"><div class="w-100"><label class="form-label">Port</label><input class="form-control" data-section="channels" data-field="emailPort" value="' +
      escapeValue(channels.emailPort) +
      '" /></div></div></section></div></section>'
    );
  }

  function bindSettingsPage(container) {
    container.querySelectorAll("[data-section][data-field]").forEach(function (field) {
      const eventName = field.tagName === "SELECT" ? "change" : "input";
      field.addEventListener(eventName, function (event) {
        updateSetting(field.dataset.section, field.dataset.field, event.target.value);
      });
    });

    container.querySelector("[data-memory-toggle]").addEventListener("change", function (event) {
      updateState(function (draft) {
        draft.settings.memory.enabled = event.target.checked;
      });
    });

    container.querySelector("#clear-memory").addEventListener("click", clearMemory);
    container.querySelector("#view-memories").addEventListener("click", openMemoryDrawer);
  }

  const view = document.querySelector("#view");
  const sidebar = document.querySelector("#sidebar");
  const todoFlyout = document.querySelector("#todo-flyout");
  const appShell = document.querySelector("#app");
  const mobileMenuToggle = document.querySelector("#mobile-menu-toggle");
  const mobileMenuOverlay = document.querySelector("#mobile-menu-overlay");
  const pages = {
    home: { render: renderHomePage, bind: bindHomePage },
    chat: { render: renderChatPage, bind: bindChatPage },
    tools: { render: renderToolsPage, bind: bindToolsPage },
    todos: { render: renderTodosPage, bind: bindTodosPage },
    reports: { render: renderReportsPage, bind: bindReportsPage },
    profile: { render: renderProfilePage, bind: bindProfilePage },
    signin: { render: renderSigninPage, bind: bindSigninPage },
    channels: { render: renderChannelsPage, bind: bindChannelsPage },
    settings: { render: renderSettingsPage, bind: bindSettingsPage },
  };

  function renderApp() {
    const page = pages[state.currentRoute] || pages.home;
    appShell.classList.toggle("mobile-menu-open", state.mobileMenuOpen);
    appShell.classList.toggle("auth-mode", state.currentRoute === "signin");
    if (state.currentRoute !== "signin") {
      renderSidebar(sidebar, state);
    } else {
      sidebar.innerHTML = "";
      todoFlyout.innerHTML = "";
      todoFlyout.classList.remove("open");
    }
    view.innerHTML = page.render(state);
    if (page.bind) {
      page.bind(view);
    }
    if (state.currentRoute !== "signin") {
      if (state.channelDrawerId) {
        renderChannelDrawer(todoFlyout, state);
      } else if (state.reportDrawerId) {
        renderReportDrawer(todoFlyout, state);
      } else if (state.toolDrawerId) {
        renderToolDrawer(todoFlyout, state);
      } else if (state.memoryDrawerOpen) {
        renderMemoryDrawer(todoFlyout, state);
      } else {
        renderTodoFlyout(todoFlyout, state);
      }
    }
  }

  syncStats(state);
  subscribe(renderApp);
  initRouter(renderApp);
  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener("click", toggleMobileMenu);
  }
  if (mobileMenuOverlay) {
    mobileMenuOverlay.addEventListener("click", closeMobileMenu);
  }
  renderApp();

  window.runReport = runReport;
  window.saveTodo = saveTodo;
  window.sendMessage = sendMessage;
})();
