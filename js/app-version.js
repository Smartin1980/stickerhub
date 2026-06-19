export const APP_VERSION = "0.4.0";
export const APP_VERSION_DATE = "2026-06-19";

export const VERSION_HISTORY = [
  {
    version: "0.4.0",
    date: "2026-06-19",
    title: "Öffentliche Profile",
    changes: [
      "Im Profil kann die Sichtbarkeit auf öffentlich oder privat gestellt werden.",
      "Nur öffentliche Profile erscheinen in der Community-Statistik.",
      "Doppelte Sticker werden anderen Sammlern nur bei öffentlichen Profilen angezeigt."
    ]
  },
  {
    version: "0.3.0",
    date: "2026-06-19",
    title: "Version, Rechtliches und Release-Basis",
    changes: [
      "Versionsnummer sichtbar in der App und auf den öffentlichen Seiten.",
      "Neue Versionshistorie mit nachvollziehbaren Änderungen.",
      "Impressum und Datenschutzerklärung ergänzt.",
      "Deployment-Vorbereitung für stg/prod klarer benannt und abgesichert."
    ]
  },
  {
    version: "0.2.0",
    date: "2026-06-18",
    title: "Staging-Umgebung",
    changes: [
      "stg-Branch und stg-Supabase-Projekt vorbereitet.",
      "Staging-Domain stickerhub-stg.bsone.ch eingerichtet und deployed.",
      "Demo-Daten für Admin und normalen Testbenutzer ergänzt.",
      "Release-Prozess und Staging-Checkliste dokumentiert."
    ]
  },
  {
    version: "0.1.0",
    date: "2026-06-10",
    title: "StickerHub Basis",
    changes: [
      "Sammlung, Stickerstatus und Favoriten verwalten.",
      "Tauschbörse, Statistik, Import und Admin-Bereich.",
      "PDF-/WhatsApp-Export für Fehl- und Doppellisten.",
      "Supabase Auth, Rollen und Feature Toggles."
    ]
  }
];
