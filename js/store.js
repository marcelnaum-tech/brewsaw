// Datenhaltung: alles liegt lokal im Browser (localStorage), mit Datei-Export/-Import.
import { num, runde, kennzahlen, hefeEmpfehlung, HEFE_PAKET_G } from './calc.js';
import { BIBLIOTHEK } from './bibliothek.js';
import { alleBilder, ersetzeBilder, raeumeAuf } from './bilder.js';

const KEY = 'brewsaw.v1';

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

export const heute = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const klon = (o) => JSON.parse(JSON.stringify(o));

function standard() {
  return {
    version: 1,
    settings: {
      theme: 'auto',
      naechsteSudNr: 1,
      anlage: {
        name: 'Einkocher mit Malzrohr',
        kesselL: 27,
        ausschlagL: 20,
        sha: 65,
        verdampfungLh: 3,
        treberverlustLkg: 0.9,
        trubverlustL: 2,
        hauptgussLkg: 4,
        totraumL: 0,
      },
      wasserprofil: { name: 'Mein Leitungswasser', ca: 80, mg: 15, na: 10, so4: 40, cl: 20, hco3: 250 },
      wasserRezeptId: '',
      wasserFrei: { schuettungKg: 4.5, ausschlagL: 20, kochzeit: 60, zugaben: leereZugaben() },
    },
    rezepte: [],
    sude: [],
    lager: [],
  };
}

export function leereZugaben() {
  return { gips: 0, cacl2: 0, bittersalz: 0, kochsalz: 0, natron: 0, milchsaeureMl: 0, sauermalzG: 0, zielRA: '' };
}

function zusammenfuehren(basis, daten) {
  for (const [k, v] of Object.entries(basis)) {
    if (daten[k] === undefined || daten[k] === null) daten[k] = v;
    else if (v && typeof v === 'object' && !Array.isArray(v) && typeof daten[k] === 'object')
      zusammenfuehren(v, daten[k]);
  }
  return daten;
}

function gueltig(d) {
  return d && typeof d === 'object' && Array.isArray(d.rezepte) && Array.isArray(d.sude);
}

function laden() {
  try {
    const roh = localStorage.getItem(KEY);
    if (roh) {
      const d = JSON.parse(roh);
      if (gueltig(d)) return zusammenfuehren(standard(), d);
    }
  } catch (e) {
    console.warn('Daten konnten nicht geladen werden', e);
  }
  const s = standard();
  s.rezepte = beispielRezepte().map((r) => ausBibliothek(r, s.settings.anlage));
  return s;
}

export const state = laden();

// Ältere Daten ergänzen: Rezepte ohne Hefemenge bekommen ein Päckchen.
for (const r of [...state.rezepte, ...state.sude.map((s) => s.rezept)]) {
  if (!r) continue;
  r.hefe ??= { name: '', evg: 75, temp: 18 };
  if (r.hefe.menge == null) r.hefe.menge = 1;
  r.hefe.einheit ||= 'Pkg.';
}

let timer = null;
export function speichernSofort() {
  clearTimeout(timer);
  timer = null;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Speichern fehlgeschlagen', e);
  }
}
export function speichern() {
  clearTimeout(timer);
  timer = setTimeout(speichernSofort, 250);
}
addEventListener('pagehide', speichernSofort);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && timer) speichernSofort();
});

// ---------- Rezepte ----------

export function vervollstaendigeRezept(r, anlage = state.settings.anlage) {
  return zusammenfuehren(
    {
      id: uid(),
      name: 'Neues Rezept',
      stil: '',
      kategorie: '',
      tags: '',
      ausschlagL: anlage.ausschlagL,
      sha: anlage.sha,
      kochzeit: 60,
      hauptgussLkg: anlage.hauptgussLkg,
      malts: [],
      hops: [],
      hefe: { name: '', evg: 75, temp: 18, menge: 1, einheit: 'Pkg.' },
      einmaischTemp: 60,
      rasten: [],
      wasser: leereZugaben(),
      notizen: '',
      geaendert: Date.now(),
    },
    r,
  );
}

