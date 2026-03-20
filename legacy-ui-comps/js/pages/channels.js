import { openChannelDrawer, toggleChannel } from "../state.js";

export function renderChannelsPage(appState) {
  return `
    <section class="page-shell">
      <header class="page-header">
        <div>
          <h1>Channels</h1>
          <p class="page-subtitle">
            Manage static messaging endpoints and test enable or disable states for outbound workflows.
          </p>
        </div>
        <div class="page-badge">${appState.channels.filter((item) => item.enabled).length} enabled</div>
      </header>

      <div class="channel-grid">
        ${appState.channels
          .map(
            (channel) => `
              <article class="channel-card">
                <div class="channel-row">
                  <div>
                    <h2 class="h5 mb-1">${channel.title}</h2>
                    <p class="channel-description mb-0">${channel.description}</p>
                  </div>
                  <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" data-channel-id="${channel.id}" ${
                      channel.enabled ? "checked" : ""
                    } />
                  </div>
                </div>
                <div class="card-footer-row">
                  <button class="tool-config-button" type="button" data-configure-channel="${channel.id}">
                    <span>Configure</span>
                    <i class="uil uil-setting"></i>
                  </button>
                </div>
              </article>
            `
          )
          .join("")}
      </div>
    </section>
  `;
}

export function bindChannelsPage(container) {
  container.querySelectorAll("[data-channel-id]").forEach((toggle) => {
    toggle.addEventListener("change", () => toggleChannel(toggle.dataset.channelId));
  });

  container.querySelectorAll("[data-configure-channel]").forEach((button) => {
    button.addEventListener("click", () => openChannelDrawer(button.dataset.configureChannel));
  });
}
