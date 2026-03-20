import { navigate } from "../router.js";

export function renderHomePage(appState) {
  return `
    <section class="page-shell">
      <header class="page-header">
        <div>
          <h1>Agentic Home</h1>
          <p class="page-subtitle">
            A lightweight control surface for tasks, tools, reports, and channels. Everything on this screen
            is powered by local mock data so backend integration can drop in later.
          </p>
        </div>
        <div class="page-badge">Frontend-only preview</div>
      </header>

      <section class="stats-grid">
        ${[
          ["Active ToDos", appState.stats.activeTodos],
          ["Enabled Tools", appState.stats.enabledTools],
          ["Messages Today", appState.stats.messagesToday],
          ["Active Channels", appState.stats.activeChannels],
        ]
          .map(
            ([label, value]) => `
              <article class="stat-card">
                <div class="muted-label">${label}</div>
                <div class="stat-value">${value}</div>
              </article>
            `
          )
          .join("")}
      </section>

      <section>
        <div class="d-flex align-items-center justify-content-between mb-3">
          <div>
            <div class="muted-label">Quick Actions</div>
            <h2 class="h4 mb-0 mt-2">Jump straight into the work</h2>
          </div>
        </div>
        <div class="action-grid">
          ${appState.actions
            .map(
              (item) => `
                <article class="action-card" data-route="${item.route}">
                  <div class="action-icon"><i class="${item.icon}"></i></div>
                  <h3 class="h5">${item.title}</h3>
                  <p class="tool-description mb-0">${item.description}</p>
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    </section>
  `;
}

export function bindHomePage(container) {
  container.querySelectorAll("[data-route]").forEach((card) => {
    card.addEventListener("click", () => navigate(card.dataset.route));
  });
}