export function neuesRezept() {
  const r = vervollstaendigeRezept({
    rasten: [
      { name: 'Maltoserast', temp: 63, dauer: 40 },
      { name: 'Verzuckerungsrast', temp: 72, dauer: 25 },
      { name: 'Abmaischen', temp: 78, dauer: 5 },
    ],
  });
  state.rezepte.unshift(r);
  speichern();
  return r;
}

export function dupliziereRezept(r) {
  const k = klon(r);
  k.id = uid();
  k.name = r.name + ' (Kopie)';
  k.geaendert = Date.now();
  state.rezepte.unshift(k);
  speichern();
  return k;
}

export function loescheRezept(id) {
  const i = state.rezepte.findIndex((r) => r.id === id);
  if (i >= 0) state.rezepte.splice(i, 1);
  if (state.settings.wasserRezeptId === id) state.settings.wasserRezeptId = '';
  speichern();
  bilderAufraeumen();
}

/** Löscht Bilder, die zu keinem Rezept und keinem Sud mehr gehören. */
export function bilderAufraeumen() {
  const benutzt = new Set([...state.rezepte, ...state.sude.map((s) => s.rezept)].map((r) => r?.bildId).filter(Boolean));
  return raeumeAuf(benutzt);
}

// Als Funktionsdeklaration, weil sie schon beim ersten Laden (weiter oben) gebraucht wird.
function beispielRezepte() {
  return BIBLIOTHEK.filter((b) => ['Bayrisch Hell', 'Hopfensäge Pale Ale'].includes(b.name));
}

/** Eigene, bearbeitbare Kopie eines Bibliotheksrezepts – umgerechnet auf die eigene Anlage. */
export function ausBibliothek(b, anlage = state.settings.anlage) {
  const r = klon(b);
  delete r.id;
  delete r.quelle;
  delete r.eigenerHauptguss;
  const vol = num(anlage.ausschlagL) || b.ausschlagL;
  const sha = num(anlage.sha) || b.sha;
  const fVol = vol / b.ausschlagL;
  const fMalz = fVol * (b.sha / sha);
  r.malts.forEach((m) => (m.kg = runde(m.kg * fMalz, 2)));
  r.hops.forEach((h) => (h.g = Math.max(1, runde(h.g * fVol, 0))));
  r.ausschlagL = vol;
  r.sha = sha;
  // Starkbiere bringen ein knapperes Hauptguss-Verhältnis mit, damit die Maische in den Kessel passt.
  if (!b.eigenerHauptguss) r.hauptgussLkg = anlage.hauptgussLkg;
  r.hefe.menge = hefeEmpfehlung(vol, kennzahlen(r, anlage).sw, r.hefe).pakete;
  r.hefe.einheit = 'Pkg.';
  return vervollstaendigeRezept(r, anlage);
}

export function uebernehmeAusBibliothek(b) {
  const r = ausBibliothek(b);
  state.rezepte.unshift(r);
  speichern();
  return r;
}

export function importiereRezepte(liste) {
  const anlage = state.settings.anlage;
  const neu = liste.map((roh) => {
    const r = { ...roh };
    // Hauptguss der Datei in das Verhältnis l/kg der App umrechnen (ohne den Totraum der Anlage),
    // damit im Rezept genau die Wassermenge des Originals herauskommt.
    const schuettung = (r.malts || []).filter((m) => !m.kochzugabe).reduce((s, m) => s + num(m.kg), 0);
    if (r.hauptgussL > 0 && schuettung > 0) {
      r.hauptgussLkg = runde(Math.max(0.5, (r.hauptgussL - num(anlage.totraumL)) / schuettung), 3);
    }
    delete r.hauptgussL;
    delete r.gaerfassL;
    return vervollstaendigeRezept(r);
  });
  state.rezepte.unshift(...neu);
  speichern();
  return neu;
}

