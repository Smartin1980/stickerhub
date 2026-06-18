import { APP_VERSION } from "./app-version.js?v=20260619-1";

function publicLinks(root = "") {
  return `
    <a href="${root}version.html">Version ${APP_VERSION}</a>
    <a href="${root}impressum.html">Impressum</a>
    <a href="${root}datenschutz.html">Datenschutz</a>
  `;
}

export function initPublicMeta() {
  const target = document.querySelector("[data-public-meta]") ||
    document.querySelector(".auth-card") ||
    document.querySelector(".legal-content");
  if (!target || target.querySelector(".public-meta")) return;
  target.insertAdjacentHTML("beforeend", `<nav class="public-meta" aria-label="Service">${publicLinks()}</nav>`);
}

initPublicMeta();
