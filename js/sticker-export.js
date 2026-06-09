const WEBSITE_URL = "https://stickerhub.bsone.ch/";

const EXPORT_TYPES = {
  missing: {
    status: "missing",
    title: "StickerHub Fehlliste",
    countLabel: "fehlende Sticker",
    emptyMessage: "Glückwunsch, deine Fehlliste ist leer.",
    filename: "stickerhub-fehlliste"
  },
  duplicate: {
    status: "duplicate",
    title: "StickerHub Doppelliste",
    countLabel: "doppelte Sticker",
    emptyMessage: "Du hast aktuell keine doppelten Sticker.",
    filename: "stickerhub-doppelliste"
  }
};

function exportTimestamp() {
  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Zurich"
  }).format(new Date());
}

function stickersByStatus(stickers, status) {
  return stickers
    .filter((sticker) => sticker.status === status)
    .sort((a, b) =>
      a.countries.name.localeCompare(b.countries.name, "de") ||
      a.sticker_number - b.sticker_number
    );
}

function groupStickers(stickers) {
  return stickers.reduce((groups, sticker) => {
    const key = sticker.countries.code;
    if (!groups[key]) {
      groups[key] = { country: sticker.countries, numbers: [] };
    }
    groups[key].numbers.push(sticker.sticker_number);
    return groups;
  }, {});
}

function createQrCodeImage() {
  if (!window.QRCode) return null;
  const container = document.createElement("div");
  new window.QRCode(container, {
    text: WEBSITE_URL,
    width: 128,
    height: 128,
    colorDark: "#0a1d38",
    colorLight: "#ffffff",
    correctLevel: window.QRCode.CorrectLevel.M
  });
  return container.querySelector("canvas")?.toDataURL("image/png") || null;
}

export function exportStickerListPdf(stickers, profile, type, notify) {
  const config = EXPORT_TYPES[type];
  const selected = stickersByStatus(stickers, config.status);
  if (!selected.length) {
    notify(config.emptyMessage);
    return;
  }
  if (!window.jspdf?.jsPDF) {
    notify("Der PDF-Export konnte nicht geladen werden.", "error");
    return;
  }

  const doc = new window.jspdf.jsPDF();
  const timestamp = exportTimestamp();
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const footerTop = pageHeight - 24;
  const qrCodeImage = createQrCodeImage();
  let y = 15;

  function addFooter() {
    doc.setDrawColor(215, 173, 82);
    doc.line(16, footerTop, pageWidth - 16, footerTop);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(10, 29, 56);
    doc.text("StickerHub", 16, footerTop + 6);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(104, 116, 138);
    doc.text("Fussball-WM-Sticker online verwalten und tauschen", 16, footerTop + 11);
    doc.setTextColor(23, 64, 111);
    doc.textWithLink("stickerhub.bsone.ch", 16, footerTop + 16, { url: WEBSITE_URL });
    if (qrCodeImage) {
      const qrSize = 17;
      const qrX = pageWidth - 16 - qrSize;
      const qrY = footerTop + 2;
      doc.addImage(qrCodeImage, "PNG", qrX, qrY, qrSize, qrSize);
      doc.link(qrX, qrY, qrSize, qrSize, { url: WEBSITE_URL });
    }
    doc.setTextColor(20, 34, 58);
  }

  function addPage() {
    addFooter();
    doc.addPage();
    y = 14;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(config.title, 16, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    `${profile?.display_name || "Sammler"} · ${selected.length} ${config.countLabel}`,
    16,
    y
  );
  y += 4;
  doc.setTextColor(104, 116, 138);
  doc.text(`Stand: ${timestamp} Uhr`, 16, y);
  doc.setTextColor(20, 34, 58);
  y += 6;

  Object.values(groupStickers(selected)).forEach(({ country, numbers }) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const codeLabel = `${country.code} `;
    const codeWidth = doc.getTextWidth(codeLabel);
    const countryLines = doc.splitTextToSize(country.name, 178 - codeWidth);
    const numberLines = doc.splitTextToSize(numbers.join(", "), 174);
    const blockHeight = countryLines.length * 4 + numberLines.length * 4 + 3;
    if (y + blockHeight > footerTop - 2) addPage();

    doc.setTextColor(215, 173, 82);
    doc.text(codeLabel, 16, y);
    doc.setTextColor(20, 34, 58);
    doc.text(countryLines, 16 + codeWidth, y);
    y += countryLines.length * 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(numberLines, 18, y);
    y += numberLines.length * 4 + 3;
  });

  addFooter();
  doc.save(`${config.filename}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function shareStickerListWhatsApp(stickers, profile, type, notify) {
  const config = EXPORT_TYPES[type];
  const selected = stickersByStatus(stickers, config.status);
  if (!selected.length) {
    notify(config.emptyMessage);
    return;
  }
  const lines = Object.values(groupStickers(selected)).map(({ country, numbers }) =>
    `${country.name} (${country.code}): ${numbers.join(", ")}`
  );
  const message = [
    `${config.title} von ${profile?.display_name || "Sammler"}`,
    `Stand: ${exportTimestamp()} Uhr`,
    `${selected.length} ${config.countLabel}`,
    "",
    ...lines,
    "",
    "Erstellt mit StickerHub - Fussball-WM-Sticker online verwalten und tauschen:",
    WEBSITE_URL
  ].join("\n");
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