export function beispieleLaden() {
  for (const r of beispielRezepte()) state.rezepte.push(ausBibliothek(r));
  speichern();
}

// ---------- Sude ----------

export function neuerSud(rezept, { name, datum } = {}) {
  const sud = {
    id: uid(),
    nr: state.settings.naechsteSudNr++,
    name: name || rezept.name,
    datum: datum || heute(),
    status: 'geplant',
    rezeptId: rezept.id,
    rezept: klon(rezept),
    anlage: klon(state.settings.anlage),
    wasserprofil: klon(state.settings.wasserprofil),
    mess: { pfannevollL: '', pfannevollP: '', ausschlagL: '', stammwuerzeP: '', anstellL: '' },
    gaerung: [],
    abfuellung: { datum: '', mengeL: '', tempC: 20, zielCo2: 5, zucker: 'haushalt' },
    brautag: null,
    bewertung: '',
    notizen: '',
  };
  state.sude.unshift(sud);
  speichern();
  return sud;
}

export function loescheSud(id) {
  const i = state.sude.findIndex((s) => s.id === id);
  if (i >= 0) state.sude.splice(i, 1);
  speichern();
  bilderAufraeumen();
}

// ---------- Lager ----------

const norm = (s) => String(s || '').trim().toLowerCase();

export function lagerPosten(art, name) {
  return state.lager.find((l) => l.art === art && norm(l.name) === norm(name));
}

/** Zutatenbedarf eines Rezepts, zusammengefasst je Zutat, mit Lagerbestand. */
export function bedarf(rezept) {
  const map = new Map();
  const add = (art, name, menge, einheit) => {
    if (!norm(name) || !(menge > 0)) return;
    const key = art + '|' + norm(name);
    const e = map.get(key) || { art, name: name.trim(), menge: 0, einheit };
    e.menge += menge;
    map.set(key, e);
  };
  for (const m of rezept.malts || []) add('malz', m.name, num(m.kg), 'kg');
  for (const h of rezept.hops || []) add('hopfen', h.name, num(h.g), 'g');
  if (rezept.hefe?.name) {
    // Das Lager führt Hefe in Päckchen; Grammangaben werden auf ganze Päckchen aufgerundet.
    const h = rezept.hefe;
    const menge = h.menge === '' || h.menge == null ? 1 : num(h.menge);
    const pakete = h.einheit === 'g' ? Math.ceil(menge / HEFE_PAKET_G) : h.einheit === 'ml' ? 1 : menge;
    add('hefe', h.name, pakete, 'Pkg.');
  }
  return [...map.values()].map((e) => {
    const posten = lagerPosten(e.art, e.name);
    const vorhanden = posten ? num(posten.menge) : 0;
    return { ...e, menge: runde(e.menge, 3), vorhanden, reicht: vorhanden >= e.menge - 1e-9 };
  });
}

export function abbuchen(rezept) {
  for (const b of bedarf(rezept)) {
    const posten = lagerPosten(b.art, b.name);
    if (posten) posten.menge = Math.max(0, runde(num(posten.menge) - b.menge, 3));
  }
  speichern();
}

// ---------- Sicherung ----------

export function exportJson() {
  return JSON.stringify({ app: 'brewsaw', exportiert: new Date().toISOString(), ...state, bilder: alleBilder() }, null, 2);
}

export function importJson(text) {
  const d = JSON.parse(text);
  if (!gueltig(d)) throw new Error('Die Datei ist keine Brewsaw-Sicherung.');
  delete d.app;
  delete d.exportiert;
  ersetzeBilder(d.bilder && typeof d.bilder === 'object' ? d.bilder : {});
  delete d.bilder;
  const neu = zusammenfuehren(standard(), d);
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, neu);
  speichernSofort();
}

export function allesLoeschen() {
  ersetzeBilder({});
  const neu = standard();
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, neu);
  speichernSofort();
}
