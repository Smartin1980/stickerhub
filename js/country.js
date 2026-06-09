import { nextStatus, STATUS } from "./data.js";
import { store } from "./store.js?v=20260610-1";
import { collectionStats, escapeHtml, initShell, toast } from "./ui.js?v=20260610-1";

const countryGrid = document.querySelector("#country-grid");
const stickerGrid = document.querySelector("#sticker-grid");
const searchInput = document.querySelector("#search");
const statusFilter = document.querySelector("#status-filter");
const code = new URLSearchParams(location.search).get("code")?.toUpperCase();
let collection = { countries: [], stickers: [] };
let profile = null;

function renderCountryCard(country) {
  const stickers = collection.stickers.filter((item) => item.country_id === country.id);
  const stats = collectionStats(stickers);
  return `
    <a class="card country-card" href="country.html?code=${encodeURIComponent(country.code)}">
      <span class="country-code">${escapeHtml(country.code)}</span>
      <h3>${escapeHtml(country.name)}</h3>
      <div class="country-counts">
        <span><strong>${stats.owned}</strong> vorhanden</span>
        <span><strong>${stats.missing}</strong> fehlen</span>
      </div>
      <div class="progress-meta"><span>Fertig</span><strong>${stats.completion}%</strong></div>
      <div class="progress-track"><div class="progress-bar" style="width:${stats.completion}%"></div></div>
    </a>`;
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

function missingStickers() {
  return collection.stickers
    .filter((sticker) => sticker.status === "missing")
    .sort((a, b) =>
      a.countries.name.localeCompare(b.countries.name, "de") ||
      a.sticker_number - b.sticker_number
    );
}

function groupedMissingStickers() {
  return missingStickers().reduce((groups, sticker) => {
    const key = sticker.countries.code;
    if (!groups[key]) {
      groups[key] = { country: sticker.countries, numbers: [] };
    }
    groups[key].numbers.push(sticker.sticker_number);
    return groups;
  }, {});
}

function missingListText() {
  const groups = Object.values(groupedMissingStickers());
  const lines = groups.map(({ country, numbers }) =>
    `${country.name} (${country.code}): ${numbers.join(", ")}`
  );
  return [
    `StickerHub Fehlliste von ${profile?.display_name || "Sammler"}`,
    `${missingStickers().length} fehlende Sticker`,
    "",
    ...lines,
    "",
    "Erstellt mit StickerHub"
  ].join("\n");
}

document.querySelector("#export-pdf").addEventListener("click", () => {
  const missing = missingStickers();
  if (!missing.length) {
    toast("Glückwunsch, deine Fehlliste ist leer.");
    return;
  }
  if (!window.jspdf?.jsPDF) {
    toast("Der PDF-Export konnte nicht geladen werden.", "error");
    return;
  }
  const doc = new window.jspdf.jsPDF();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("StickerHub Fehlliste", 16, y);
  y += 9;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`${profile?.display_name || "Sammler"} · ${missing.length} fehlende Sticker`, 16, y);
  y += 12;

  Object.values(groupedMissingStickers()).forEach(({ country, numbers }) => {
    const numberLines = doc.splitTextToSize(numbers.join(", "), 150);
    const blockHeight = 7 + numberLines.length * 6;
    if (y + blockHeight > pageHeight - 16) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${country.name} (${country.code})`, 16, y);
    doc.setFont("helvetica", "normal");
    doc.text(numberLines, 50, y);
    y += blockHeight;
  });

  const filename = `stickerhub-fehlliste-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
});

document.querySelector("#share-whatsapp").addEventListener("click", () => {
  if (!missingStickers().length) {
    toast("Glückwunsch, deine Fehlliste ist leer.");
    return;
  }
  const url = `https://wa.me/?text=${encodeURIComponent(missingListText())}`;
  window.open(url, "_blank", "noopener,noreferrer");
});

async function loadCountries() {
  try {
    profile = await initShell("country");
    if (!profile) return;
    collection = await store.getCollection();
    render();
  } catch (error) {
    toast(error.message, "error");
  }
}

loadCountries();
