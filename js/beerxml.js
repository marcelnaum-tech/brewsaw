// Import von Rezepten im BeerXML-1.0-Format (Export u. a. aus Brewfather, BeerSmith, Brewtarget).
import { num, runde } from './calc.js';

const text = (el, tag) => {
  // Nur direkte Kindelemente, damit z. B. der NAME des STYLE nicht mit dem des Rezepts verwechselt wird.
  for (const kind of el?.children || []) if (kind.tagName.toUpperCase() === tag) return kind.textContent.trim();
  return '';
};
const kind = (el, tag) => [...(el?.children || [])].find((k) => k.tagName.toUpperCase() === tag) || null;
const liste = (el, satz, eintrag) =>
  [...(kind(el, satz)?.children || [])].filter((k) => k.tagName.toUpperCase() === eintrag);

/** Lovibond → EBC (über SRM nach Morey-Umrechnung). */
export const lovibondZuEbc = (l) => Math.max(0, (1.3546 * num(l) - 0.76) * 1.97);

/**
 * BeerXML nennt die Ausbeute relativ zum Extraktpotenzial der Malze (EFFICIENCY 72 % heißt:
 * 72 % des möglichen Extrakts landen im Gärfass). Die Sudhausausbeute der App bezieht sich
 * dagegen – wie im deutschen Sprachraum üblich – auf die Malzmenge, bei einem Basismalz
 * mit 80 % Potenzial. Umrechnung: SHA = EFFICIENCY × 0,8.
 */
export const effizienzZuSha = (eff) => num(eff) * 0.8;

// Wasserzusätze, die der Wasserrechner kennt (Schlüsselwort im Namen → Feld)
const WASSERZUSATZ = [
  [/gypsum|caso|gips/i, 'gips'],
  [/calcium chloride|cacl|calciumchlorid/i, 'cacl2'],
  [/epsom|mgso|bittersalz/i, 'bittersalz'],
  [/baking soda|nahco|natron/i, 'natron'],
  [/table salt|nacl|kochsalz/i, 'kochsalz'],
];

const USE = { boil: 'Kochen', mash: 'Maische', sparge: 'Nachguss', primary: 'Hauptgärung', secondary: 'Nachgärung', bottling: 'Abfüllen' };

