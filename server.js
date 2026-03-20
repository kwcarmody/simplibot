const path = require("path");
const express = require("express");
const session = require("express-session");
const { getViewModel } = require("./server/data");
const {
  PB_API_BASE,
  PB_AUTH_COLLECTION,
  createClient,
  getAuthorizationRecord,
  getUserSettingsRecord,
  maskToken,
  normalizeFeatures,
  saveUserSettingsRecord,
  signInWithPassword,
} = require("./server/pocketbase");

const app = express();
const port = process.env.PORT || 3000;
const protectedRoutes = new Set(["home", "chat", "tools", "todos", "reports", "channels", "settings", "profile"]);
const allRoutes = new Set([...protectedRoutes, "signin"]);
const routeFeatureMap = {
  home: "home",
  chat: "chat",
  tools: "tools",
  todos: "todos",
  reports: "reports",
  channels: "channels",
  settings: "settings",
  profile: "profile",
};

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(
  session({
    name: "pikori.sid",
    secret: process.env.SESSION_SECRET || "pikori-dev-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 8,
    },
  })
);

app.use("/css", express.static(path.join(__dirname, "css")));
app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/node_modules", express.static(path.join(__dirname, "node_modules")));

app.get("/", (req, res) => {
  res.redirect("/signin");
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("pikori.sid");
    res.redirect("/signin");
  });
});

app.post("/settings/model", async (req, res) => {
  if (!req.session.auth?.token) {
    return res.status(401).json({ ok: false, error: "Sign in required." });
  }

  const provider = String(req.body.provider || "None").trim();
  const model = String(req.body.model || "").trim();
  const endpoint = String(req.body.endpoint || "").trim();
  const apiKey = String(req.body.apiKey || "").trim();

  const validationError = validateModelSettings({ provider, model, endpoint, apiKey });
  if (validationError) {
    return res.status(400).json({ ok: false, error: validationError });
  }

  try {
    await testModelConnection({ provider, model, endpoint, apiKey });

    const client = createClient(req.session.auth.token);
    await saveUserSettingsRecord(client, req.session.auth.user.id, {
      modelProvider: provider,
      modelName: model,
      modelEndpoint: endpoint,
      modelApiToken: apiKey,
    });

    req.session.ui = {
      ...(req.session.ui || {}),
      settings: {
        ...((req.session.ui && req.session.ui.settings) || {}),
        model: {
          provider,
          model,
          endpoint,
          apiKey,
        },
      },
    };

    return res.json({ ok: true, message: "Model connected." });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: "Model connection failed.",
      details: error.message,
    });
  }
});

app.post("/settings/memory", async (req, res) => {
  if (!req.session.auth?.token) {
    return res.status(401).json({ ok: false, error: "Sign in required." });
  }

  const enabled = String(req.body.enabled || "") === "true";
  const maxSize = Number.parseInt(String(req.body.maxSize || ""), 10);
  const userName = String(req.body.userName || "").trim();
  const userDescription = String(req.body.userDescription || "").trim();
  const botName = String(req.body.botName || "").trim();
  const botDescription = String(req.body.botDescription || "").trim();

  const validationError = validateMemorySettings({ maxSize, userName, botName, botDescription });
  if (validationError) {
    return res.status(400).json({ ok: false, error: validationError });
  }

  try {
    const client = createClient(req.session.auth.token);
    await saveUserSettingsRecord(client, req.session.auth.user.id, {
      memoryEnabled: enabled,
      memoryMaxSize: maxSize,
      memoryUserName: userName,
      memoryUserDescription: userDescription,
      memoryBotName: botName,
      memoryBotDescription: botDescription,
    });

    req.session.ui = {
      ...(req.session.ui || {}),
      settings: {
        ...((req.session.ui && req.session.ui.settings) || {}),
        memory: {
          enabled,
          maxSize,
          userName,
          userDescription,
          botName,
          botDescription,
        },
      },
    };

    return res.json({ ok: true, message: "Memory settings saved." });
  } catch (error) {
    console.error(error);
    return res.status(502).json({
      ok: false,
      error: "Memory settings could not be saved.",
    });
  }
});

app.post("/chat/send", async (req, res) => {
  if (!req.session.auth?.token) {
    return res.status(401).json({ ok: false, error: "Sign in required." });
  }

  const messageText = String(req.body.message || "").trim();
  if (!messageText) {
    return res.status(400).json({ ok: false, error: "Type a message first." });
  }

  const settings = getSessionSettings(req);
  const modelSettings = settings.model || {};
  const memorySettings = settings.memory || {};
  const modelValidationError = validateConfiguredChatModel(modelSettings);
  if (modelValidationError) {
    return res.status(400).json({ ok: false, error: modelValidationError });
  }

  const chatState = ensureChatSession(req);
  const userMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    role: "user",
    author: memorySettings.userName || "User",
    text: messageText,
    time: formatChatTimestamp(),
  };

  chatState.messages.push(userMessage);

  try {
    const assistantText = await generateChatReply({
      modelSettings,
      memorySettings,
      chatMessages: chatState.messages,
    });

    const assistantMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      role: "assistant",
      author: memorySettings.botName || "Pikori",
      text: assistantText,
      time: formatChatTimestamp(),
    };

    chatState.messages.push(assistantMessage);

    return res.json({
      ok: true,
      userMessage,
      assistantMessage,
      chatMessages: chatState.messages,
    });
  } catch (error) {
    console.error(error);
    return res.status(502).json({
      ok: false,
      error: "The model could not respond right now.",
      chatMessages: chatState.messages,
    });
  }
});

