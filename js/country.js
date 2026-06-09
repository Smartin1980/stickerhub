import { nextStatus, STATUS } from "./data.js";
import { store } from "./store.js?v=20260610-4";
import { exportStickerListPdf, shareStickerListWhatsApp } from "./sticker-export.js?v=20260610-3";
import { collectionStats, escapeHtml, initShell, toast } from "./ui.js?v=20260610-4";

const countryGrid = document.querySelector("#country-grid");
const stickerGrid = document.querySelector("#sticker-grid");
const searchInput = document.querySelector("#search");
const statusFilter = document.querySelector("#status-filter");
const code = new URLSearchParams(location.search).get("code")?.toUpperCase();
let collection = { countries: [], stickers: [] };
let profile = null;
let favoriteCountryIds = new Set();

function renderCountryCard(country) {
  const stickers = collection.stickers.filter((item) => item.country_id === country.id);
  const stats = collectionStats(stickers);
  return `
    <article class="card country-card country-card-favorite">
      <button class="favorite-button ${favoriteCountryIds.has(String(country.id)) ? "active" : ""}"
        type="button" data-favorite-country-id="${country.id}"
        aria-label="${favoriteCountryIds.has(String(country.id)) ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}"
        aria-pressed="${favoriteCountryIds.has(String(country.id))}">★</button>
      <a href="country.html?code=${encodeURIComponent(country.code)}">
        <span class="country-code">${escapeHtml(country.code)}</span>
        <h3>${escapeHtml(country.name)}</h3>
        <div class="country-counts">
          <span><strong>${stats.owned}</strong> vorhanden</span>
          <span><strong>${stats.missing}</strong> fehlen</span>
        </div>
        <div class="progress-meta"><span>Fertig</span><strong>${stats.completion}%</strong></div>
        <div class="progress-track"><div class="progress-bar" style="width:${stats.completion}%"></div></div>
      </a>
    </article>`;
}

function renderSticker(sticker) {
  const country = sticker.countries;
  return `
    <button class="sticker ${sticker.status}" data-id="${sticker.id}" type="button"
      aria-label="${escapeHtml(country.code)}-${sticker.sticker_number}: ${STATUS[sticker.status]}">
      <span class="country-code">${escapeHtml(country.code)}</span>
      <strong class="sticker-number">${sticker.sticker_number}</strong>
      <span class="status-label">${STATUS[sticker.status]}</span>
    </button>`;
}

function render() {
  const term = searchInput.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;
  if (!code) {
    const countries = collection.countries.filter((country) =>
      `${country.code} ${country.name}`.toLowerCase().includes(term) ||
      collection.stickers.some((sticker) =>
        sticker.country_id === country.id && String(sticker.sticker_number) === term
      )
    );
    countryGrid.innerHTML = countries.map(renderCountryCard).join("");
    stickerGrid.innerHTML = "";
    document.querySelector("#empty").hidden = countries.length > 0;
    return;
  }

  const country = collection.countries.find((item) => item.code === code);
  if (!country) {
    document.querySelector("#empty").hidden = false;
    document.querySelector("#empty").textContent = "Land wurde nicht gefunden.";
    return;
  }
  document.querySelector("#page-title").textContent = country.name;
  document.querySelector("#page-copy").textContent = `${country.code} · Status per Klick ändern`;
  document.querySelector("#back-link").hidden = false;
  document.querySelector("#legend").hidden = false;
  countryGrid.innerHTML = "";
  const stickers = collection.stickers.filter((sticker) => {
    const matchesCountry = sticker.country_id === country.id;
    const matchesStatus = !selectedStatus || sticker.status === selectedStatus;
    const haystack = `${country.name} ${country.code} ${sticker.sticker_number}`.toLowerCase();
    return matchesCountry && matchesStatus && haystack.includes(term);
  });
  stickerGrid.innerHTML = stickers.map(renderSticker).join("");
  document.querySelector("#empty").hidden = stickers.length > 0;
}

stickerGrid.addEventListener("click", async (event) => {
  const button = event.target.closest(".sticker");
  if (!button) return;
  const sticker = collection.stickers.find((item) => String(item.id) === button.dataset.id);
  if (!sticker) return;
  const previousStatus = sticker.status;
  sticker.status = nextStatus(sticker.status);
  render();
  try {
    await store.setStickerStatus(sticker.id, sticker.status);
    if (sticker.status === "duplicate") {
      await store.publishTrade(sticker.id);
      toast(`${sticker.countries.code}-${sticker.sticker_number} ist jetzt in der Tauschbörse.`);
    } else if (previousStatus === "duplicate") {
      await store.removeTrade(sticker.id);
    }
  } catch (error) {
    sticker.status = previousStatus;
    render();
    toast(error.message, "error");
  }
});

[searchInput, statusFilter].forEach((element) => element.addEventListener("input", render));

countryGrid.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-favorite-country-id]");
  if (!button) return;
  const countryId = button.dataset.favoriteCountryId;
  const favorite = !favoriteCountryIds.has(String(countryId));
  button.disabled = true;
  try {
    await store.setCountryFavorite(countryId, favorite);
    if (favorite) favoriteCountryIds.add(String(countryId));
    else favoriteCountryIds.delete(String(countryId));
    render();
    toast(favorite ? "Land zu Favoriten hinzugefügt." : "Land aus Favoriten entfernt.");
  } catch (error) {
    toast(error.message, "error");
    button.disabled = false;
  }
});

document.querySelector("#export-pdf").addEventListener("click", () => {
  exportStickerListPdf(collection.stickers, profile, "missing", toast);
});

document.querySelector("#share-whatsapp").addEventListener("click", () => {
  shareStickerListWhatsApp(collection.stickers, profile, "missing", toast);
});

document.querySelector("#export-duplicates-pdf").addEventListener("click", () => {
  exportStickerListPdf(collection.stickers, profile, "duplicate", toast);
});

document.querySelector("#share-duplicates-whatsapp").addEventListener("click", () => {
  shareStickerListWhatsApp(collection.stickers, profile, "duplicate", toast);
});

async function loadCountries() {
  try {
    profile = await initShell("country");
    if (!profile) return;
    const [loadedCollection, favorites] = await Promise.all([
      store.getCollection(),
      store.getCountryFavorites()
    ]);
    collection = loadedCollection;
    favoriteCountryIds = new Set(favorites.map(String));
    render();
  } catch (error) {
    toast(error.message, "error");
  }
}

loadCountries();
