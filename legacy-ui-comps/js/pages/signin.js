import { navigate } from "../router.js";

const brandMark = `<svg viewBox="0 0 40 48" fill="none" aria-hidden="true"><path d="M1.278 27.136c-.019-2.147 2.3-4.5 2.284-7.093s-.028-5.33-.028-8.217a18.024 18.024 0 0 1 .5-4.164 9.359 9.359 0 0 1 1.915-3.831 9.936 9.936 0 0 1 3.942-2.776C11.575.356 22.18 0 24.882 0a23.09 23.09 0 0 1 5.386.611 11.729 11.729 0 0 1 4.5 2.11 10.594 10.594 0 0 1 3.109 4 14.682 14.682 0 0 1 1.166 6.218 14.357 14.357 0 0 1-1.277 6.44c-.851 1.7-1.717 3.406-3.4 4.364s-2.023 1.534-5.758 1.8-12.909.611-15.463.611H11.252q-.944 0-2.11-.111s-7.842 3.247-7.864 1.1ZM33.488 12.825a7.189 7.189 0 0 0-2.082-5.608q-2.082-1.888-6.912-1.888c-1.221 0-10.679.1-11.549.305A4.745 4.745 0 0 0 10.807 6.69a4.558 4.558 0 0 0-1.249 2.027 10.548 10.548 0 0 0-.416 3.22c0 .22-.1 3.551 0 4.292.932 3.3 1.9 3.774 6.5 4.017 3.53.116 5.719 0 6.644 0 8.34.009 9.747-1.484 10.376-2.539a10.876 10.876 0 0 0 .832-4.882Z" fill="#6984ed" stroke="#6984ed" stroke-width="1"/><path d="M11.784 0c6.51 0 11.655.183 11.788 2.806S18.294 5.611 11.784 5.611.208 5.748 0 2.805 5.273 0 11.784 0Z" transform="translate(10.359 36.596)" fill="#6984ed"/></svg>`;

export function renderSigninPage() {
  return `
    <section class="auth-shell">
      <div class="surface-card auth-card">
        <div class="auth-brand">
          <div class="auth-brand-mark">${brandMark}</div>
        </div>
        <h1>Sign In</h1>
        <p class="page-subtitle">
          Continue into Pikori with your preferred identity provider. This is a static frontend flow for now.
        </p>
        <form class="auth-form" id="signin-form">
          <div>
            <label class="form-label" for="signin-username">Username</label>
            <input id="signin-username" class="form-control" type="text" placeholder="Enter your username" />
          </div>
          <div>
            <label class="form-label" for="signin-password">Password</label>
            <input id="signin-password" class="form-control" type="password" placeholder="Enter your password" />
          </div>
          <div class="d-flex justify-content-between align-items-center gap-3 flex-wrap">
            <a href="#/signin" class="auth-link" id="forgot-password-link">Forgot my password</a>
            <button class="btn btn-secondary-global" id="signin-button" type="submit">Sign In</button>
          </div>
        </form>
        <div class="auth-actions">
          <button class="btn btn-light auth-provider-button" type="button" data-signin-provider="google">
            <i class="uil uil-google"></i>
            <span>Continue with Google</span>
          </button>
          <button class="btn btn-secondary-global auth-provider-button" type="button" data-signin-provider="apple">
            <i class="uil uil-apple"></i>
            <span>Continue with Apple</span>
          </button>
        </div>
      </div>
    </section>
  `;
}

export function bindSigninPage(container) {
  container.querySelector("#signin-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    navigate("home");
  });

  container.querySelectorAll("[data-signin-provider]").forEach((button) => {
    button.addEventListener("click", () => navigate("home"));
  });

  container.querySelector("#forgot-password-link")?.addEventListener("click", (event) => {
    event.preventDefault();
  });
}
