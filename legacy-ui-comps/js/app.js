import { renderChannelDrawer } from "./components/channelDrawer.js";
import { renderReportDrawer } from "./components/reportDrawer.js";
import { renderToolDrawer } from "./components/toolDrawer.js";
import { renderMemoryDrawer } from "./components/memoryDrawer.js";
import { renderSidebar } from "./components/sidebar.js";
import { renderTodoFlyout } from "./components/todoFlyout.js";
import { initRouter } from "./router.js";
import { closeMobileMenu, state, subscribe, toggleMobileMenu } from "./state.js";
import { bindChannelsPage, renderChannelsPage } from "./pages/channels.js";
import { bindChatPage, renderChatPage } from "./pages/chat.js";
import { bindHomePage, renderHomePage } from "./pages/home.js";
import { bindProfilePage, renderProfilePage } from "./pages/profile.js";
import { bindReportsPage, renderReportsPage } from "./pages/reports.js";
import { bindSettingsPage, renderSettingsPage } from "./pages/settings.js";
import { bindSigninPage, renderSigninPage } from "./pages/signin.js";
import { bindTodosPage, renderTodosPage } from "./pages/todos.js";
import { bindToolsPage, renderToolsPage } from "./pages/tools.js";

const view = document.querySelector("#view");
const sidebar = document.querySelector("#sidebar");
const todoFlyout = document.querySelector("#todo-flyout");
const appShell = document.querySelector("#app");
const mobileMenuToggle = document.querySelector("#mobile-menu-toggle");
const mobileMenuOverlay = document.querySelector("#mobile-menu-overlay");

const pages = {
  home: {
    render: renderHomePage,
    bind: bindHomePage,
  },
  chat: {
    render: renderChatPage,
    bind: bindChatPage,
  },
  tools: {
    render: renderToolsPage,
    bind: bindToolsPage,
  },
  todos: {
    render: renderTodosPage,
    bind: bindTodosPage,
  },
  reports: {
    render: renderReportsPage,
    bind: bindReportsPage,
  },
  profile: {
    render: renderProfilePage,
    bind: bindProfilePage,
  },
  signin: {
    render: renderSigninPage,
    bind: bindSigninPage,
  },
  channels: {
    render: renderChannelsPage,
    bind: bindChannelsPage,
  },
  settings: {
    render: renderSettingsPage,
    bind: bindSettingsPage,
  },
};

function renderApp() {
  const page = pages[state.currentRoute] || pages.home;
  appShell.classList.toggle("mobile-menu-open", state.mobileMenuOpen);
  appShell.classList.toggle("auth-mode", state.currentRoute === "signin");
  if (state.currentRoute !== "signin") {
    renderSidebar(sidebar, state);
  } else {
    sidebar.innerHTML = "";
    todoFlyout.innerHTML = "";
    todoFlyout.classList.remove("open");
  }
  view.innerHTML = page.render(state);
  page.bind?.(view);
  if (state.currentRoute !== "signin") {
    if (state.channelDrawerId) {
      renderChannelDrawer(todoFlyout, state);
    } else if (state.reportDrawerId) {
      renderReportDrawer(todoFlyout, state);
    } else if (state.toolDrawerId) {
      renderToolDrawer(todoFlyout, state);
    } else if (state.memoryDrawerOpen) {
      renderMemoryDrawer(todoFlyout, state);
    } else {
      renderTodoFlyout(todoFlyout, state);
    }
  }
}

subscribe(renderApp);
initRouter(renderApp);
mobileMenuToggle?.addEventListener("click", toggleMobileMenu);
mobileMenuOverlay?.addEventListener("click", closeMobileMenu);
renderApp();
