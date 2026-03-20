import {
  closeMemoryDrawer,
  deleteMemory,
  setMemorySearch,
  setMemoryType,
  state,
} from "../state.js";

const memoryTypes = ["All", "Preference", "Profile", "Workflow", "Product"];

export function renderMemoryDrawer(container, appState) {
  if (!appState.memoryDrawerOpen) {
    container.classList.remove("open");
    container.innerHTML = "";
    return;
  }

  const query = appState.memoryFilters.search.trim().toLowerCase();
  const memories = appState.memories.filter((memory) => {
    const matchesSearch = [memory.id, memory.title, memory.content, memory.type].some((value) =>
      value.toLowerCase().includes(query)
    );
    const matchesType =
      appState.memoryFilters.type === "All" || memory.type === appState.memoryFilters.type;
    return matchesSearch && matchesType;
  });

  container.classList.add("open");
  container.innerHTML = `
    <div class="drawer-header">
      <div class="d-flex align-items-start justify-content-between gap-3 mb-4">
        <div>
          <div class="muted-label">Memory Drawer</div>
          <h2 class="h4 mt-2 mb-1">Manage Memories</h2>
          <div class="text-secondary small">${memories.length} visible</div>
        </div>
        <button id="close-memory-drawer" class="btn btn-sm btn-secondary-global">Close</button>
      </div>
      <div class="toolbar">
        <div class="search-field">
          <span class="search-icon" aria-hidden="true"><i class="uil uil-search"></i></span>
          <input id="memory-search" class="form-control" placeholder="Search memories" value="${escapeValue(
            appState.memoryFilters.search
          )}" />
        </div>
        <select id="memory-filter" class="form-select" style="max-width: 170px;">
          ${memoryTypes
            .map(
              (type) => `<option ${appState.memoryFilters.type === type ? "selected" : ""}>${type}</option>`
            )
            .join("")}
        </select>
      </div>
    </div>
    <div class="drawer-body">
      <div class="memory-list">
        ${
          memories.length
            ? memories
                .map(
                  (memory) => `
                    <article class="memory-item">
                      <div class="memory-item-body">
                        <div class="d-flex align-items-center gap-2 flex-wrap">
                          <span class="muted-label">${memory.id}</span>
                          <span class="status-label-disabled">${memory.type}</span>
                        </div>
                        <h3 class="h6 mt-2 mb-1">${memory.title}</h3>
                        <div class="memory-copy">${memory.content}</div>
                        <div class="text-secondary small mt-2">Saved ${memory.savedAt}</div>
                      </div>
                      <div class="memory-item-footer">
                        <button class="btn btn-sm btn-danger-secondary" type="button" data-delete-memory="${memory.id}">
                          Delete
                        </button>
                      </div>
                    </article>
                  `
                )
                .join("")
            : '<div class="empty-state">No memories match the current search and filter.</div>'
        }
      </div>
    </div>
  `;

  container.querySelector("#close-memory-drawer")?.addEventListener("click", closeMemoryDrawer);
  container.querySelector("#memory-search")?.addEventListener("input", (event) => {
    setMemorySearch(event.target.value);
  });
  container.querySelector("#memory-filter")?.addEventListener("change", (event) => {
    setMemoryType(event.target.value);
  });
  container.querySelectorAll("[data-delete-memory]").forEach((button) => {
    button.addEventListener("click", () => {
      deleteMemory(button.dataset.deleteMemory);
      if (!state.memories.length) {
        closeMemoryDrawer();
      }
    });
  });
}

function escapeValue(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