function rezeptAusXml(el, vonBrewfather) {
  // Brewfather schreibt die Malzfarbe als SRM (EBC ÷ 1,97) statt wie in der Spezifikation als Lovibond.
  const farbe = (wert) => (vonBrewfather ? num(wert) * 1.97 : lovibondZuEbc(wert));

  const malts = liste(el, 'FERMENTABLES', 'FERMENTABLE').map((f) => {
    const typ = text(f, 'TYPE').toLowerCase();
    return {
      name: text(f, 'NAME'),
      kg: runde(num(text(f, 'AMOUNT')), 3),
      ebc: runde(farbe(text(f, 'COLOR')), 0),
      potential: runde(num(text(f, 'YIELD')) || 80, 1),
      ...(['sugar', 'extract', 'dry extract'].includes(typ) ? { kochzugabe: true } : {}),
      ...(text(f, 'NOT_FERMENTABLE').toLowerCase() === 'true' ? { unvergaerbar: true } : {}),
    };
  });

  const hops = liste(el, 'HOPS', 'HOP').map((h) => {
    const use = text(h, 'USE').toLowerCase();
    const min = num(text(h, 'TIME'));
    const basis = {
      name: text(h, 'NAME'),
      g: runde(num(text(h, 'AMOUNT')) * 1000, 1),
      alpha: runde(num(text(h, 'ALPHA')), 1),
      form: ['leaf', 'whole'].includes(text(h, 'FORM').toLowerCase()) ? 'dolden' : 'pellets',
    };
    if (use === 'dry hop') return { ...basis, art: 'stopfen', zeit: Math.max(1, Math.round(min / 1440)) };
    if (use === 'aroma') return { ...basis, art: 'whirlpool', zeit: min || 15, temp: num(text(h, 'TEMPERATURE')) || 80 };
    if (use === 'first wort' || use === 'mash') return { ...basis, art: 'vwh', zeit: 0 };
    return { ...basis, art: 'kochen', zeit: min };
  });

  // ---------- Hefe ----------
  const hefeEl = liste(el, 'YEASTS', 'YEAST')[0];
  const tMin = num(text(hefeEl, 'MIN_TEMPERATURE'));
  const tMax = num(text(hefeEl, 'MAX_TEMPERATURE'));
  const gaertemp = num(text(el, 'PRIMARY_TEMP'));
  const hefeMenge = () => {
    const menge = num(text(hefeEl, 'AMOUNT'));
    if (!(menge > 0)) return {};
    // Brewfather u. a. geben Päckchen nur in DISPLAY_AMOUNT an („4 pkg“).
    const anzeige = text(hefeEl, 'DISPLAY_AMOUNT').match(/^([\d.,]+)\s*(pkg|pack|päckchen)/i);
    if (anzeige) return { menge: num(anzeige[1]), einheit: 'Pkg.' };
    // Laut Spezifikation: AMOUNT in Kilogramm, wenn AMOUNT_IS_WEIGHT gesetzt ist, sonst in Litern.
    if (text(hefeEl, 'AMOUNT_IS_WEIGHT').toLowerCase() === 'true') return { menge: runde(menge * 1000, 1), einheit: 'g' };
    return { menge: runde(menge * 1000, 0), einheit: 'ml' };
  };
  const hefe = {
    name: [text(hefeEl, 'LABORATORY'), text(hefeEl, 'NAME'), text(hefeEl, 'PRODUCT_ID')].filter(Boolean).join(' '),
    evg: runde(num(text(hefeEl, 'ATTENUATION')) || 75, 0),
    temp: gaertemp || (tMin && tMax ? runde((tMin + tMax) / 2, 0) : tMin || tMax || 18),
    ...hefeMenge(),
  };

  // ---------- Maischplan ----------
  const stufen = liste(kind(el, 'MASH'), 'MASH_STEPS', 'MASH_STEP');
  const rasten = stufen.map((s) => ({
    name: text(s, 'NAME'),
    temp: runde(num(text(s, 'STEP_TEMP')), 0),
    dauer: runde(num(text(s, 'STEP_TIME')), 0),
  }));
  const hauptgussL = stufen.reduce((sum, s) => sum + num(text(s, 'INFUSE_AMOUNT')), 0);

  // ---------- Weitere Zutaten: Wasserzusätze in den Wasserrechner, alles andere in die Notizen ----------
  const wasser = {};
  const extras = [];
  for (const m of liste(el, 'MISCS', 'MISC')) {
    const name = text(m, 'NAME');
    const menge = num(text(m, 'AMOUNT'));
    const gewicht = text(m, 'AMOUNT_IS_WEIGHT').toLowerCase() === 'true';
    const use = text(m, 'USE').toLowerCase();
    if (text(m, 'TYPE').toLowerCase() === 'water agent') {
      const feld = WASSERZUSATZ.find(([re]) => re.test(name))?.[1];
      if (feld && gewicht) {
        wasser[feld] = runde((wasser[feld] || 0) + menge * 1000, 2);
        continue;
      }
      if (/lactic|milchs/i.test(name) && !gewicht) {
        wasser.milchsaeureMl = runde((wasser.milchsaeureMl || 0) + menge * 1000, 1);
        continue;
      }
    }
    const anzeige = text(m, 'DISPLAY_AMOUNT') || (gewicht ? `${runde(menge * 1000, 1)} g` : `${runde(menge * 1000, 0)} ml`);
    const zeit = num(text(m, 'TIME'));
    extras.push(`${anzeige} ${name} (${USE[use] || text(m, 'USE')}${use === 'boil' && zeit ? `, ${zeit} min` : ''})`);
  }

  const notizen = [text(el, 'NOTES'), extras.length ? 'Weitere Zutaten: ' + extras.join('; ') + '.' : ''].filter(Boolean).join('\n\n');

  const r = {
    name: text(el, 'NAME') || 'Importiertes Rezept',
    stil: text(kind(el, 'STYLE'), 'NAME'),
    tags: 'import',
    malts,
    hops,
    hefe,
    rasten,
    notizen,
  };
  if (Object.keys(wasser).length) r.wasser = wasser;

  // Nur vorhandene Angaben übernehmen – sonst gelten die Standardwerte der eigenen Anlage.
  // BATCH_SIZE ist die Menge im Gärfass. Die App rechnet mit der Ausschlagmenge im Kessel,
  // also zuzüglich des Trubverlusts, sofern die Datei ihn nennt.
  const batch = num(text(el, 'BATCH_SIZE'));
  const trub = num(text(kind(el, 'EQUIPMENT'), 'TRUB_CHILLER_LOSS'));
  if (batch > 0) {
    r.ausschlagL = runde(batch + trub, 1);
    r.gaerfassL = runde(batch, 1);
  }
  if (num(text(el, 'EFFICIENCY')) > 0) {
    // Die Ausbeute der Datei gilt bis ins Gärfass; im Kessel ist entsprechend mehr Extrakt.
    const kessel = batch > 0 ? (batch + trub) / batch : 1;
    r.sha = runde(effizienzZuSha(text(el, 'EFFICIENCY')) * kessel, 1);
  }
  if (num(text(el, 'BOIL_TIME')) > 0) r.kochzeit = runde(num(text(el, 'BOIL_TIME')), 0);
  if (rasten.length) r.einmaischTemp = rasten[0].temp;
  if (hauptgussL > 0) r.hauptgussL = runde(hauptgussL, 2);

  // Angaben des Quellprogramms zum Vergleich
  const og = num(text(el, 'OG'));
  const fg = num(text(el, 'FG'));
  const angaben = [
    og > 1 ? `Stammwürze SG ${og.toFixed(3).replace('.', ',')}` : '',
    fg > 1 ? `Restextrakt SG ${fg.toFixed(3).replace('.', ',')}` : '',
    num(text(el, 'ABV')) > 0 ? `${String(num(text(el, 'ABV'))).replace('.', ',')} % vol` : '',
    num(text(el, 'IBU')) > 0 ? `${String(num(text(el, 'IBU'))).replace('.', ',')} IBU` : '',
  ].filter(Boolean);
  if (angaben.length) r.notizen += `${r.notizen ? '\n\n' : ''}Angaben aus der importierten Datei: ${angaben.join(', ')}.`;
  return r;
}

/** Liest alle Rezepte aus einem BeerXML-Text. Wirft einen Fehler bei ungültigen Dateien. */
export function leseBeerXml(xml) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Die Datei ist kein gültiges XML.');
  const alle = [...doc.getElementsByTagName('*')];
  const rezepte = alle.filter((e) => e.tagName.toUpperCase() === 'RECIPE');
  if (!rezepte.length) throw new Error('In der Datei wurde kein BeerXML-Rezept gefunden.');
  const vonBrewfather = alle.some((e) => e.tagName.toUpperCase().startsWith('BF_'));
  return rezepte.map((r) => rezeptAusXml(r, vonBrewfather));
}
