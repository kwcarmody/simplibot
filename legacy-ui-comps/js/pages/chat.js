import { sendMessage, setSelectedTool } from "../state.js";

const toolOptions = ["Web Search", "Calendar", "Filesystem", "CRM", "Automation"];

export function renderChatPage(appState) {
  return `
    <section class="page-shell chat-page">
      <header class="page-header">
        <div>
          <h1>Chat</h1>
          <p class="page-subtitle">
            Converse with the agent, attach placeholders, and route messages through a static tool selection.
          </p>
        </div>
        <div class="page-badge">${appState.chatMessages.length} messages</div>
      </header>

      <div class="chat-layout">
        <section class="chat-panel">
          <div class="chat-thread" id="chat-thread">
            ${appState.chatMessages
              .map(
                (message) => `
                  <div class="message-row ${message.role}">
                    <div class="message-bubble">
                      <div class="message-meta-row">
                        <div class="message-meta">${message.author} • ${message.time}</div>
                        <button
                          class="btn memory-icon-button"
                          type="button"
                          data-bs-toggle="tooltip"
                          data-bs-placement="top"
                          title="Save to memory."
                          aria-label="Save to memory"
                        >
                          <i class="uil uil-brain"></i>
                        </button>
                      </div>
                      <div>${message.text}</div>
                    </div>
                  </div>
                `
              )
              .join("")}
            <div class="message-row actions">
              <div class="message-bubble action-bubble">
                <button class="message-action-chip" type="button">Review Missing Credentials</button>
                <button class="message-action-chip" type="button">Open Reports</button>
              </div>
            </div>
          </div>
        </section>

        <section class="composer-panel">
          <form id="chat-form">
            <div class="input-group mb-3">
              <input
                id="chat-input"
                class="form-control composer-input"
                type="text"
                placeholder="Ask the agent to summarize, draft, or run a placeholder action..."
              />
              <button class="btn chat-icon-button" type="submit" aria-label="Send message">
                <i class="uil uil-comment-message"></i>
              </button>
            </div>
            <div class="d-flex justify-content-between align-items-center gap-2">
              <div class="d-flex gap-2 align-items-center">
                <button id="attach-button" class="btn chat-icon-button" type="button" aria-label="Attach">
                  <i class="uil uil-plus attach-icon"></i>
                </button>
                <div class="dropdown mobile-tool-menu">
                  <button
                    id="tool-menu-button"
                    class="btn chat-icon-button"
                    type="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                    aria-label="Choose tool"
                  >
                    <i class="uil uil-ellipsis-v"></i>
                  </button>
                  <ul class="dropdown-menu mobile-tool-dropdown">
                    ${toolOptions
                      .map(
                        (tool) => `
                          <li>
                            <button
                              class="dropdown-item ${appState.selectedTool === tool ? "active" : ""}"
                              type="button"
                              data-tool-option="${tool}"
                            >
                              ${tool}
                            </button>
                          </li>
                        `
                      )
                      .join("")}
                  </ul>
                </div>
                <select id="tool-select" class="form-select" style="width: 220px; flex: 0 0 220px;">
                  ${toolOptions
                    .map(
                      (tool) => `<option ${appState.selectedTool === tool ? "selected" : ""}>${tool}</option>`
                    )
                    .join("")}
                </select>
              </div>
              <button id="new-session-button" class="btn btn-sm btn-secondary-global" type="button">+ Session</button>
            </div>
          </form>
        </section>
      </div>
    </section>
  `;
}

export function bindChatPage(container) {
  const form = container.querySelector("#chat-form");
  const input = container.querySelector("#chat-input");
  const toolSelect = container.querySelector("#tool-select");
  const attachButton = container.querySelector("#attach-button");
  const newSessionButton = container.querySelector("#new-session-button");
  const panel = container.querySelector(".chat-panel");
  const thread = container.querySelector("#chat-thread");

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage(input.value);
    input.value = "";
  });

  toolSelect?.addEventListener("change", (event) => {
    setSelectedTool(event.target.value);
  });

  container.querySelectorAll("[data-tool-option]").forEach((button) => {
    button.addEventListener("click", () => {
      setSelectedTool(button.dataset.toolOption);
    });
  });

  attachButton?.addEventListener("click", () => {
    sendMessage("Attachment placeholder clicked.");
  });

  newSessionButton?.addEventListener("click", () => {
    sendMessage("Started a new placeholder session.");
  });

  if (panel && thread) {
    panel.scrollTop = panel.scrollHeight;
  }

  container.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((element) => {
    bootstrap.Tooltip.getOrCreateInstance(element);
  });
}
