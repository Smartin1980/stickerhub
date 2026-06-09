import { store } from "./store.js?v=20260610-1";
import { escapeHtml, initShell, setLoading, toast } from "./ui.js?v=20260610-1";

const fileInput = document.querySelector("#csv-file");
const preview = document.querySelector("#preview");
const importForm = document.querySelector("#import-form");
const userSearch = document.querySelector("#user-search");
let catalogRows = [];
let users = [];
let catalog = { countries: [], stickers: [] };
let selectedCountryId = null;

function selectedCountry() {
  return catalog.countries.find((country) => String(country.id) === String(selectedCountryId));
}

function stickersForCountry(countryId) {
  return catalog.stickers
    .filter((sticker) => String(sticker.country_id) === String(countryId))
    .sort((a, b) => a.sticker_number - b.sticker_number);
}

function renderCatalogCountries() {
  const term = document.querySelector("#catalog-search").value.trim().toLowerCase();
  const countries = catalog.countries.filter((country) =>
    `${country.code} ${country.name}`.toLowerCase().includes(term)
  );
  document.querySelector("#catalog-countries").innerHTML = countries.map((country) => `
    <button class="catalog-country-item ${String(country.id) === String(selectedCountryId) ? "active" : ""}"
      type="button" data-country-id="${country.id}">
      <span><strong>${escapeHtml(country.code)}</strong> · ${escapeHtml(country.name)}</span>
      <span>${stickersForCountry(country.id).length} Sticker</span>
    </button>
  `).join("");
  document.querySelector("#catalog-countries-empty").hidden = countries.length > 0;
}

function renderCatalogEditor() {
  const country = selectedCountry();
  const editor = document.querySelector("#catalog-editor");
  document.querySelector("#catalog-editor-empty").hidden = Boolean(country);
  editor.hidden = !country;
  if (!country) return;

  document.querySelector("#country-id").value = country.id;
  document.querySelector("#country-code").value = country.code;
  document.querySelector("#country-name").value = country.name;
  document.querySelector("#delete-country").hidden = false;
  document.querySelector("#sticker-form").hidden = false;
  document.querySelector("#sticker-country-copy").textContent =
    `${country.name} (${country.code}) · ${stickersForCountry(country.id).length} Sticker`;

  const stickers = stickersForCountry(country.id);
  document.querySelector("#catalog-stickers").innerHTML = stickers.map((sticker) => `
    <div class="catalog-sticker-item" data-sticker-id="${sticker.id}">
      <input class="input sticker-number-input" type="number" min="1"
        value="${sticker.sticker_number}" aria-label="Stickernummer ${sticker.sticker_number}">
      <div class="catalog-sticker-actions">
        <button class="icon-btn save-sticker" type="button" title="Speichern">OK</button>
        <button class="icon-btn danger delete-sticker" type="button" title="Löschen">×</button>
      </div>
    </div>
  `).join("");
  document.querySelector("#catalog-stickers-empty").hidden = stickers.length > 0;
}

function renderCatalog() {
  renderCatalogCountries();
  renderCatalogEditor();
}

async function loadCatalog(preferredCountryId = selectedCountryId) {
  catalog = await store.getAdminCatalog();
  selectedCountryId = catalog.countries.some((country) =>
    String(country.id) === String(preferredCountryId)
  ) ? preferredCountryId : catalog.countries[0]?.id ?? null;
  renderCatalog();
}

document.querySelector("#catalog-search").addEventListener("input", renderCatalogCountries);

document.querySelector("#catalog-countries").addEventListener("click", (event) => {
  const button = event.target.closest("[data-country-id]");
  if (!button) return;
  selectedCountryId = button.dataset.countryId;
  renderCatalog();
});

document.querySelector("#new-country").addEventListener("click", () => {
  selectedCountryId = null;
  document.querySelector("#catalog-editor-empty").hidden = true;
  document.querySelector("#catalog-editor").hidden = false;
  document.querySelector("#country-form").reset();
  document.querySelector("#country-id").value = "";
  document.querySelector("#delete-country").hidden = true;
  document.querySelector("#sticker-country-copy").textContent =
    "Speichere zuerst das neue Land.";
  document.querySelector("#sticker-form").hidden = true;
  document.querySelector("#catalog-stickers").innerHTML = "";
  document.querySelector("#catalog-stickers-empty").hidden = true;
  renderCatalogCountries();
  document.querySelector("#country-code").focus();
});

