import { closeChannelDrawer, toggleChannel, updateChannelConfigField } from "../state.js";

const deliveryOptions = ["Instant", "Digest", "Manual review"];

export function renderChannelDrawer(container, appState) {
  const channel = appState.channels.find((item) => item.id === appState.channelDrawerId);

  if (!channel) {
    container.classList.remove("open");
    container.innerHTML = "";
    return;
  }

  container.classList.add("open");
  container.innerHTML = `
    <div class="drawer-header">
      <div class="d-flex align-items-start justify-content-between gap-3">
        <div>
          <div class="muted-label">Channel Settings</div>
          <h2 class="h4 mt-2 mb-1">Configure ${channel.title}</h2>
          <div class="text-secondary small">${channel.id}</div>
        </div>
        <button id="close-channel-drawer" class="btn btn-sm btn-secondary-global">Close</button>
      </div>
    </div>
    <div class="drawer-body">
      <div class="toggle-row mb-4">
        <div>
          <div class="fw-semibold">Enabled</div>
          <div class="settings-help small">Allow outbound workflows to use this channel.</div>
        </div>
        <div class="form-check form-switch">
          <input id="channel-enabled-toggle" class="form-check-input" type="checkbox" ${channel.enabled ? "checked" : ""} />
        </div>
      </div>

      <div class="settings-stack mb-3">
        <div class="w-100">
          <label class="form-label">Endpoint</label>
          <input class="form-control" data-channel-config-field="endpoint" value="${escapeValue(channel.config.endpoint)}" />
        </div>
      </div>

      <div class="settings-stack mb-3">
        <div class="w-100">
          <label class="form-label">Identity</label>
          <input class="form-control" data-channel-config-field="identity" value="${escapeValue(channel.config.identity)}" />
        </div>
      </div>

      <div class="settings-stack mb-3">
        <div class="w-100">
          <label class="form-label">Delivery Mode</label>
          <select class="form-select" data-channel-config-field="delivery">
            ${deliveryOptions
              .map((option) => `<option ${channel.config.delivery === option ? "selected" : ""}>${option}</option>`)
              .join("")}
          </select>
        </div>
      </div>

      <div class="settings-stack mb-4">
        <div class="w-100">
          <label class="form-label">Notes</label>
          <textarea class="form-control" rows="6" data-channel-config-field="notes">${escapeValue(channel.config.notes)}</textarea>
        </div>
      </div>

      <button id="save-channel-config" class="btn w-100" type="button">Save</button>
    </div>
  `;

  container.querySelector("#close-channel-drawer")?.addEventListener("click", closeChannelDrawer);
  container.querySelector("#channel-enabled-toggle")?.addEventListener("change", () => {
    toggleChannel(channel.id);
  });
  container.querySelectorAll("[data-channel-config-field]").forEach((field) => {
    const eventName = field.tagName === "SELECT" ? "change" : "input";
    field.addEventListener(eventName, (event) => {
      updateChannelConfigField(channel.id, field.dataset.channelConfigField, event.target.value);
    });
  });
  container.querySelector("#save-channel-config")?.addEventListener("click", closeChannelDrawer);
}

function escapeValue(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
