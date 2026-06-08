import { store } from "./store.js";
import { escapeHtml, initials, initShell, toast } from "./ui.js";

const grid = document.querySelector("#trade-grid");
const countryFilter = document.querySelector("#country-filter");
const numberFilter = document.querySelector("#number-filter");
const search = document.querySelector("#trade-search");
let trades = [];

function render() {
  const term = search.value.trim().toLowerCase();
  const filtered = trades.filter((trade) => {
    const sticker = trade.stickers;
    const owner = trade.profiles?.display_name || "Sammler";
    const haystack = `${sticker.countries.name} ${sticker.countries.code} ${sticker.sticker_number} ${owner}`.toLowerCase();
    return (!countryFilter.value || sticker.countries.code === countryFilter.value) &&
      (!numberFilter.value || String(sticker.sticker_number) === numberFilter.value) &&
      haystack.includes(term);
  });
  grid.innerHTML = filtered.map((trade) => {
    const sticker = trade.stickers;
    const owner = trade.profiles?.display_name || "Sammler";
    return `
      <article class="card">
        <div class="trade-sticker"><div><span>${escapeHtml(sticker.countries.name)}</span><br><strong>${escapeHtml(sticker.countries.code)}-${sticker.sticker_number}</strong></div></div>
        <div class="trade-owner"><span class="avatar">${initials(owner)}</span><div><strong>${escapeHtml(owner)}</strong><br><span class="muted">Bietet diesen Sticker</span></div></div>
        <button class="btn btn-ghost contact-button" type="button" style="width:100%;margin-top:16px">Tauschanfrage</button>
      </article>`;
  }).join("");
  document.querySelector("#empty").hidden = filtered.length > 0;
}

grid.addEventListener("click", (event) => {
  if (event.target.closest(".contact-button")) {
    toast("Tauschanfrage vorgemerkt. Die Chat-Funktion folgt in Phase 2.");
  }
});

[countryFilter, numberFilter, search].forEach((element) => element.addEventListener("input", render));

async function loadTrades() {
  try {
    await initShell("trades");
    const [{ countries }, tradeRows] = await Promise.all([
      store.getCollection(),
      store.getTrades()
    ]);
    countryFilter.insertAdjacentHTML(
      "beforeend",
      countries.map((country) => `<option value="${escapeHtml(country.code)}">${escapeHtml(country.name)}</option>`).join("")
    );
    trades = tradeRows;
    render();
  } catch (error) {
    toast(error.message, "error");
  }
}

loadTrades();