document.querySelector("#country-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const countryId = document.querySelector("#country-id").value;
  const code = document.querySelector("#country-code").value.trim().toUpperCase();
  const name = document.querySelector("#country-name").value.trim();
  if (!/^[A-Z]{3,4}$/.test(code)) {
    toast("Das Kürzel muss aus drei oder vier Buchstaben bestehen.", "error");
    return;
  }
  const button = event.currentTarget.querySelector("[type=submit]");
  setLoading(button, true, "Speichert...");
  try {
    const country = countryId
      ? await store.updateCountry(countryId, code, name)
      : await store.createCountry(code, name);
    selectedCountryId = country.id;
    await loadCatalog(country.id);
    document.querySelector("#delete-country").hidden = false;
    document.querySelector("#sticker-form").hidden = false;
    toast(countryId ? "Land aktualisiert." : "Land erstellt.");
  } catch (error) {
    toast(error.message, "error");
  } finally {
    setLoading(button, false);
  }
});

document.querySelector("#delete-country").addEventListener("click", async () => {
  const country = selectedCountry();
  if (!country) return;
  const stickerCount = stickersForCountry(country.id).length;
  if (!confirm(
    `${country.name} und ${stickerCount} zugehörige Sticker wirklich löschen? ` +
    "Damit werden auch Benutzerstatus und Tauschangebote dieser Sticker entfernt."
  )) return;
  try {
    await store.deleteCountry(country.id);
    selectedCountryId = null;
    await loadCatalog();
    toast("Land und zugehörige Sticker gelöscht.");
  } catch (error) {
    toast(error.message, "error");
  }
});

document.querySelector("#sticker-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const country = selectedCountry();
  if (!country) return;
  const input = document.querySelector("#new-sticker-number");
  const stickerNumber = Number(input.value);
  const button = event.currentTarget.querySelector("button");
  setLoading(button, true, "...");
  try {
    await store.createSticker(country.id, stickerNumber);
    input.value = "";
    await loadCatalog(country.id);
    toast(`${country.code}-${stickerNumber} erstellt.`);
  } catch (error) {
    toast(error.message, "error");
  } finally {
    setLoading(button, false);
  }
});

document.querySelector("#catalog-stickers").addEventListener("click", async (event) => {
  const row = event.target.closest("[data-sticker-id]");
  if (!row) return;
  const stickerId = row.dataset.stickerId;
  const stickerNumber = Number(row.querySelector(".sticker-number-input").value);
  const country = selectedCountry();
  try {
    if (event.target.closest(".save-sticker")) {
      await store.updateSticker(stickerId, stickerNumber);
      await loadCatalog(country.id);
      toast("Stickernummer aktualisiert.");
    }
    if (event.target.closest(".delete-sticker")) {
      if (!confirm(`${country.code}-${stickerNumber} wirklich löschen?`)) return;
      await store.deleteSticker(stickerId);
      await loadCatalog(country.id);
      toast("Sticker gelöscht.");
    }
  } catch (error) {
    toast(error.message, "error");
  }
});

function formatDate(value) {
  return new Intl.DateTimeFormat("de-CH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));
}

function renderUsers() {
  const term = userSearch.value.trim().toLowerCase();
  const filtered = users.filter((user) =>
    `${user.display_name} ${user.email}`.toLowerCase().includes(term)
  );
  document.querySelector("#admin-users").innerHTML = filtered.map((user) => `
    <tr data-user-id="${user.id}">
      <td>
        <strong>${escapeHtml(user.display_name)}</strong><br>
        <span class="muted">${escapeHtml(user.email)}</span>
      </td>
      <td>
        <select class="select compact-select role-select" aria-label="Rolle von ${escapeHtml(user.display_name)}">
          <option value="user" ${user.role === "user" ? "selected" : ""}>Benutzer</option>
          <option value="admin" ${user.role === "admin" ? "selected" : ""}>Administrator</option>
        </select>
      </td>
      <td>
        <label class="switch">
          <input class="friends-family-toggle" type="checkbox"
            ${user.is_friends_family ? "checked" : ""}>
          <span class="switch-track"></span>
          <span>F&F</span>
        </label>
      </td>
      <td>${formatDate(user.created_at)}</td>
    </tr>
  `).join("");
  document.querySelector("#users-empty").hidden = filtered.length > 0;
}

async function saveUserRow(row) {
  const toggle = row.querySelector(".friends-family-toggle");
  const role = row.querySelector(".role-select");
  toggle.disabled = true;
  role.disabled = true;
  try {
    await store.setAdminUserAccess(row.dataset.userId, toggle.checked, role.value);
    const user = users.find((item) => item.id === row.dataset.userId);
    user.is_friends_family = toggle.checked;
    user.role = role.value;
    toast("Benutzerfreigabe gespeichert.");
  } catch (error) {
    toast(error.message, "error");
    await loadUsers();
  } finally {
    toggle.disabled = false;
    role.disabled = false;
  }
}

document.querySelector("#admin-users").addEventListener("change", (event) => {
  const row = event.target.closest("[data-user-id]");
  if (row) saveUserRow(row);
});

userSearch.addEventListener("input", renderUsers);

async function loadUsers() {
  users = await store.getAdminUsers();
  renderUsers();
}

function renderFeatureFlags(flags) {
  const container = document.querySelector("#feature-flags");
  container.innerHTML = flags.map((flag) => `
    <article class="card feature-flag-card" data-feature-key="${escapeHtml(flag.key)}">
      <div>
        <span class="feature-key">${escapeHtml(flag.key)}</span>
        <h2>${escapeHtml(flag.name)}</h2>
        <p class="muted">${escapeHtml(flag.description)}</p>
      </div>
      <div class="feature-rollout">
        <label class="switch">
          <input class="feature-ff-toggle" type="checkbox"
            ${flag.enabled_friends_family ? "checked" : ""}>
          <span class="switch-track"></span>
          <span>Friends & Family</span>
        </label>
        <label class="switch">
          <input class="feature-public-toggle" type="checkbox"
            ${flag.enabled_public ? "checked" : ""}>
          <span class="switch-track"></span>
          <span>Alle Benutzer</span>
        </label>
      </div>
    </article>
  `).join("");
  document.querySelector("#features-empty").hidden = flags.length > 0;
}

document.querySelector("#feature-flags").addEventListener("change", async (event) => {
  const card = event.target.closest("[data-feature-key]");
  if (!card) return;
  const controls = card.querySelectorAll("input");
  controls.forEach((control) => { control.disabled = true; });
  try {
    await store.updateAdminFeatureFlag(
      card.dataset.featureKey,
      card.querySelector(".feature-ff-toggle").checked,
      card.querySelector(".feature-public-toggle").checked
    );
    toast("Feature Toggle gespeichert.");
  } catch (error) {
    toast(error.message, "error");
    renderFeatureFlags(await store.getAdminFeatureFlags());
  } finally {
    controls.forEach((control) => { control.disabled = false; });
  }
});

document.querySelectorAll(".admin-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab").forEach((item) =>
      item.classList.toggle("active", item === tab)
    );
    ["users-panel", "features-panel", "catalog-panel"].forEach((id) => {
      document.querySelector(`#${id}`).hidden = id !== tab.dataset.panel;
    });
  });
});

