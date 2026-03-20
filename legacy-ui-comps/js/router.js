import { setRoute, state } from "./state.js";

const routes = new Set(["home", "chat", "tools", "todos", "reports", "channels", "settings", "profile", "signin"]);

export function getRouteFromHash() {
  const route = window.location.hash.replace(/^#\//, "") || "home";
  return routes.has(route) ? route : "home";
}

export function navigate(route) {
  const nextRoute = routes.has(route) ? route : "home";
  if (getRouteFromHash() !== nextRoute) {
    window.location.hash = `/${nextRoute}`;
  } else if (state.currentRoute !== nextRoute) {
    setRoute(nextRoute);
  }
}

export function initRouter(onChange) {
  const syncRoute = () => {
    setRoute(getRouteFromHash());
    onChange();
  };

  window.addEventListener("hashchange", syncRoute);

  if (!window.location.hash) {
    window.location.hash = "/home";
  } else {
    syncRoute();
  }
}
