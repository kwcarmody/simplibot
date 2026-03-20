import { closeReportDrawer, runReport, updateReportConfigField } from "../state.js";

const outputOptions = ["Summary", "Detailed", "Executive"];
const frequencyOptions = ["On demand", "Hourly", "Daily", "Weekly"];

export function renderReportDrawer(container, appState) {
  const report = appState.reports.find((item) => item.id === appState.reportDrawerId);

  if (!report) {
    container.classList.remove("open");
    container.innerHTML = "";
    return;
  }

  container.classList.add("open");
  container.innerHTML = `
    <div class="drawer-header">
      <div class="d-flex align-items-start justify-content-between gap-3">
        <div>
          <div class="muted-label">Report Settings</div>
          <h2 class="h4 mt-2 mb-1">Configure ${report.title}</h2>
          <div class="text-secondary small">${report.id}</div>
        </div>
        <button id="close-report-drawer" class="btn btn-sm btn-secondary-global">Close</button>
      </div>
    </div>
    <div class="drawer-body">
      <div class="settings-stack mb-3">
        <div class="w-100">
          <label class="form-label">Audience</label>
          <input class="form-control" data-report-config-field="audience" value="${escapeValue(report.config.audience)}" />
        </div>
      </div>

      <div class="settings-stack mb-3">
        <div class="w-100">
          <label class="form-label">Output Format</label>
          <select class="form-select" data-report-config-field="output">
            ${outputOptions
              .map((option) => `<option ${report.config.output === option ? "selected" : ""}>${option}</option>`)
              .join("")}
          </select>
        </div>
      </div>

      <div class="settings-stack mb-3">
        <div class="w-100">
          <label class="form-label">Frequency</label>
          <select class="form-select" data-report-config-field="frequency">
            ${frequencyOptions
              .map((option) => `<option ${report.config.frequency === option ? "selected" : ""}>${option}</option>`)
              .join("")}
          </select>
        </div>
      </div>

      <div class="settings-stack mb-4">
        <div class="w-100">
          <label class="form-label">Notes</label>
          <textarea class="form-control" rows="6" data-report-config-field="notes">${escapeValue(report.config.notes)}</textarea>
        </div>
      </div>

      <button id="run-configured-report" class="btn w-100" type="button">Run Report</button>
    </div>
  `;

  container.querySelector("#close-report-drawer")?.addEventListener("click", closeReportDrawer);
  container.querySelectorAll("[data-report-config-field]").forEach((field) => {
    const eventName = field.tagName === "SELECT" ? "change" : "input";
    field.addEventListener(eventName, (event) => {
      updateReportConfigField(report.id, field.dataset.reportConfigField, event.target.value);
    });
  });
  container.querySelector("#run-configured-report")?.addEventListener("click", () => {
    runReport(report.id);
  });
}

function escapeValue(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
