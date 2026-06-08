export const COUNTRY_CODES = [
  "MEX", "RSA", "KOR", "CZE", "CAN", "BIH", "QAT", "SUI", "BRA", "MAR",
  "HAI", "SCO", "USA", "PAR", "AUS", "TUR", "GER", "CUW", "CIV", "ECU",
  "NED", "JPN", "SWE", "TUN", "BEL", "EGY", "IRN", "NZL", "ESP", "CPV",
  "KSA", "URU", "FRA", "SEN", "IRQ", "NOR", "ARG", "ALG", "AUT", "JOR",
  "POR", "COD", "UCB", "COL", "ENG", "CRO", "GHA", "PAN", "FWC", "COLA"
];

export const COUNTRY_NAMES = {
  MEX: "Mexiko", RSA: "Südafrika", KOR: "Südkorea", CZE: "Tschechien",
  CAN: "Kanada", BIH: "Bosnien und Herzegowina", QAT: "Katar", SUI: "Schweiz",
  BRA: "Brasilien", MAR: "Marokko", HAI: "Haiti", SCO: "Schottland",
  USA: "USA", PAR: "Paraguay", AUS: "Australien", TUR: "Türkei",
  GER: "Deutschland", CUW: "Curaçao", CIV: "Elfenbeinküste", ECU: "Ecuador",
  NED: "Niederlande", JPN: "Japan", SWE: "Schweden", TUN: "Tunesien",
  BEL: "Belgien", EGY: "Ägypten", IRN: "Iran", NZL: "Neuseeland",
  ESP: "Spanien", CPV: "Kap Verde", KSA: "Saudi-Arabien", URU: "Uruguay",
  FRA: "Frankreich", SEN: "Senegal", IRQ: "Irak", NOR: "Norwegen",
  ARG: "Argentinien", ALG: "Algerien", AUT: "Österreich", JOR: "Jordanien",
  POR: "Portugal", COD: "DR Kongo", UCB: "Interkontinental-Playoff",
  COL: "Kolumbien", ENG: "England", CRO: "Kroatien", GHA: "Ghana",
  PAN: "Panama", FWC: "FIFA World Cup", COLA: "Coca-Cola"
};

export const STATUS = {
  owned: "Vorhanden",
  missing: "Fehlt",
  duplicate: "Doppelt"
};

export const nextStatus = (status) => {
  const states = ["missing", "owned", "duplicate"];
  return states[(states.indexOf(status) + 1) % states.length];
};

