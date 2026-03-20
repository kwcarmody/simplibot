import { selectTodo, setTodoSearch, setTodoStatus } from "../state.js";

const orderedStatuses = ["All", "Done", "ToDo", "Working", "Blocked", "Archived"];

export function renderTodosPage(appState) {
  const query = appState.filters.todoSearch.trim().toLowerCase();
  const filteredTodos = appState.todos.filter((todo) => {
    const matchesSearch = [todo.id, todo.title, todo.owner, todo.details].some((value) =>
      value.toLowerCase().includes(query)
    );
    const matchesStatus =
      appState.filters.todoStatus === "All" || todo.status === appState.filters.todoStatus;
    return matchesSearch && matchesStatus;
  });

  const groupedTodos = filteredTodos.reduce((groups, todo) => {
    groups[todo.dueDate] = groups[todo.dueDate] || [];
    groups[todo.dueDate].push(todo);
    return groups;
  }, {});

  return `
    <section class="page-shell">
      <header class="page-header">
        <div>
          <h1>ToDos</h1>
          <p class="page-subtitle">
            Search, filter, inspect details inline, and open the right-side editor for updates.
          </p>
        </div>
        <div class="page-badge">${filteredTodos.length} matching</div>
      </header>

      <div class="toolbar">
        <div class="search-field">
          <span class="search-icon" aria-hidden="true"><i class="uil uil-search"></i></span>
          <input id="todo-search" class="form-control" placeholder="Search todos" value="${escapeValue(
            appState.filters.todoSearch
          )}" />
        </div>
        <select id="todo-status" class="form-select" style="max-width: 220px;">
          ${orderedStatuses
            .map(
              (status) => `<option ${appState.filters.todoStatus === status ? "selected" : ""}>${status}</option>`
            )
            .join("")}
        </select>
      </div>

      ${
        Object.keys(groupedTodos).length
          ? Object.entries(groupedTodos)
              .map(
                ([dueDate, items]) => `
                  <section class="todo-group">
                    <div class="todo-group-header">
                      <div>
                        <div class="muted-label">Due Date</div>
                        <h2 class="h4 mb-0 mt-2">${dueDate}</h2>
                      </div>
                      <div class="page-badge">${items.length} items</div>
                    </div>
                    ${items
                      .map(
                        (todo) => `
                          <details class="todo-item" data-todo-id="${todo.id}">
                            <summary>
                              <div class="d-flex justify-content-between gap-3 flex-wrap">
                                <div>
                                  <div class="d-flex align-items-center gap-2 flex-wrap">
                                    <span class="muted-label">${todo.id}</span>
                                    <span class="status-pill ${statusClass(todo.status)}">${todo.status}</span>
                                  </div>
                                  <h3 class="h5 mt-2 mb-1">${todo.title}</h3>
                                  <div class="todo-meta">
                                    <span class="tool-description">Owner: ${todo.owner}</span>
                                    <span class="tool-description">Due: ${todo.dueDate}</span>
                                  </div>
                                </div>
                                <button class="btn btn-sm btn-secondary-global align-self-start open-todo" type="button" data-open-id="${todo.id}">
                                  Edit
                                </button>
                              </div>
                            </summary>
                            <div class="todo-copy mt-3">${todo.details}</div>
                          </details>
                        `
                      )
                      .join("")}
                  </section>
                `
              )
              .join("")
          : '<div class="empty-state">No todos match the current search and filter.</div>'
      }
    </section>
  `;
}

export function bindTodosPage(container) {
  container.querySelector("#todo-search")?.addEventListener("input", (event) => {
    setTodoSearch(event.target.value);
  });

  container.querySelector("#todo-status")?.addEventListener("change", (event) => {
    setTodoStatus(event.target.value);
  });

  container.querySelectorAll("[data-open-id]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      selectTodo(button.dataset.openId);
    });
  });

  container.querySelectorAll("[data-todo-id]").forEach((item) => {
    item.addEventListener("click", () => selectTodo(item.dataset.todoId));
  });
}

function statusClass(status) {
  return `status-${status.toLowerCase()}`;
}

function escapeValue(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}
