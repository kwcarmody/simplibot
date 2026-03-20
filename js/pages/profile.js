import { updateProfileField } from "../state.js";

export function renderProfilePage(appState) {
  const { profile } = appState;

  return `
    <section class="page-shell">
      <header class="page-header">
        <div>
          <h1>Profile</h1>
          <p class="page-subtitle">
            Manage the common user details that personalize the workspace and connected experiences.
          </p>
        </div>
        <div class="page-badge">User settings</div>
      </header>

      <div class="settings-grid">
        <section class="settings-section">
          <div class="muted-label">Account</div>
          <div class="settings-stack mt-3 mb-3">
            <div class="w-100">
              <label class="form-label">Full Name</label>
              <input class="form-control" data-profile-field="fullName" value="${escapeValue(profile.fullName)}" />
            </div>
          </div>
          <div class="settings-stack mb-3">
            <div class="w-100">
              <label class="form-label">Role</label>
              <input class="form-control" data-profile-field="role" value="${escapeValue(profile.role)}" />
            </div>
          </div>
          <div class="settings-stack mb-3">
            <div class="w-100">
              <label class="form-label">Email</label>
              <input class="form-control" data-profile-field="email" value="${escapeValue(profile.email)}" />
            </div>
          </div>
          <div class="settings-stack">
            <div class="w-100">
              <label class="form-label">Phone</label>
              <input class="form-control" data-profile-field="phone" value="${escapeValue(profile.phone)}" />
            </div>
          </div>
        </section>

        <section class="settings-section">
          <div class="muted-label">Workspace</div>
          <div class="settings-stack mt-3 mb-3">
            <div class="w-100">
              <label class="form-label">Company</label>
              <input class="form-control" data-profile-field="company" value="${escapeValue(profile.company)}" />
            </div>
          </div>
          <div class="settings-stack mb-3">
            <div class="w-100">
              <label class="form-label">Location</label>
              <input class="form-control" data-profile-field="location" value="${escapeValue(profile.location)}" />
            </div>
          </div>
          <div class="settings-stack mb-3">
            <div class="w-100">
              <label class="form-label">Timezone</label>
              <input class="form-control" data-profile-field="timezone" value="${escapeValue(profile.timezone)}" />
            </div>
          </div>
          <div class="settings-stack">
            <div class="w-100">
              <label class="form-label">Bio</label>
              <textarea class="form-control" rows="5" data-profile-field="bio">${escapeValue(profile.bio)}</textarea>
            </div>
          </div>
        </section>

        <section class="settings-section">
          <div class="muted-label">Subscription & Usage</div>
          <div class="usage-stack mt-3">
            <div class="usage-row">
              <span class="tool-description">Current Subscription</span>
              <span class="fw-semibold">Pro Team</span>
            </div>
            <div class="usage-row">
              <span class="tool-description">Monthly Messages</span>
              <span>18,420 / 25,000</span>
            </div>
            <div class="usage-row">
              <span class="tool-description">Memory Storage</span>
              <span>1.2 GB / 5 GB</span>
            </div>
            <div class="usage-row">
              <span class="tool-description">Custom Tools</span>
              <span>6 active</span>
            </div>
          </div>
          <div class="profile-action-row">
            <button class="btn btn-light" type="button">Upgrade</button>
            <button class="btn btn-secondary-global" type="button">Request Custom Tools</button>
          </div>
        </section>
      </div>
    </section>
  `;
}

export function bindProfilePage(container) {
  container.querySelectorAll("[data-profile-field]").forEach((field) => {
    const eventName = field.tagName === "TEXTAREA" ? "input" : "input";
    field.addEventListener(eventName, (event) => {
      updateProfileField(field.dataset.profileField, event.target.value);
    });
  });
}

function escapeValue(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
