import { store } from "./store.js";
import { escapeHtml, initShell, setLoading, toast } from "./ui.js";

const fileInput = document.querySelector("#csv-file");
const preview = document.querySelector("#preview");
const form = document.querySelector("#import-form");
let rows = [];

function parseCsv(content) {
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
    if (!/^[A-Z]{3,4}$/.test(country_code) || !Number.isInteger(sticker_number) || sticker_number < 1) {
      throw new Error(`Ungültige Daten in Zeile ${index + 2}.`);
    }
    return { country_code, sticker_number };
  });
}

fileInput.addEventListener("change", async () => {
  try {
    rows = parseCsv(await fileInput.files[0].text());
    preview.innerHTML = rows.slice(0, 100).map((row) =>
      `<tr><td>${escapeHtml(row.country_code)}</td><td>${row.sticker_number}</td></tr>`
    ).join("");
    document.querySelector("#preview-empty").hidden = true;
    toast(`${rows.length} Datensätze bereit.`);
  } catch (error) {
    rows = [];
    preview.innerHTML = "";
    document.querySelector("#preview-empty").hidden = false;
    toast(error.message, "error");
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!rows.length) {
    toast("Bitte zuerst eine gültige CSV-Datei auswählen.", "error");
    return;
  }
  const button = form.querySelector("button");
  setLoading(button, true, "Import läuft...");
  try {
    const imported = await store.importRows(rows);
    toast(`${imported} Datensätze wurden verarbeitet.`);
    form.reset();
    rows = [];
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
    }
  } catch (error) {
    toast(error.message, "error");
  }
}

loadAdmin();