function parseCatalogCsv(content) {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error("Die CSV-Datei enthält keine Daten.");
  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());
  const countryIndex = headers.indexOf("country_code");
  const numberIndex = headers.indexOf("sticker_number");
  if (countryIndex < 0 || numberIndex < 0) {
    throw new Error("Erwartete Spalten: country_code,sticker_number");
  }
  return lines.slice(1).map((line, index) => {
    const columns = line.split(",").map((column) => column.trim());
    const country_code = columns[countryIndex]?.toUpperCase();
    const sticker_number = Number(columns[numberIndex]);
    if (!/^[A-Z]{3,4}$/.test(country_code) ||
        !Number.isInteger(sticker_number) ||
        sticker_number < 1) {
      throw new Error(`Ungültige Daten in Zeile ${index + 2}.`);
    }
    return { country_code, sticker_number };
  });
}

fileInput.addEventListener("change", async () => {
  try {
    catalogRows = parseCatalogCsv(await fileInput.files[0].text());
    preview.innerHTML = catalogRows.slice(0, 100).map((row) =>
      `<tr><td>${escapeHtml(row.country_code)}</td><td>${row.sticker_number}</td></tr>`
    ).join("");
    document.querySelector("#preview-empty").hidden = true;
    toast(`${catalogRows.length} Datensätze bereit.`);
  } catch (error) {
    catalogRows = [];
    preview.innerHTML = "";
    document.querySelector("#preview-empty").hidden = false;
    toast(error.message, "error");
  }
});

importForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!catalogRows.length) {
    toast("Bitte zuerst eine gültige CSV-Datei auswählen.", "error");
    return;
  }
  const button = importForm.querySelector("button");
  setLoading(button, true, "Import läuft...");
  try {
    const imported = await store.importRows(catalogRows);
    await loadCatalog(selectedCountryId);
    toast(`${imported} Datensätze wurden verarbeitet.`);
    importForm.reset();
    catalogRows = [];
    preview.innerHTML = "";
    document.querySelector("#preview-empty").hidden = false;
  } catch (error) {
    toast(error.message, "error");
  } finally {
    setLoading(button, false);
  }
});

async function loadAdmin() {
  try {
    const profile = await initShell("admin");
    if (!profile) return;
    if (profile.role !== "admin") {
      toast("Diese Seite ist nur für Administratoren verfügbar.", "error");
      location.href = "../dashboard.html";
      return;
    }
    const [userRows, flags] = await Promise.all([
      store.getAdminUsers(),
      store.getAdminFeatureFlags(),
      loadCatalog()
    ]);
    users = userRows;
    renderUsers();
    renderFeatureFlags(flags);
  } catch (error) {
    toast(error.message, "error");
  }
}

loadAdmin();
