import { closeToolDrawer, toggleTool, updateToolConfigField } from "../state.js";

const scopeOptions = ["Workspace", "Personal", "Approved paths", "Ops", "Sales"];
const refreshOptions = ["On demand", "1 min", "5 min", "10 min", "15 min", "30 min"];

export function renderToolDrawer(container, appState) {
  const tool = appState.tools.find((item) => item.id === appState.toolDrawerId);

  if (!tool) {
    container.classList.remove("open");
    container.innerHTML = "";
    return;
  }

  container.classList.add("open");
  container.innerHTML = `
    <div class="drawer-header">
      <div class="d-flex align-items-start justify-content-between gap-3">
        <div>
          <div class="muted-label">Tool Settings</div>
          <h2 class="h4 mt-2 mb-1">Configure ${tool.title}</h2>
          <div class="text-secondary small">${tool.id}</div>
        </div>
        <button id="close-tool-drawer" class="btn btn-sm btn-secondary-global">Close</button>
      </div>
    </div>
    <div class="drawer-body">
      <div class="toggle-row mb-4">
        <div>
          <div class="fw-semibold">Enabled</div>
          <div class="settings-help small">Allow this tool to appear in agent workflows.</div>
        </div>
        <div class="form-check form-switch">
          <input id="tool-enabled-toggle" class="form-check-input" type="checkbox" ${tool.enabled ? "checked" : ""} />
        </div>
      </div>

      <div class="settings-stack mb-3">
        <div class="w-100">
          <label class="form-label">Endpoint</label>
          <input class="form-control" data-tool-config-field="endpoint" value="${escapeValue(tool.config.endpoint)}" />
        </div>
      </div>

      <div class="settings-stack mb-3">
        <div class="w-100">
          <label class="form-label">Access Scope</label>
          <select class="form-select" data-tool-config-field="scope">
            ${scopeOptions
              .map((option) => `<option ${tool.config.scope === option ? "selected" : ""}>${option}</option>`)
              .join("")}
          </select>
        </div>
      </div>

      <div class="settings-stack mb-3">
        <div class="w-100">
          <label class="form-label">Refresh Interval</label>
          <select class="form-select" data-tool-config-field="refresh">
            ${refreshOptions
              .map((option) => `<option ${tool.config.refresh === option ? "selected" : ""}>${option}</option>`)
              .join("")}
          </select>
        </div>
      </div>

      <div class="settings-stack mb-4">
        <div class="w-100">
          <label class="form-label">Notes</label>
          <textarea class="form-control" rows="6" data-tool-config-field="notes">${escapeValue(tool.config.notes)}</textarea>
        </div>
      </div>

      <button id="save-tool-config" class="btn w-100" type="button">Save</button>
    </div>
  `;

  container.querySelector("#close-tool-drawer")?.addEventListener("click", closeToolDrawer);
  container.querySelector("#tool-enabled-toggle")?.addEventListener("change", () => {
    toggleTool(tool.id);
  });
  container.querySelectorAll("[data-tool-config-field]").forEach((field) => {
    const eventName = field.tagName === "SELECT" ? "change" : "input";
    field.addEventListener(eventName, (event) => {
      updateToolConfigField(tool.id, field.dataset.toolConfigField, event.target.value);
    });
  });
  container.querySelector("#save-tool-config")?.addEventListener("click", closeToolDrawer);
}

function escapeValue(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
