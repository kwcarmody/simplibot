import { clearMemory, openMemoryDrawer, updateSetting, updateState } from "../state.js";

export function renderSettingsPage(appState) {
  const { model, memory, tools, channels } = appState.settings;
  const sectionHeader = (label) => `
    <div class="settings-section-header">
      <div class="muted-label">${label}</div>
      <button class="btn btn-sm btn-secondary-global" type="button">Save</button>
    </div>
  `;

  return `
    <section class="page-shell">
      <header class="page-header">
        <div>
          <h1>Settings</h1>
          <p class="page-subtitle">
            Configure model, memory, tool, and channel settings using frontend-only local state.
          </p>
        </div>
        <div class="page-badge">Local state only</div>
      </header>

      <div class="settings-grid">
        <section class="settings-section">
          ${sectionHeader("Model Settings")}
          <div class="settings-stack mt-3 mb-3">
            <div class="w-100">
              <label class="form-label">Provider</label>
              <select class="form-select" data-section="model" data-field="provider">
                ${["Local", "Ollama", "Other"]
                  .map((item) => `<option ${model.provider === item ? "selected" : ""}>${item}</option>`)
                  .join("")}
              </select>
            </div>
          </div>
          <div class="settings-stack mb-3">
            <div class="w-100">
              <label class="form-label">Model</label>
              <select class="form-select" data-section="model" data-field="model">
                ${["GPT-4.1-mini", "llama3.2", "custom-endpoint"]
                  .map((item) => `<option ${model.model === item ? "selected" : ""}>${item}</option>`)
                  .join("")}
              </select>
            </div>
          </div>
          <div class="settings-stack mb-3">
            <div class="w-100">
              <label class="form-label">API Key</label>
              <input class="form-control" data-section="model" data-field="apiKey" value="${escapeValue(
                model.apiKey
              )}" />
            </div>
          </div>
          <div class="settings-stack">
            <div class="w-100">
              <label class="form-label">API Endpoint</label>
              <input class="form-control" data-section="model" data-field="endpoint" value="${escapeValue(
                model.endpoint
              )}" />
            </div>
          </div>
        </section>

        <section class="settings-section">
          ${sectionHeader("Memory Settings")}
          <div class="toggle-row mt-3 mb-3">
            <div>
              <div class="fw-semibold">Enable memory</div>
              <div class="settings-help small">Keep user and bot context available across sessions.</div>
            </div>
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" data-memory-toggle ${
                memory.enabled ? "checked" : ""
              } />
            </div>
          </div>
          <div class="surface-card memory-summary mb-3">
            <div class="memory-summary-icon"><i class="uil uil-brain"></i></div>
            <div class="memory-summary-content">
              <div class="fw-semibold">${appState.memories.length} memories saved</div>
              <div class="settings-help small">Search, filter, and remove saved context from the drawer.</div>
              <button id="view-memories" class="btn btn-sm btn-secondary-global memory-summary-button" type="button">
                View
              </button>
            </div>
          </div>
          <div class="settings-stack mb-3">
            <div class="w-100">
              <label class="form-label">Memory max size</label>
              <input class="form-control" data-section="memory" data-field="maxSize" value="${escapeValue(
                memory.maxSize
              )}" />
            </div>
          </div>
          <div class="settings-stack mb-3">
            <div class="w-100">
              <label class="form-label">User name</label>
              <input class="form-control" data-section="memory" data-field="userName" value="${escapeValue(
                memory.userName
              )}" />
            </div>
          </div>
          <div class="settings-stack mb-3">
            <div class="w-100">
              <label class="form-label">User description</label>
              <textarea class="form-control" rows="3" data-section="memory" data-field="userDescription">${escapeValue(
                memory.userDescription
              )}</textarea>
            </div>
          </div>
          <div class="settings-stack mb-3">
            <div class="w-100">
              <label class="form-label">Bot name</label>
              <input class="form-control" data-section="memory" data-field="botName" value="${escapeValue(
                memory.botName
              )}" />
            </div>
          </div>
          <div class="settings-stack mb-3">
            <div class="w-100">
              <label class="form-label">Bot description</label>
              <textarea class="form-control" rows="3" data-section="memory" data-field="botDescription">${escapeValue(
                memory.botDescription
              )}</textarea>
            </div>
          </div>
          <button id="clear-memory" class="btn btn-danger-global">Delete All</button>
        </section>

        <section class="settings-section">
          ${sectionHeader("Tools Settings")}
          <div class="settings-stack mt-3 mb-3">
            <div class="w-100">
              <label class="form-label">API</label>
              <input class="form-control" value="${escapeValue(tools.apiBase)}" readonly />
            </div>
          </div>
          <div class="settings-stack">
            <div class="w-100">
              <label class="form-label">API Key</label>
              <input class="form-control" data-section="tools" data-field="apiKey" value="${escapeValue(
                tools.apiKey
              )}" />
            </div>
          </div>
        </section>

        <section class="settings-section">
          ${sectionHeader("Channel Settings")}
          <div class="settings-stack mt-3 mb-3">
            <div class="w-100">
              <label class="form-label">Telegram Bot Token</label>
              <input class="form-control" data-section="channels" data-field="telegramToken" value="${escapeValue(
                channels.telegramToken
              )}" />
            </div>
          </div>
          <div class="settings-stack mb-3">
            <div class="w-100">
              <label class="form-label">Email Address</label>
              <input class="form-control" data-section="channels" data-field="emailAddress" value="${escapeValue(
                channels.emailAddress
              )}" />
            </div>
          </div>
          <div class="settings-stack mb-3">
            <div class="w-100">
              <label class="form-label">Password</label>
              <input class="form-control" data-section="channels" data-field="emailPassword" value="${escapeValue(
                channels.emailPassword
              )}" />
            </div>
          </div>
          <div class="settings-stack mb-3">
            <div class="w-100">
              <label class="form-label">Server</label>
              <input class="form-control" data-section="channels" data-field="emailServer" value="${escapeValue(
                channels.emailServer
              )}" />
            </div>
          </div>
          <div class="settings-stack">
            <div class="w-100">
              <label class="form-label">Port</label>
              <input class="form-control" data-section="channels" data-field="emailPort" value="${escapeValue(
                channels.emailPort
              )}" />
            </div>
          </div>
        </section>
      </div>
    </section>
  `;
}

export function bindSettingsPage(container) {
  container.querySelectorAll("[data-section][data-field]").forEach((field) => {
    const eventName = field.tagName === "SELECT" ? "change" : "input";
    field.addEventListener(eventName, (event) => {
      updateSetting(field.dataset.section, field.dataset.field, event.target.value);
    });
  });

  container.querySelector("[data-memory-toggle]")?.addEventListener("change", (event) => {
    updateState((draft) => {
      draft.settings.memory.enabled = event.target.checked;
    });
  });

  container.querySelector("#clear-memory")?.addEventListener("click", clearMemory);
  container.querySelector("#view-memories")?.addEventListener("click", openMemoryDrawer);
}

function escapeValue(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
