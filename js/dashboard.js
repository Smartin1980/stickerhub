import { store } from "./store.js?v=20260610-1";
import { exportStickerListPdf, shareStickerListWhatsApp } from "./sticker-export.js?v=20260610-1";
import { collectionStats, escapeHtml, initShell, toast } from "./ui.js?v=20260610-1";

function countrySummary(country, stickers) {
  const items = stickers.filter((item) => item.country_id === country.id);
  return { country, ...collectionStats(items) };
}

function countryCard(summary) {
  const { country, owned, missing, completion } = summary;
  return `
    <a class="card country-card" href="country.html?code=${encodeURIComponent(country.code)}">
      <span class="country-code">${escapeHtml(country.code)}</span>
      <h3>${escapeHtml(country.name)}</h3>
      <div class="country-counts">
        <span><strong>${owned}</strong> vorhanden</span>
        <span><strong>${missing}</strong> fehlen</span>
      </div>
      <div class="progress-meta"><span>Fortschritt</span><strong>${completion}%</strong></div>
      <div class="progress-track"><div class="progress-bar" style="width:${completion}%"></div></div>
    </a>`;
}

async function loadDashboard() {
  try {
    const profile = await initShell("dashboard");
    if (!profile) return;
    const { countries, stickers } = await store.getCollection();
    const stats = collectionStats(stickers);
    document.querySelector("#welcome").textContent = `Hallo, ${profile.display_name}`;
    ["total", "owned", "missing", "duplicate"].forEach((key) => {
      document.querySelector(`#${key}`).textContent = stats[key].toLocaleString("de-CH");
    });
    document.querySelector("#completion").textContent = `${stats.completion}%`;
    document.querySelector("#progress").style.width = `${stats.completion}%`;
    document.querySelector("#progress-copy").textContent =
      `${stats.owned + stats.duplicate} von ${stats.total} Stickern gesammelt.`;

    const summaries = countries
      .map((country) => countrySummary(country, stickers))
      .sort((a, b) => b.completion - a.completion)
      .slice(0, 4);
    document.querySelector("#country-preview").innerHTML = summaries.map(countryCard).join("");

    document.querySelector("#dashboard-missing-pdf").addEventListener("click", () =>
      exportStickerListPdf(stickers, profile, "missing", toast)
    );
    document.querySelector("#dashboard-missing-whatsapp").addEventListener("click", () =>
      shareStickerListWhatsApp(stickers, profile, "missing", toast)
    );
    document.querySelector("#dashboard-duplicates-pdf").addEventListener("click", () =>
      exportStickerListPdf(stickers, profile, "duplicate", toast)
    );
    document.querySelector("#dashboard-duplicates-whatsapp").addEventListener("click", () =>
      shareStickerListWhatsApp(stickers, profile, "duplicate", toast)
    );
  } catch (error) {
    toast(error.message, "error");
  }
}

loadDashboard();
