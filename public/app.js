document.addEventListener("DOMContentLoaded", () => {
  const app = document.querySelector("#app");
  const toggle = document.querySelector("#mobile-menu-toggle");
  const overlay = document.querySelector("#mobile-menu-overlay");

  if (!app || !toggle || !overlay) {
    return;
  }

  const syncMenuState = () => {
    const isOpen = app.classList.contains("mobile-menu-open");
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  };

  const closeMenu = () => {
    app.classList.remove("mobile-menu-open");
    syncMenuState();
  };

  const openMenu = () => {
    app.classList.add("mobile-menu-open");
    syncMenuState();
  };

  toggle.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (app.classList.contains("mobile-menu-open")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  overlay.addEventListener("click", closeMenu);

  document.querySelectorAll("#sidebar a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  syncMenuState();
});
