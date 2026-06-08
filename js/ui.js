import { store } from "./store.js?v=20260608-6";

const pageNames = {
  dashboard: "Dashboard",
  country: "Länder",
  trades: "Tauschbörse",
  import: "Import",
  statistics: "Statistik",
  profile: "Profil",
  admin: "Admin"
};

function basePath() {
  return location.pathname.includes("/pages/") ? "../" : "";
}

function navItems() {
  const root = basePath();
  return [
    ["dashboard", `${root}dashboard.html`, "Übersicht", "⌂"],
    ["country", `${root}country.html`, "Länder", "▦"],
    ["trades", `${root}trades.html`, "Tauschen", "⇄"],
    ["import", `${root}import.html`, "Import", "+", "collection_import"],
    ["statistics", `${root}pages/statistics.html`, "Statistik", "▥"],
    ["profile", `${root}profile.html`, "Profil", "●"]
  ];
}

export function toast(message, type = "success") {
  let element = document.querySelector(".toast");
  if (!element) {
    element = document.createElement("div");
    element.className = "toast";
    document.body.append(element);
  }
  element.textContent = message;
  element.className = `toast ${type} show`;
  clearTimeout(window.stickerhubToast);
  window.stickerhubToast = setTimeout(() => element.classList.remove("show"), 3200);
}

export function initials(name = "SH") {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

export function setLoading(button, loading, label = "Wird geladen...") {
  if (!button) return;
  if (loading) {
    button.dataset.label = button.textContent;
    button.textContent = label;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.label || button.textContent;
    button.disabled = false;
  }
}

export async function initShell(activePage) {
  const session = await store.getSession();
  if (!session?.user) {
    location.href = `${basePath()}login.html`;
    return null;
  }
  const [profile, featureFlags] = await Promise.all([
    store.getProfile(),
    store.getFeatureFlags()
  ]);
  const root = basePath();
  const links = navItems().filter(([, , , , featureKey]) =>
    !featureKey || featureFlags[featureKey]
  );
  const sidebar = `
    <aside class="sidebar">
      <a class="brand" href="${root}dashboard.html">
        <span class="brand-mark">SH</span> StickerHub
      </a>
      <nav class="nav-list" aria-label="Hauptnavigation">
        ${links.map(([id, href, label]) =>
          `<a class="nav-link ${activePage === id ? "active" : ""}" href="${href}">${label}</a>`
        ).join("")}
        <a class="nav-link admin-link ${activePage === "admin" ? "active" : ""}"
          href="${root}pages/admin.html" ${profile.role !== "admin" ? "hidden" : ""}>Administration</a>
      </nav>
    </aside>`;
  const mobile = `
    <nav class="mobile-nav" aria-label="Mobile Navigation">
      ${links.map(([id, href, label, icon]) =>
        `<a class="${activePage === id ? "active" : ""}" href="${href}"><span>${icon}</span>${label}</a>`
      ).join("")}
    </nav>`;
  const topbar = `
    <header class="topbar">
      <a class="brand" href="${root}dashboard.html"><span class="brand-mark">SH</span> StickerHub</a>
      <div class="topbar-actions">
        ${store.demoMode ? '<span class="muted">Demo</span>' : ""}
        <a class="avatar" href="${root}profile.html" aria-label="Profil">${initials(profile.display_name)}</a>
      </div>
    </header>`;
  const shell = document.querySelector(".app-shell");
  shell.insertAdjacentHTML("afterbegin", sidebar);
  document.querySelector(".main").insertAdjacentHTML("afterbegin", topbar);
  shell.insertAdjacentHTML("beforeend", mobile);
  document.querySelectorAll("[data-feature]").forEach((element) => {
    element.hidden = !featureFlags[element.dataset.feature];
  });
  document.title = `${pageNames[activePage] || "StickerHub"} | StickerHub`;
  if (activePage === "import" && !featureFlags.collection_import) {
    toast("Dieses Feature ist für dein Konto noch nicht freigeschaltet.", "error");
    setTimeout(() => {
      location.href = `${root}dashboard.html`;
    }, 600);
    return null;
  }
  return profile;
}

export function collectionStats(stickers) {
  const total = stickers.length;
  const owned = stickers.filter((item) => item.status === "owned").length;
  const duplicate = stickers.filter((item) => item.status === "duplicate").length;
  const missing = total - owned - duplicate;
  const collected = owned + duplicate;
  const completion = total ? Math.round((collected / total) * 100) : 0;
  return { total, owned, missing, duplicate, completion };
}
