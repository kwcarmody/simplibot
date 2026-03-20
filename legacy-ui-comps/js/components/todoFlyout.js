import { closeTodoFlyout, saveTodo, state, updateTodoField } from "../state.js";

export function renderTodoFlyout(container, appState) {
  const todo = appState.todos.find((item) => item.id === appState.todoFlyoutId);

  if (!todo) {
    container.classList.remove("open");
    container.innerHTML = "";
    return;
  }

  container.classList.add("open");
  container.innerHTML = `
    <div class="drawer-header">
      <div class="d-flex align-items-start justify-content-between gap-3">
        <div>
          <div class="muted-label">Todo Editor</div>
          <h2 class="h4 mt-2 mb-1">${todo.title}</h2>
          <div class="text-secondary small">${todo.id}</div>
        </div>
        <button id="close-flyout" class="btn btn-sm btn-secondary-global">Close</button>
      </div>
    </div>
    <div class="drawer-body">
      <div class="settings-stack mb-3">
        <div class="w-100">
          <label class="form-label">Title</label>
          <input class="form-control" data-field="title" value="${escapeValue(todo.title)}" />
        </div>
      </div>

      <div class="settings-stack mb-3">
        <div class="w-100">
          <label class="form-label">Status</label>
          <select class="form-select" data-field="status">
            ${["ToDo", "Working", "Done", "Blocked", "Archived"]
              .map((status) => `<option ${todo.status === status ? "selected" : ""}>${status}</option>`)
              .join("")}
          </select>
        </div>
      </div>

      <div class="settings-stack mb-3">
        <div class="w-100">
          <label class="form-label">Owner</label>
          <input class="form-control" data-field="owner" value="${escapeValue(todo.owner)}" />
        </div>
      </div>

      <div class="settings-stack mb-3">
        <div class="w-100">
          <label class="form-label">Due Date</label>
          <input class="form-control" data-field="dueDate" value="${escapeValue(todo.dueDate)}" />
        </div>
      </div>

      <div class="settings-stack mb-3">
        <div class="w-100">
          <label class="form-label">Priority</label>
          <input class="form-control" data-field="priority" value="${escapeValue(todo.priority)}" />
        </div>
      </div>

      <div class="settings-stack mb-4">
        <div class="w-100">
          <label class="form-label">Details</label>
          <textarea class="form-control" rows="6" data-field="details">${escapeValue(todo.details)}</textarea>
        </div>
      </div>

      <button id="save-todo" class="btn btn-light w-100">Save</button>
    </div>
  `;

  container.querySelector("#close-flyout")?.addEventListener("click", closeTodoFlyout);
  container.querySelectorAll("[data-field]").forEach((field) => {
    const eventName = field.tagName === "SELECT" ? "change" : "input";
    field.addEventListener(eventName, (event) => {
      updateTodoField(todo.id, field.dataset.field, event.target.value);
    });
  });
  container.querySelector("#save-todo")?.addEventListener("click", () => {
    const currentTodo = state.todos.find((item) => item.id === todo.id);
    saveTodo(currentTodo);
  });
}

function escapeValue(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
