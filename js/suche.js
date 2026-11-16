// Suche und Filter für Rezeptlisten.
import { kategorieName } from './data.js';

const ohneAkzente = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Kleinschreibung, Umlaute und Akzente vereinheitlicht (ä → a, ß → ss). */
export const normal = (s) => ohneAkzente(String(s ?? '').toLowerCase().replace(/ß/g, 'ss'));

/** Variante mit ausgeschriebenen Umlauten (ä → ae), damit auch „maerzen“ gefunden wird. */
const umschrift = (s) =>
  ohneAkzente(String(s ?? '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss'));

export function suchtext(r) {
  const roh = [
    r.name,
    r.stil,
    kategorieName(r.kategorie),
    r.tags,
    ...(r.malts || []).map((m) => m.name),
    ...(r.hops || []).map((h) => h.name),
    r.hefe?.name,
    r.notizen,
  ].join(' ');
  return normal(roh) + ' ' + umschrift(roh);
}

export const FARBEN = [
  ['hell', 'hell (unter 15 EBC)', (k) => k.ebc < 15],
  ['bernstein', 'bernstein (15–40 EBC)', (k) => k.ebc >= 15 && k.ebc < 40],
  ['dunkel', 'dunkel (ab 40 EBC)', (k) => k.ebc >= 40],
];
export const BITTERE = [
  ['mild', 'mild (unter 20 IBU)', (k) => k.ibu < 20],
  ['mittel', 'mittel (20–35 IBU)', (k) => k.ibu >= 20 && k.ibu < 35],
  ['herb', 'herb (ab 35 IBU)', (k) => k.ibu >= 35],
];
export const STAERKE = [
  ['leicht', 'leicht (unter 4,5 %)', (k) => k.abv < 4.5],
  ['normal', 'normal (4,5–6,5 %)', (k) => k.abv >= 4.5 && k.abv < 6.5],
  ['stark', 'stark (ab 6,5 %)', (k) => k.abv >= 6.5],
];

const stufe = (liste, key) => liste.find(([k]) => k === key)?.[2];

/**
 * eintraege: [{ r: Rezept, k: Kennzahlen }]
 * f: { q, kat, farbe, bittere, staerke, sort }
 */
export function filtere(eintraege, f) {
  const worte = normal(f.q).split(/[\s,]+/).filter(Boolean);
  const tests = [stufe(FARBEN, f.farbe), stufe(BITTERE, f.bittere), stufe(STAERKE, f.staerke)].filter(Boolean);
  const treffer = eintraege.filter(({ r, k }) => {
    if (f.kat && r.kategorie !== f.kat) return false;
    if (f.quelle && r.quelle && r.quelle !== f.quelle) return false;
    if (!tests.every((t) => t(k))) return false;
    if (!worte.length) return true;
    const text = suchtext(r);
    return worte.every((w) => text.includes(w));
  });
  const name = (a, b) => a.r.name.localeCompare(b.r.name, 'de');
  const sortierer = {
    name,
    stil: (a, b) => (a.r.stil || '').localeCompare(b.r.stil || '', 'de') || name(a, b),
    sw: (a, b) => a.k.sw - b.k.sw,
    ibu: (a, b) => a.k.ibu - b.k.ibu,
    ebc: (a, b) => a.k.ebc - b.k.ebc,
    abv: (a, b) => a.k.abv - b.k.abv,
    neu: (a, b) => (b.r.geaendert || 0) - (a.r.geaendert || 0),
  }[f.sort];
  // „Standard“ (kein Sortierer) behält die vorgegebene Reihenfolge bei.
  return sortierer ? [...treffer].sort(sortierer) : treffer;
}

export const filterAktiv = (f) => !!(f.q.trim() || f.kat || f.quelle || f.farbe || f.bittere || f.staerke);
