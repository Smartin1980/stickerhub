import { COUNTRY_CODES, STATUS } from "./data.js";
import { store } from "./store.js?v=20260608-3";
import { escapeHtml, initShell, setLoading, toast } from "./ui.js";

const csvInput = document.querySelector("#collection-csv");
const cameraInput = document.querySelector("#camera-file");
const previewBody = document.querySelector("#collection-preview");
const emptyState = document.querySelector("#collection-empty");
const importButton = document.querySelector("#import-collection");
const importMode = document.querySelector("#import-mode");
let rows = [];

function normalizeStatus(value = "missing") {
  const aliases = {
    fehlt: "missing",
    fehlend: "missing",
    missing: "missing",
    vorhanden: "owned",
    owned: "owned",
    doppelt: "duplicate",
    duplicate: "duplicate"
  };
  const status = aliases[value.trim().toLowerCase()];
  if (!status) throw new Error(`Unbekannter Status: ${value}`);
  return status;
}

function uniqueRows(items) {
  const unique = new Map();
  items.forEach((item) => {
    unique.set(`${item.country_code}-${item.sticker_number}`, item);
  });
  return [...unique.values()].sort((a, b) =>
    a.country_code.localeCompare(b.country_code) || a.sticker_number - b.sticker_number
  );
}

function parseCsv(content) {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("Die CSV-Datei enthält keine Daten.");
  const separator = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(separator).map((header) => header.trim().toLowerCase());
  const countryIndex = headers.indexOf("country_code");
  const numberIndex = headers.indexOf("sticker_number");
  const statusIndex = headers.indexOf("status");
  if (countryIndex < 0 || numberIndex < 0) {
    throw new Error("Erwartete Spalten: country_code,sticker_number,status");
  }
  return uniqueRows(lines.slice(1).map((line, index) => {
    const columns = line.split(separator).map((column) => column.trim());
    const country_code = columns[countryIndex]?.toUpperCase();
    const sticker_number = Number(columns[numberIndex]);
    if (!COUNTRY_CODES.includes(country_code) ||
        !Number.isInteger(sticker_number) ||
        sticker_number < 1 ||
        sticker_number > 20) {
      throw new Error(`Ungültiger Sticker in Zeile ${index + 2}.`);
    }
    return {
      country_code,
      sticker_number,
      status: normalizeStatus(statusIndex >= 0 ? columns[statusIndex] : "missing")
    };
  }));
}

function parseRecognizedText(content) {
  const codes = [...COUNTRY_CODES].sort((a, b) => b.length - a.length);
  const items = [];
  const lines = content.toUpperCase().replace(/[–—]/g, "-").split(/\r?\n/);

  lines.forEach((line) => {
    const code = codes.find((candidate) =>
      new RegExp(`(^|\\s)${candidate}(\\s|[-:]|$)`).test(line)
    );
    if (!code) return;
    const numberText = line.slice(line.indexOf(code) + code.length);
    const numbers = numberText.match(/\b(20|1[0-9]|[1-9])\b/g) || [];
    numbers.forEach((number) => {
      items.push({ country_code: code, sticker_number: Number(number), status: "missing" });
    });
  });

  const parsed = uniqueRows(items);
  if (!parsed.length) {
    throw new Error("Keine Sticker erkannt. Prüfe den Text und verwende z.B. SUI 2,3,6.");
  }
  return parsed;
}

function renderPreview() {
  previewBody.innerHTML = rows.slice(0, 300).map((row) => `
    <tr>
      <td><strong>${escapeHtml(row.country_code)}</strong></td>
      <td>${row.sticker_number}</td>
      <td>${escapeHtml(STATUS[row.status])}</td>
    </tr>
  `).join("");
  document.querySelector("#row-count").textContent = `${rows.length} Sticker`;
  emptyState.hidden = rows.length > 0;
  importButton.disabled = rows.length === 0;
}

function setRows(nextRows) {
  rows = nextRows;
  renderPreview();
  toast(`${rows.length} Sticker wurden erkannt.`);
}

document.querySelectorAll(".import-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".import-tab").forEach((item) =>
      item.classList.toggle("active", item === tab)
    );
    const photoMode = tab.dataset.source === "photo";
    document.querySelector("#photo-panel").hidden = !photoMode;
    document.querySelector("#csv-panel").hidden = photoMode;
  });
});

document.querySelector("#download-template").addEventListener("click", (event) => {
  const csv = "country_code,sticker_number,status\nSUI,2,missing\nGER,10,owned\nBRA,5,duplicate\n";
  event.currentTarget.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
});

csvInput.addEventListener("change", async () => {
  try {
    setRows(parseCsv(await csvInput.files[0].text()));
  } catch (error) {
    rows = [];
    renderPreview();
    toast(error.message, "error");
  }
});

cameraInput.addEventListener("change", async () => {
  const file = cameraInput.files[0];
  if (!file) return;
  const image = document.querySelector("#photo-preview");
  image.src = URL.createObjectURL(file);
  image.hidden = false;
  document.querySelector("#ocr-progress").hidden = false;
  try {
    const result = await Tesseract.recognize(file, "eng", {
      logger(message) {
        if (message.status !== "recognizing text") return;
        const percent = Math.round(message.progress * 100);
        document.querySelector("#ocr-percent").textContent = `${percent}%`;
        document.querySelector("#ocr-bar").style.width = `${percent}%`;
      }
    });
    document.querySelector("#recognized-text").value = result.data.text;
    setRows(parseRecognizedText(result.data.text));
  } catch (error) {
    toast(`Texterkennung fehlgeschlagen: ${error.message}`, "error");
  }
});

document.querySelector("#parse-text").addEventListener("click", () => {
  try {
    setRows(parseRecognizedText(document.querySelector("#recognized-text").value));
  } catch (error) {
    toast(error.message, "error");
  }
});

importMode.addEventListener("change", () => {
  document.querySelector("#mode-help").textContent =
    importMode.value === "missing_replace"
      ? "Alle Sticker werden auf vorhanden gesetzt; die importierte Liste wird als fehlend markiert."
      : "Nur aufgelistete Sticker werden mit dem Status aus der CSV ergänzt oder aktualisiert.";
});

importButton.addEventListener("click", async () => {
  if (!rows.length) return;
  const warning = importMode.value === "missing_replace"
    ? "Diese Fehlliste ersetzt deinen aktuellen Sammlungsstand. Fortfahren?"
    : `${rows.length} Sticker importieren?`;
  if (!window.confirm(warning)) return;

  setLoading(importButton, true, "Import läuft...");
  try {
    const result = await store.importUserCollection(rows, importMode.value);
    toast(`${result.imported} Sticker wurden importiert.`);
    setTimeout(() => { location.href = "dashboard.html"; }, 900);
  } catch (error) {
    toast(error.message, "error");
    setLoading(importButton, false);
  }
});

async function initializeImport() {
  try {
    await initShell("import");
  } catch (error) {
    toast(error.message, "error");
  }
}

initializeImport();
