export const APP_VERSION = "0.3.0";
export const APP_VERSION_DATE = "2026-06-19";

export const VERSION_HISTORY = [
  {
    version: "0.3.0",
    date: "2026-06-19",
    title: "Version, Rechtliches und Release-Basis",
    changes: [
      "Versionsnummer sichtbar in der App und auf den oeffentlichen Seiten.",
      "Neue Versionshistorie mit nachvollziehbaren Aenderungen.",
      "Impressum und Datenschutzerklaerung ergaenzt.",
      "Deployment-Vorbereitung fuer stg/prod klarer benannt und abgesichert."
    ]
  },
  {
    version: "0.2.0",
    date: "2026-06-18",
    title: "Staging-Umgebung",
    changes: [
      "stg-Branch und stg-Supabase-Projekt vorbereitet.",
      "Staging-Domain stickerhub-stg.bsone.ch eingerichtet und deployed.",
      "Demo-Daten fuer Admin und normalen Testbenutzer ergaenzt.",
      "Release-Prozess und Staging-Checkliste dokumentiert."
    ]
  },
  {
    version: "0.1.0",
    date: "2026-06-10",
    title: "StickerHub Basis",
    changes: [
      "Sammlung, Laender, Stickerstatus und Favoriten verwalten.",
      "Tauschboerse, Statistik, Import und Admin-Bereich.",
      "PDF-/WhatsApp-Export fuer Fehl- und Doppellisten.",
      "Supabase Auth, Rollen und Feature Toggles."
    ]
  }
];
