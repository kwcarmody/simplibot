import { openReportDrawer, runReport, setReportSearch } from "../state.js";

export function renderReportsPage(appState) {
  const query = appState.filters.reportSearch.trim().toLowerCase();
  const visibleReports = appState.reports.filter((report) =>
    [report.title, report.description].some((value) => value.toLowerCase().includes(query))
  );

  return `
    <section class="page-shell">
      <header class="page-header">
        <div>
          <h1>Reports</h1>
          <p class="page-subtitle">
            Search static report definitions and run placeholder actions that can be wired to the backend later.
          </p>
        </div>
        <div class="page-badge">${visibleReports.length} reports</div>
      </header>

      <div class="toolbar">
        <div class="search-field">
          <span class="search-icon" aria-hidden="true"><i class="uil uil-search"></i></span>
          <input id="report-search" class="form-control" placeholder="Search reports" value="${escapeValue(
            appState.filters.reportSearch
          )}" />
        </div>
      </div>

      <div class="report-grid">
        ${visibleReports
          .map(
            (report) => `
              <article class="report-card">
                <div class="muted-label">Report</div>
                <h2 class="h5 mt-2">${report.title}</h2>
                <p class="report-description">${report.description}</p>
                <div class="card-footer-row">
                  <button class="btn btn-sm btn-secondary-global" data-report-id="${report.id}">Run</button>
                  <button class="tool-config-button" type="button" data-configure-report="${report.id}">
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

export function bindReportsPage(container) {
  container.querySelector("#report-search")?.addEventListener("input", (event) => {
    setReportSearch(event.target.value);
  });

  container.querySelectorAll("[data-report-id]").forEach((button) => {
    button.addEventListener("click", () => runReport(button.dataset.reportId));
  });

  container.querySelectorAll("[data-configure-report]").forEach((button) => {
    button.addEventListener("click", () => openReportDrawer(button.dataset.configureReport));
  });
}

function escapeValue(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}
