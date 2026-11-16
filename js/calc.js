// Brauberechnungen – reine Funktionen ohne Abhängigkeiten zur Oberfläche.

export const num = (v) => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

export const runde = (x, n = 1) => {
  const f = 10 ** n;
  return Math.round((x + Number.EPSILON) * f) / f;
};

// ---------- Dichte / Extrakt ----------

export function platoToSg(p) {
  return 1 + p / (258.6 - (p / 258.2) * 227.1);
}

export function sgToPlato(sg) {
  return -616.868 + 1111.14 * sg - 630.272 * sg * sg + 135.997 * sg ** 3;
}

/** Extraktmasse (kg) in einer Würze mit Volumen (l, kalt) und Stammwürze (°P). */
export function extraktInWuerze(volL, plato) {
  return (volL * platoToSg(plato) * plato) / 100;
}

/** Stammwürze (°P), wenn extraktKg in volL (kalt) gelöst sind. */
export function stammwuerze(extraktKg, volL) {
  if (!(extraktKg > 0) || !(volL > 0)) return 0;
  let lo = 0;
  let hi = 60;
  if (extraktInWuerze(volL, hi) <= extraktKg) return hi;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (extraktInWuerze(volL, mid) < extraktKg) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Extrakt aus der Schüttung. Die Sudhausausbeute (SHA) bezieht sich auf ein
 * Basismalz mit 80 % Extraktpotenzial; andere Malze werden anteilig gewichtet.
 * Kochzugaben (Zucker) gehen vollständig in die Würze über.
 */
export function extraktAusSchuettung(malts, sha) {
  let maische = 0;
  let kochen = 0;
  let unvergaerbar = 0;
  for (const m of malts || []) {
    const kg = num(m.kg);
    const pot = num(m.potential) || 80;
    const extrakt = m.kochzugabe ? (kg * pot) / 100 : kg * (pot / 80) * (num(sha) / 100);
    if (m.kochzugabe) kochen += extrakt;
    else maische += extrakt;
    // z. B. Laktose: zählt zur Stammwürze, wird von der Hefe aber nicht vergoren
    if (m.unvergaerbar) unvergaerbar += extrakt;
  }
  return { maische, kochen, unvergaerbar, gesamt: maische + kochen };
}

/** Tatsächliche Sudhausausbeute aus Messwerten (Ausschlag kalt, °P). */
export function sudhausausbeute(malts, ausschlagL, plato) {
  const basis = (malts || [])
    .filter((m) => !m.kochzugabe)
    .reduce((s, m) => s + num(m.kg) * ((num(m.potential) || 80) / 80), 0);
  if (!(basis > 0)) return 0;
  const zucker = extraktAusSchuettung(malts, 0).kochen;
  return ((extraktInWuerze(ausschlagL, plato) - zucker) / basis) * 100;
}

// ---------- Bittere (Tinseth) ----------

export function tinseth(sg, minuten) {
  if (!(minuten > 0)) return 0;
  return (1.65 * Math.pow(0.000125, sg - 1) * (1 - Math.exp(-0.04 * minuten))) / 4.15;
}

/** Relative Isomerisierungsrate gegenüber 100 °C (nach Malowicki). */
export function isoFaktor(tempC) {
  const f = 2.39e11 * Math.exp(-9773 / (tempC + 273.15));
  return Math.max(0, Math.min(1, f));
}

export function hopfenIbu(h, volL, sg, kochzeit) {
  const g = num(h.g);
  const alpha = num(h.alpha);
  if (!(volL > 0) || !(g > 0) || !(alpha > 0)) return 0;
  const mgl = (g * alpha * 10) / volL;
  let u = 0;
  switch (h.art) {
    case 'vwh':
      u = tinseth(sg, kochzeit) * 1.1;
      break;
    case 'whirlpool':
      u = tinseth(sg, num(h.zeit)) * isoFaktor(num(h.temp) || 85);
      break;
    case 'stopfen':
      u = 0;
      break;
    default:
      u = tinseth(sg, Math.min(num(h.zeit), kochzeit || Infinity));
  }
  if (h.form !== 'dolden') u *= 1.1;
  return u * mgl;
}

// ---------- Farbe (Morey) ----------

export function farbeEbc(malts, volL) {
  if (!(volL > 0)) return 0;
  const mcu =
    (malts || []).reduce((s, m) => s + num(m.kg) * 2.20462 * (num(m.ebc) / 1.97), 0) /
    (volL / 3.78541);
  if (!(mcu > 0)) return 0;
  return 1.97 * 1.4922 * Math.pow(mcu, 0.6859);
}

const SRM_HEX = [
  '#FFF4D4', '#FFE699', '#FFD878', '#FFCA5A', '#FFBF42', '#FBB123', '#F8A600', '#F39C00',
  '#EA8F00', '#E58500', '#DE7C00', '#D77200', '#CF6900', '#CB6200', '#C35900', '#BB5100',
  '#B54C00', '#B04500', '#A63E00', '#A13700', '#9B3200', '#952D00', '#8E2900', '#882300',
  '#821E00', '#7B1A00', '#771900', '#701400', '#6A0E00', '#660D00', '#5E0B00', '#5A0A02',
  '#600903', '#520907', '#4C0505', '#470606', '#440607', '#3F0708', '#3B0607', '#3A070B',
  '#36080A',
];

export function ebcHex(ebc) {
  const srm = Math.max(0, Math.min(40, Math.round(num(ebc) / 1.97)));
  return SRM_HEX[srm];
}

// ---------- Alkohol (Balling) ----------

export function alkohol(swP, restScheinbarP) {
  if (!(swP > 0)) return { abv: 0, abw: 0, evg: 0, restWirklich: 0 };
  const restWirklich = 0.1808 * swP + 0.8192 * restScheinbarP;
  const abw = (swP - restWirklich) / (2.0665 - 0.010665 * swP);
  const abv = (abw * platoToSg(restScheinbarP)) / 0.7894;
  return { abv, abw, evg: (1 - restScheinbarP / swP) * 100, restWirklich };
}

// ---------- Hefemenge ----------

export const HEFE_PAKET_G = 11.5; // übliches Päckchen Trockenhefe

/**
 * Richtwert für Trockenhefe nach den üblichen Herstellerangaben: obergärig ca. 0,5 g/l,
 * untergärig (kalt vergoren) ca. 1 g/l; über 12 °P entsprechend mehr.
 */
export function hefeEmpfehlung(volL, plato, hefe = {}) {
  const untergaerig = num(hefe.temp) > 0 ? num(hefe.temp) <= 15 : /lager|untergärig/i.test(hefe.name || '');
  const gramm = num(volL) * (untergaerig ? 1 : 0.5) * Math.max(1, num(plato) / 12);
  // Knapp über einem vollen Päckchen (bis 15 %) wird nicht aufgerundet.
  return { untergaerig, gramm, pakete: Math.max(1, Math.ceil(gramm / HEFE_PAKET_G - 0.15)) };
}

/** Hefemenge eines Rezepts als Text, z. B. „2 Pkg.“ oder „23 g“. */
export function hefeMengeText(hefe = {}) {
  const menge = hefe.menge === '' || hefe.menge == null ? 1 : num(hefe.menge);
  const einheit = hefe.einheit || 'Pkg.';
  return `${String(menge).replace('.', ',')} ${einheit}`;
}

// ---------- Wassermengen ----------

export const SCHWAND = 0.96; // Volumen kalt / Volumen kochend heiß
export const MALZ_VERDRAENGUNG = 0.7; // l je kg Schüttung in der Maische

export function wassermengen(o) {
  const schuettung = num(o.schuettungKg);
  const ausschlag = num(o.ausschlagL);
  const verdampft = (num(o.verdampfungLh) * num(o.kochzeit)) / 60;
  const treber = num(o.treberverlustLkg) * schuettung;
  const pfannevollKalt = ausschlag + verdampft;
  const gesamt = pfannevollKalt + treber;
  // Totraum: Wasser unter dem Malzrohr, das nicht an der Maische teilnimmt (Grainfather G30: 3,5 l)
  const hauptguss = Math.min(num(o.hauptgussLkg) * schuettung + (schuettung > 0 ? num(o.totraumL) : 0), gesamt);
  const nachguss = Math.max(0, gesamt - hauptguss);
  return {
    schuettung,
    ausschlag,
    verdampft,
    treber,
    pfannevollKalt,
    pfannevollHeiss: pfannevollKalt / SCHWAND,
    gesamt,
    hauptguss,
    nachguss,
    maischevolumen: hauptguss + schuettung * MALZ_VERDRAENGUNG,
    gaerfass: Math.max(0, ausschlag - num(o.trubverlustL)),
  };
}

// ---------- Wasserchemie ----------

export const DH_CA = 7.147; // mg/l Calcium je °dH
export const DH_MG = 4.337; // mg/l Magnesium je °dH
export const DH_HCO3 = 21.76; // mg/l Hydrogencarbonat je °dH Karbonathärte
export const MMOL_JE_DH = 0.3566; // mmol/l Säurekapazität je °dH
export const MILCHSAEURE_MMOL_ML = 10.53; // 80 %ige Milchsäure, Dichte 1,186 g/ml
export const SAUERMALZ_MMOL_G = 0.222; // ca. 2 % Milchsäure im Sauermalz

// Ionenbeitrag in mg je g Salz
export const SALZE = {
  gips: { name: 'Braugips', formel: 'CaSO₄·2H₂O', ca: 232.8, so4: 557.7 },
  cacl2: { name: 'Calciumchlorid', formel: 'CaCl₂·2H₂O', ca: 272.6, cl: 482.3 },
  bittersalz: { name: 'Bittersalz', formel: 'MgSO₄·7H₂O', mg: 98.6, so4: 389.7 },
  kochsalz: { name: 'Kochsalz', formel: 'NaCl', na: 393.4, cl: 606.6 },
  natron: { name: 'Natron', formel: 'NaHCO₃', na: 273.7, hco3: 726.3 },
};

export const IONEN = ['ca', 'mg', 'na', 'so4', 'cl', 'hco3'];

export function haerte(p) {
  const caH = num(p.ca) / DH_CA;
  const mgH = num(p.mg) / DH_MG;
  const kh = num(p.hco3) / DH_HCO3;
  return { gesamt: caH + mgH, kh, ra: kh - caH / 3.5 - mgH / 7 };
}

/** Wasserprofil nach Zugabe von Salzen (g gesamt) und Säure in volL Wasser. */
export function wasserBehandeln(profil, volL, z = {}) {
  const vor = haerte(profil);
  const neu = {};
  for (const ion of IONEN) neu[ion] = num(profil[ion]);
  if (volL > 0) {
    for (const [key, salz] of Object.entries(SALZE)) {
      const g = num(z[key]);
      if (!(g > 0)) continue;
      for (const ion of IONEN) if (salz[ion]) neu[ion] += (g * salz[ion]) / volL;
    }
  }
  const nachSalzen = haerte(neu);
  const saeureMmolL =
    volL > 0
      ? (num(z.milchsaeureMl) * MILCHSAEURE_MMOL_ML + num(z.sauermalzG) * SAUERMALZ_MMOL_G) / volL
      : 0;
  const raNach = nachSalzen.ra - saeureMmolL / MMOL_JE_DH;
  return {
    vor,
    profil: neu,
    nach: { ...nachSalzen, ra: raNach },
    raOhneSaeure: nachSalzen.ra,
    so4cl: neu.cl > 0 ? neu.so4 / neu.cl : null,
  };
}

/** Milchsäure 80 % (ml), um die Restalkalität von raIst auf raZiel zu senken. */
export function milchsaeureFuerRa(raIst, raZiel, volL) {
  return Math.max(0, ((raIst - raZiel) * MMOL_JE_DH * volL) / MILCHSAEURE_MMOL_ML);
}

/** Richtwert für die Restalkalität (°dH) abhängig von der Bierfarbe. */
export function raEmpfehlung(ebc) {
  if (ebc < 8) return { max: 0, text: 'sehr helle Biere (Pils): RA ≤ 0 °dH' };
  if (ebc < 15) return { max: 5, text: 'helle Biere: RA ≤ 5 °dH' };
  if (ebc < 35) return { max: 10, text: 'bernsteinfarbene Biere: RA ≤ 10 °dH' };
  return { max: 15, text: 'dunkle Biere: RA ≤ 15 °dH' };
}

// ---------- Karbonisierung ----------

/** Im Jungbier gelöstes CO₂ (g/l) bei Normaldruck und Temperatur. */
export function restCo2(tempC) {
  return 10.13 * Math.exp(-10.73797 + 2617.25 / (num(tempC) + 273.15));
}

export const ZUCKER = {
  haushalt: { name: 'Haushaltszucker', co2JeG: 0.515 },
  traube: { name: 'Traubenzucker (Dextrose)', co2JeG: 0.445 },
};

export function speisezucker(zielCo2, tempC, volL, art = 'haushalt') {
  const delta = Math.max(0, num(zielCo2) - restCo2(tempC));
  const gL = delta / (ZUCKER[art] || ZUCKER.haushalt).co2JeG;
  return { gL, gesamt: gL * num(volL), rest: restCo2(tempC) };
}

// ---------- Alles zusammen ----------

export function kennzahlen(r, anlage = {}) {
  const malts = r.malts || [];
  const hops = r.hops || [];
  const vol = num(r.ausschlagL);
  const kochzeit = num(r.kochzeit);
  const ex = extraktAusSchuettung(malts, r.sha);
  const sw = stammwuerze(ex.gesamt, vol);
  const sg = platoToSg(sw);
  const ebc = farbeEbc(malts, vol);
  const evg = num(r.hefe?.evg) || 75;
  const vergaerbar = ex.gesamt > 0 ? 1 - ex.unvergaerbar / ex.gesamt : 1;
  const restP = sw * (1 - (evg / 100) * vergaerbar);
  const alk = alkohol(sw, restP);
  const schuettung = malts.filter((m) => !m.kochzugabe).reduce((s, m) => s + num(m.kg), 0);
  const malzGesamt = malts.reduce((s, m) => s + num(m.kg), 0);
  const wasser = wassermengen({
    schuettungKg: schuettung,
    ausschlagL: vol,
    kochzeit,
    verdampfungLh: anlage.verdampfungLh,
    treberverlustLkg: anlage.treberverlustLkg,
    trubverlustL: anlage.trubverlustL,
    hauptgussLkg: r.hauptgussLkg,
    totraumL: anlage.totraumL,
  });
  // Bittere nach Tinseth mit der Würzedichte vor dem Kochen (Pfannevoll-Würze, ohne Kochzugaben)
  // und der Ausschlagmenge – so rechnet auch Brewfather.
  const pfannevollP = stammwuerze(ex.maische, wasser.pfannevollKalt);
  const kochSg = platoToSg(pfannevollP);
  const hopIbus = hops.map((h) => hopfenIbu(h, vol, kochSg, kochzeit));
  const ibu = hopIbus.reduce((a, b) => a + b, 0);
  return {
    schuettung,
    malzGesamt,
    extrakt: ex.gesamt,
    sw,
    sg,
    ibu,
    hopIbus,
    ebc,
    farbe: ebcHex(ebc),
    restP,
    abv: alk.abv,
    evg,
    wasser,
    pfannevollP,
    kesselZuKlein:
      num(anlage.kesselL) > 0 &&
      Math.max(wasser.maischevolumen, wasser.pfannevollHeiss) > num(anlage.kesselL),
  };
}