app.post("/chat/reset", (req, res) => {
  if (!req.session.auth?.token) {
    return res.status(401).json({ ok: false, error: "Sign in required." });
  }

  req.session.chat = {
    messages: [],
  };

  res.json({ ok: true });
});

app.post("/signin", async (req, res) => {
  const body = req.body || {};
  const email = String(body.email || "").trim();
  const password = String(body.password || "");
  const isFetchRequest = req.get("X-Pikori-Auth") === "fetch";

  if (!email || !password) {
    const message = "Enter your email and password to continue.";
    if (isFetchRequest) {
      return res.status(400).json({ ok: false, error: message });
    }
    return renderSignin(res, {
      email,
      error: message,
    });
  }

  try {
    const { client, authData } = await signInWithPassword(email, password);
    const authRecord = authData?.record || client.authStore?.record || authData;
    if (!authRecord?.id || !authRecord?.email) {
      throw new Error("PocketBase authentication succeeded without a usable user record.");
    }
    const authorizationRecord = await getAuthorizationRecord(client, authRecord.id);
    const userSettingsRecord = await getUserSettingsRecord(client, authRecord.id);
    const features = normalizeFeatures(authorizationRecord.features);
    const redirectTo = getFirstAuthorizedRoute(features);

    req.session.auth = {
      token: client.authStore.token,
      user: {
        id: authRecord.id,
        email: authRecord.email,
        name: authRecord.name || authRecord.email,
      },
      authorization: {
        id: authorizationRecord.id,
        role: authorizationRecord.role || "default",
        features,
      },
      api: {
        endpoint: authorizationRecord.apiBase || PB_API_BASE,
        authCollection: PB_AUTH_COLLECTION,
        tokenPreview: maskToken(client.authStore.token),
      },
    };
    req.session.ui = {
      ...(req.session.ui || {}),
      settings: mapUserSettingsRecordToSettings(userSettingsRecord),
    };
    req.session.chat = req.session.chat || { messages: [] };

    if (isFetchRequest) {
      return res.json({ ok: true, redirect: redirectTo });
    }
    res.redirect(redirectTo);
  } catch (error) {
    console.error(error);
    const message =
      error?.status === 400 || error?.status === 401
        ? "The email or password was not accepted."
        : "Sign in failed. Check the PocketBase connection and authorization record.";

    if (isFetchRequest) {
      return res.status(401).json({ ok: false, error: message });
    }

    renderSignin(res, {
      email,
      error: message,
    });
  }
});

app.get("/:route", (req, res, next) => {
  const route = req.params.route;
  if (!allRoutes.has(route)) {
    return next();
  }

  if (route === "signin") {
    return renderSignin(res, {});
  }

  if (protectedRoutes.has(route) && !req.session.auth?.token) {
    return res.redirect("/signin");
  }

  const requiredFeature = routeFeatureMap[route];
  const features = req.session.auth?.authorization?.features || {};
  if (requiredFeature && !features[requiredFeature]) {
    return res.redirect(getFirstAuthorizedRoute(features));
  }

  const viewModel = getViewModel(route, req.query, req.session.auth || null, {
    chatMessages: req.session.chat?.messages || [],
    settingsOverride: req.session.ui?.settings || null,
  });
  res.render("layout", {
    ...viewModel,
    isAuthPage: false,
    pageTemplate: `pages/${route}`,
  });
});

