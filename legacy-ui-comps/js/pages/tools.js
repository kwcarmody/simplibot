import { openToolDrawer, setToolSearch, toggleTool } from "../state.js";

export function renderToolsPage(appState) {
  const query = appState.filters.toolSearch.trim().toLowerCase();
  const visibleTools = appState.tools.filter((tool) =>
    [tool.title, tool.description].some((value) => value.toLowerCase().includes(query))
  );

  return `
    <section class="page-shell">
      <header class="page-header">
        <div>
          <h1>Tools</h1>
          <p class="page-subtitle">
            Search available capabilities and toggle them on or off without leaving the interface.
          </p>
        </div>
        <div class="page-badge">${visibleTools.length} visible</div>
      </header>

      <div class="toolbar">
        <div class="search-field">
          <span class="search-icon" aria-hidden="true"><i class="uil uil-search"></i></span>
          <input id="tool-search" class="form-control" placeholder="Search tools" value="${escapeValue(
            appState.filters.toolSearch
          )}" />
        </div>
      </div>

      <div class="tool-grid">
        ${visibleTools
          .map(
            (tool) => `
              <article class="tool-card">
                <div class="tool-row mb-3">
                  <div>
                    <h2 class="h5 mb-1">${tool.title}</h2>
                    <p class="tool-description mb-0">${tool.description}</p>
                  </div>
                  <div class="form-check form-switch">
                    <input class="form-check-input" type="checkbox" data-tool-id="${tool.id}" ${
                      tool.enabled ? "checked" : ""
                    } />
                  </div>
                </div>
                <div class="card-footer-row">
                  <div class="${tool.enabled ? "status-label-enabled" : "status-label-disabled"}">
                    ${tool.enabled ? "Enabled" : "Disabled"}
                  </div>
                  <button class="tool-config-button" type="button" data-configure-tool="${tool.id}">
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

export function bindToolsPage(container) {
  container.querySelector("#tool-search")?.addEventListener("input", (event) => {
    setToolSearch(event.target.value);
  });

  container.querySelectorAll("[data-tool-id]").forEach((toggle) => {
    toggle.addEventListener("change", () => toggleTool(toggle.dataset.toolId));
  });

  container.querySelectorAll("[data-configure-tool]").forEach((button) => {
    button.addEventListener("click", () => openToolDrawer(button.dataset.configureTool));
  });
}

function escapeValue(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}
