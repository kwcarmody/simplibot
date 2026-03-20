import { navigate } from "../router.js";
import { closeMobileMenu, toggleSidebar } from "../state.js";

const navItems = [
  { id: "home", label: "Home", icon: "uil uil-estate" },
  { id: "chat", label: "Chat", icon: "uil uil-comment-message" },
  { id: "tools", label: "Tools", icon: "uil uil-wrench" },
  { id: "todos", label: "ToDos", icon: "uil uil-check-circle" },
  { id: "reports", label: "Reports", icon: "uil uil-chart-line" },
  { id: "channels", label: "Channels", icon: "uil uil-comments" },
  { id: "settings", label: "Settings", icon: "uil uil-setting" },
];

const brandMark = `<svg viewBox="0 0 40 48" fill="none" aria-hidden="true"><path d="M1.278 27.136c-.019-2.147 2.3-4.5 2.284-7.093s-.028-5.33-.028-8.217a18.024 18.024 0 0 1 .5-4.164 9.359 9.359 0 0 1 1.915-3.831 9.936 9.936 0 0 1 3.942-2.776C11.575.356 22.18 0 24.882 0a23.09 23.09 0 0 1 5.386.611 11.729 11.729 0 0 1 4.5 2.11 10.594 10.594 0 0 1 3.109 4 14.682 14.682 0 0 1 1.166 6.218 14.357 14.357 0 0 1-1.277 6.44c-.851 1.7-1.717 3.406-3.4 4.364s-2.023 1.534-5.758 1.8-12.909.611-15.463.611H11.252q-.944 0-2.11-.111s-7.842 3.247-7.864 1.1ZM33.488 12.825a7.189 7.189 0 0 0-2.082-5.608q-2.082-1.888-6.912-1.888c-1.221 0-10.679.1-11.549.305A4.745 4.745 0 0 0 10.807 6.69a4.558 4.558 0 0 0-1.249 2.027 10.548 10.548 0 0 0-.416 3.22c0 .22-.1 3.551 0 4.292.932 3.3 1.9 3.774 6.5 4.017 3.53.116 5.719 0 6.644 0 8.34.009 9.747-1.484 10.376-2.539a10.876 10.876 0 0 0 .832-4.882Z" fill="#6984ed" stroke="#6984ed" stroke-width="1"/><path d="M11.784 0c6.51 0 11.655.183 11.788 2.806S18.294 5.611 11.784 5.611.208 5.748 0 2.805 5.273 0 11.784 0Z" transform="translate(10.359 36.596)" fill="#6984ed"/></svg>`;

export function renderSidebar(container, appState) {
  container.classList.toggle("minimized", appState.sidebarMinimized);
  container.innerHTML = `
    <div class="d-flex align-items-center gap-3 mb-4">
      <div class="d-flex align-items-center gap-3 min-w-0">
        <div class="brand-mark">${brandMark}</div>
        <div class="brand-copy">
          <div class="fw-semibold">Pikori</div>
          <div class="text-secondary small">Agentic Control Surface</div>
        </div>
      </div>
    </div>
    <nav class="d-flex flex-column">
      ${navItems
        .map(
          (item) => `
            <button class="sidebar-button ${appState.currentRoute === item.id ? "active" : ""}" data-route="${item.id}">
              <span class="icon"><i class="${item.icon}"></i></span>
              <span class="nav-label">${item.label}</span>
            </button>
          `
        )
        .join("")}
    </nav>
    <div class="sidebar-footer pt-4">
      <div class="surface-card sidebar-user" data-route="profile">
        <div class="sidebar-avatar">KC</div>
        <div class="footer-copy">
          <div class="fw-semibold">${appState.profile.fullName}</div>
          <div class="text-secondary small">${appState.profile.role}</div>
        </div>
      </div>
      <div class="sidebar-footer-actions">
        <button class="sidebar-button" type="button" data-route="signin">
          <span class="icon"><i class="uil uil-signout"></i></span>
          <span class="nav-label">Sign out</span>
        </button>
      </div>
      <div class="surface-card">
        <div class="muted-label">System</div>
        <div class="fw-semibold mt-2 footer-copy">All quiet</div>
        <div class="small text-secondary mt-2 footer-copy">Static frontend mode with mock data and placeholder actions.</div>
      </div>
      <button id="drawer-toggle" class="sidebar-button collapse-control" type="button" aria-label="${
        appState.sidebarMinimized ? "Expand menu" : "Collapse menu"
      }">
        <span class="icon"><i class="uil ${appState.sidebarMinimized ? "uil-angle-right" : "uil-angle-left"}"></i></span>
      </button>
    </div>
  `;

  container.querySelector("#drawer-toggle")?.addEventListener("click", toggleSidebar);
  container.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      navigate(button.dataset.route);
      closeMobileMenu();
    });
  });
}
