import { APP_VERSION, APP_VERSION_DATE, VERSION_HISTORY } from "./app-version.js?v=20260619-2";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function renderHistory() {
  const versionBadge = document.querySelector("#current-version");
  const versionDate = document.querySelector("#current-version-date");
  const sidebarVersion = document.querySelector("#sidebar-version");
  const history = document.querySelector("#version-history");

  if (versionBadge) versionBadge.textContent = `Version ${APP_VERSION}`;
  if (versionDate) versionDate.textContent = APP_VERSION_DATE;
  if (sidebarVersion) sidebarVersion.textContent = `Version ${APP_VERSION}`;
  if (!history) return;

  history.innerHTML = VERSION_HISTORY.map((entry) => `
    <article class="card release-card">
      <div class="release-card-header">
        <span class="version-pill">v${escapeHtml(entry.version)}</span>
        <time datetime="${escapeHtml(entry.date)}">${escapeHtml(entry.date)}</time>
      </div>
      <h2>${escapeHtml(entry.title)}</h2>
      <ul class="release-list">
        ${entry.changes.map((change) => `<li>${escapeHtml(change)}</li>`).join("")}
      </ul>
    </article>
  `).join("");
}

renderHistory();