app.use((req, res) => {
  res.status(404).render("layout", {
    ...getViewModel("home", {}),
    title: "Not Found | Pikori",
    isAuthPage: false,
    pageTemplate: "pages/not-found",
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Pikori EJS app listening on http://localhost:${port}`);
  });
}

module.exports = app;

function getFirstAuthorizedRoute(features = {}) {
  const enabled = normalizeFeatures(features);
  return (
    Object.entries(routeFeatureMap).find(([, feature]) => enabled[feature])?.[0]
      ? `/${Object.entries(routeFeatureMap).find(([, feature]) => enabled[feature])[0]}`
      : "/signin"
  );
}

function renderSignin(res, options) {
  const viewModel = getViewModel("signin", {}, null, {
    signin: {
      email: options.email || "",
      error: options.error || "",
    },
  });

  res.status(options.error ? 401 : 200).render("layout", {
    ...viewModel,
    isAuthPage: true,
    pageTemplate: "pages/signin",
  });
}

function getSessionSettings(req) {
  const uiSettings = req.session.ui?.settings || {};
  return {
    model: {
      provider: uiSettings.model?.provider || "None",
      model: uiSettings.model?.model || "",
      endpoint: uiSettings.model?.endpoint || "",
      apiKey: uiSettings.model?.apiKey || "",
    },
    memory: {
      enabled: Boolean(uiSettings.memory?.enabled),
      maxSize: Number.isFinite(Number(uiSettings.memory?.maxSize)) ? Number(uiSettings.memory.maxSize) : 100,
      userName: uiSettings.memory?.userName || "User",
      userDescription: uiSettings.memory?.userDescription || "",
      botName: uiSettings.memory?.botName || "Pikori",
      botDescription: uiSettings.memory?.botDescription || "You're a helpful robot assistant.",
    },
  };
}

function ensureChatSession(req) {
  req.session.chat = req.session.chat || { messages: [] };
  req.session.chat.messages = Array.isArray(req.session.chat.messages) ? req.session.chat.messages : [];
  return req.session.chat;
}

function mapUserSettingsRecordToSettings(record) {
  if (!record) {
    return null;
  }

  return {
    model: {
      provider: record.modelProvider || "None",
      model: record.modelName || "",
      endpoint: record.modelEndpoint || "",
      apiKey: record.modelApiToken || "",
    },
    memory: {
      enabled: Boolean(record.memoryEnabled),
      maxSize: Number.isFinite(Number(record.memoryMaxSize)) ? Number(record.memoryMaxSize) : 100,
      userName: record.memoryUserName || "User",
      userDescription: record.memoryUserDescription || "",
      botName: record.memoryBotName || "Pikori",
      botDescription: record.memoryBotDescription || "You're a helpful robot assistant.",
    },
  };
}

function validateModelSettings({ provider, model, endpoint, apiKey }) {
  if (provider === "None") {
    return "Choose a provider before saving model settings.";
  }

  if (!model) {
    return "Choose a model before saving.";
  }

  if (!endpoint) {
    return "API Endpoint is required.";
  }

  if (provider === "Ollama-Cloud" && !apiKey) {
    return "API Token is required for cloud models.";
  }

  return "";
}

function validateConfiguredChatModel({ provider, model, endpoint, apiKey }) {
  if (provider === "None" || !provider) {
    return "Configure a model in Settings before using Chat.";
  }

  if (!model || !endpoint) {
    return "Complete the model configuration in Settings before using Chat.";
  }

  if (provider === "Ollama-Cloud" && !apiKey) {
    return "Add the API Token in Settings before using Chat.";
  }

  return "";
}

function validateMemorySettings({ maxSize, userName, botName, botDescription }) {
  if (!Number.isInteger(maxSize) || maxSize <= 0) {
    return "Memory max size must be a positive whole number.";
  }

  if (!userName) {
    return "User name is required.";
  }

  if (!botName) {
    return "Bot name is required.";
  }

  if (!botDescription) {
    return "Bot description is required.";
  }

  return "";
}

function formatChatTimestamp() {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

async function testModelConnection({ provider, model, endpoint, apiKey }) {
  const normalizedEndpoint = endpoint.replace(/\/+$/, "");
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (provider === "Ollama-Cloud" && apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const testUrl = /\/(api\/chat|v1\/chat\/completions)$/i.test(normalizedEndpoint)
    ? normalizedEndpoint
    : `${normalizedEndpoint}/api/chat`;

  const response = await fetch(testUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: "Respond with OK",
        },
      ],
      stream: false,
    }),
  });

  if (response.ok) {
    return true;
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error(`Authentication rejected by model endpoint (${response.status}).`);
  }

  throw new Error(`Endpoint responded with ${response.status}.`);
}

async function generateChatReply({ modelSettings, memorySettings, chatMessages }) {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (modelSettings.provider === "Ollama-Cloud" && modelSettings.apiKey) {
    headers.Authorization = `Bearer ${modelSettings.apiKey}`;
  }

  const systemParts = [
    `Your name is ${memorySettings.botName}.`,
    `You are ${memorySettings.botDescription}`,
    `The user's name is ${memorySettings.userName}.`,
  ];

  if (memorySettings.userDescription) {
    systemParts.push(`User description: ${memorySettings.userDescription}`);
  }

  systemParts.push("Be helpful, concise, and conversational.");

  const payload = {
    model: modelSettings.model,
    stream: false,
    messages: [
      {
        role: "system",
        content: systemParts.join(" "),
      },
      ...chatMessages.map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.text,
      })),
    ],
  };

  const response = await fetch(resolveChatEndpoint(modelSettings.endpoint), {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || data?.message || `Model request failed with ${response.status}.`);
  }

  const content = data?.message?.content || data?.choices?.[0]?.message?.content || "";
  if (!content) {
    throw new Error("Model returned an empty response.");
  }

  return String(content).trim();
}

function resolveChatEndpoint(endpoint) {
  const normalizedEndpoint = endpoint.replace(/\/+$/, "");
  return /\/(api\/chat|v1\/chat\/completions)$/i.test(normalizedEndpoint)
    ? normalizedEndpoint
    : `${normalizedEndpoint}/api/chat`;
}
