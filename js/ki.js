// KI-Anbindung (Google Gemini). Jeder Nutzer trägt seinen eigenen Schlüssel ein.
// Der Schlüssel liegt nur in diesem Browser (eigener Speicherplatz, nicht in Sicherungen)
// und wird ausschließlich an Google gesendet.
import { kennzahlen, num, runde } from './calc.js';
import { state, importiereRezepte } from './store.js';

const SPEICHER = 'brewsaw-ki';
export const STANDARD_MODELL = 'gemini-2.5-flash';
const BASIS = 'https://generativelanguage.googleapis.com/v1beta/models/';

export function einstellungen() {
  try {
    const d = JSON.parse(localStorage.getItem(SPEICHER) || '{}');
    return {
      key: typeof d.key === 'string' ? d.key : '',
      modell: typeof d.modell === 'string' && /^[\w.-]{1,60}$/.test(d.modell) ? d.modell : STANDARD_MODELL,
    };
  } catch {
    return { key: '', modell: STANDARD_MODELL };
  }
}

export function speichereEinstellungen({ key, modell }) {
  const m = /^[\w.-]{1,60}$/.test(modell || '') ? modell : STANDARD_MODELL;
  try {
    localStorage.setItem(SPEICHER, JSON.stringify({ key: String(key || '').trim(), modell: m }));
  } catch {
    throw new Error('Der Schlüssel konnte in diesem Browser nicht gespeichert werden.');
  }
}

export function loescheSchluessel() {
  try {
    localStorage.removeItem(SPEICHER);
  } catch {
    /* nichts zu tun */
  }
}

const SYSTEM = `Du bist ein erfahrener Braumeister und hilfst einem Hobbybrauer in der App „Brewsaw".
Der Brauer nutzt meist eine Vollmaische-Anlage mit Malzrohr (z. B. Grainfather G30). Antworte auf Deutsch, knapp und praxisnah.
Nutze metrische Einheiten, Stammwürze in °Plato (zusätzlich SG), Farbe in EBC.
Sage ehrlich, wenn du etwas nicht sicher weißt. Rechne Bittere, Farbe und Alkohol nicht selbst nach – die App liefert diese Werte mit.
Gib bei Sicherheit, Hygiene und Abfüllen (Überdruck, Flaschenbomben) konservative Hinweise.`;

function fehlerText(status, detail) {
  if (status === 400 && /API key/i.test(detail)) return 'Der Schlüssel wurde von Google abgelehnt. Bitte prüfe ihn in den KI-Einstellungen.';
  if (status === 401 || status === 403) return 'Zugriff verweigert. Prüfe den Schlüssel und ob die Gemini-API für dein Konto freigeschaltet ist.';
  if (status === 404) return 'Das gewählte Modell gibt es nicht. Wähle ein anderes in den KI-Einstellungen.';
  if (status === 429) return 'Das Kontingent ist aufgebraucht oder du fragst zu schnell. Warte kurz und versuche es erneut.';
  if (status >= 500) return 'Der Google-Dienst ist gerade gestört. Versuche es später noch einmal.';
  return `Anfrage fehlgeschlagen (${status}).`;
}

/**
 * Schickt einen Gesprächsverlauf [{rolle:'user'|'model', text}] an Gemini.
 * Mit json = true wird eine JSON-Antwort verlangt.
 */
export async function frage(verlauf, { json = false, system = '' } = {}) {
  const { key, modell } = einstellungen();
  if (!key) throw new Error('Bitte zuerst deinen Gemini-Schlüssel eintragen.');
  const ctrl = new AbortController();
  const stopp = setTimeout(() => ctrl.abort(), 90000);
  let res;
  try {
    res = await fetch(`${BASIS}${encodeURIComponent(modell)}:generateContent`, {
      method: 'POST',
      signal: ctrl.signal,
      referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM + (system ? '\n\n' + system : '') }] },
        contents: verlauf.map((v) => ({ role: v.rolle, parts: [{ text: v.text }] })),
        generationConfig: { temperature: json ? 0.4 : 0.7, ...(json ? { responseMimeType: 'application/json' } : {}) },
      }),
    });
  } catch (e) {
    throw new Error(e.name === 'AbortError' ? 'Die Antwort hat zu lange gedauert.' : 'Keine Verbindung zu Google. Bist du online?');
  } finally {
    clearTimeout(stopp);
  }
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.json())?.error?.message || '';
    } catch {
      /* ohne Details */
    }
    throw new Error(fehlerText(res.status, detail));
  }
  const d = await res.json();
  const text = (d?.candidates?.[0]?.content?.parts || []).map((p) => p?.text || '').join('').trim();
  if (!text) throw new Error('Die KI hat nicht geantwortet (möglicherweise blockiert). Formuliere die Frage anders.');
  return text;
}

// ---------- Kontext ----------

const wasserText = () => {
  const p = state.settings.wasserprofil;
  return `Ausgangswasser „${p.name}": Ca ${p.ca}, Mg ${p.mg}, Na ${p.na}, SO4 ${p.so4}, Cl ${p.cl}, HCO3 ${p.hco3} mg/l.`;
};

export function rezeptKontext(r) {
  const k = kennzahlen(r, state.settings.anlage);
  const malz = r.malts.map((m) => `${m.name} ${m.kg} kg (${m.ebc} EBC${m.kochzugabe ? ', Kochzugabe' : ''})`).join('; ');
  const hopfen = r.hops.map((h) => `${h.name} ${h.g} g ${h.alpha} % α, ${h.art}${h.art === 'stopfen' ? ` ${h.zeit} Tage` : h.zeit ? ` ${h.zeit} min` : ''}`).join('; ');
  const rasten = r.rasten.map((x) => `${x.temp} °C ${x.dauer} min`).join(', ');
  return [
    `Rezept „${r.name}" (${r.stil || 'Stil offen'}): ${r.ausschlagL} l Ausschlag, Kochzeit ${r.kochzeit} min, Sudhausausbeute ${r.sha} %.`,
    `Schüttung: ${malz || 'keine'}.`,
    `Hopfen: ${hopfen || 'keiner'}.`,
    `Hefe: ${r.hefe?.name || 'offen'} (Vergärungsgrad ${r.hefe?.evg} %, ${r.hefe?.temp} °C).`,
    `Maischplan: Einmaischen ${r.einmaischTemp} °C; Rasten ${rasten || 'keine'}.`,
    `Berechnet von der App: Stammwürze ${runde(k.sw, 1)} °P, Bittere ${runde(k.ibu, 0)} IBU, Farbe ${runde(k.ebc, 0)} EBC, Alkohol ${runde(k.abv, 1)} % vol.`,
    wasserText(),
    r.notizen ? `Notizen: ${String(r.notizen).slice(0, 500)}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function sudKontext(s) {
  return [
    `Sud Nr. ${s.nr} „${s.name}", Status: ${s.status}, Datum: ${s.datum || 'offen'}.`,
    rezeptKontext(s.rezept),
    `Messwerte: ${JSON.stringify(s.mess || {})}`,
    s.gaerung?.length ? `Gärprotokoll: ${JSON.stringify(s.gaerung).slice(0, 1500)}` : '',
    s.abfuellung?.datum ? `Abfüllung: ${JSON.stringify(s.abfuellung)}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

// ---------- Rezept aus KI-Antwort ----------

const ARTEN = ['vwh', 'kochen', 'whirlpool', 'stopfen'];
const text = (v, max) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
const zahl = (v, min, max, std) => {
  const x = num(v);
  return Number.isFinite(x) && v !== '' && v != null ? Math.min(max, Math.max(min, x)) : std;
};

export const REZEPT_FORMAT = `Antworte ausschließlich mit einem JSON-Objekt dieser Form (Zahlen als Zahlen, keine Kommentare):
{"name": "...", "stil": "...", "ausschlagL": 20, "kochzeit": 60, "sha": 65, "einmaischTemp": 60,
 "malts": [{"name": "Pilsner Malz", "kg": 4.2, "ebc": 3, "potential": 80}],
 "hops": [{"name": "Citra", "g": 20, "alpha": 12, "art": "kochen|vwh|whirlpool|stopfen", "zeit": 60, "temp": 80, "form": "pellets"}],
 "hefe": {"name": "Safale US-05", "evg": 78, "temp": 18},
 "rasten": [{"name": "Maltoserast", "temp": 63, "dauer": 40}],
 "notizen": "kurze Hinweise zu Gärung, Wasser und Besonderheiten"}
Regeln: art "stopfen" hat zeit in Tagen, "whirlpool" zeit in Minuten und temp in °C, "kochen" zeit in Minuten (Minuten vor Kochende), "vwh" braucht keine zeit.
Letzte Rast ist das Abmaischen (78 °C, 5 min). Mengen für die genannte Ausschlagmenge und Sudhausausbeute.`;

/** Wandelt die (nicht vertrauenswürdige) KI-Antwort in ein sicheres Rezept um (ohne es zu speichern). */
export function bereinigeKiRezept(rohText) {
  let o;
  try {
    o = JSON.parse(rohText.replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch {
    throw new Error('Die Antwort der KI war kein gültiges Rezept. Versuche es noch einmal.');
  }
  if (!o || typeof o !== 'object' || !Array.isArray(o.malts) || !o.malts.length) {
    throw new Error('Die KI hat kein Rezept mit Malz geliefert. Versuche es noch einmal.');
  }
  const a = state.settings.anlage;
  const liste = (x, n) => (Array.isArray(x) ? x.filter((e) => e && typeof e === 'object').slice(0, n) : []);
  const r = {
    name: text(o.name, 80) || 'KI-Rezept',
    stil: text(o.stil, 80),
    tags: 'KI',
    ausschlagL: zahl(o.ausschlagL, 5, 200, a.ausschlagL),
    kochzeit: zahl(o.kochzeit, 15, 240, 60),
    sha: zahl(o.sha, 25, 95, a.sha),
    einmaischTemp: zahl(o.einmaischTemp, 20, 80, 60),
    notizen: text(o.notizen, 2000),
    malts: liste(o.malts, 20).map((m) => ({
      name: text(m.name, 60) || 'Malz',
      kg: runde(zahl(m.kg, 0, 30, 0), 2),
      ebc: zahl(m.ebc, 0, 1500, 5),
      potential: zahl(m.potential, 40, 100, 80),
      ...(m.kochzugabe === true ? { kochzugabe: true } : {}),
    })),
    hops: liste(o.hops, 20).map((h) => ({
      name: text(h.name, 60) || 'Hopfen',
      g: zahl(h.g, 0, 1000, 0),
      alpha: zahl(h.alpha, 0, 30, 5),
      art: ARTEN.includes(h.art) ? h.art : 'kochen',
      form: h.form === 'dolden' ? 'dolden' : 'pellets',
      zeit: zahl(h.zeit, 0, 240, 0),
      temp: zahl(h.temp, 0, 100, 80),
    })),
    hefe: {
      name: text(o.hefe?.name, 60),
      evg: zahl(o.hefe?.evg, 30, 100, 75),
      temp: zahl(o.hefe?.temp, 0, 40, 18),
    },
    rasten: liste(o.rasten, 10).map((x) => ({
      name: text(x.name, 40) || 'Rast',
      temp: zahl(x.temp, 20, 100, 65),
      dauer: zahl(x.dauer, 0, 240, 30),
    })),
  };
  if (!r.malts.some((m) => m.kg > 0)) throw new Error('Das Rezept der KI enthält keine Malzmengen.');
  return r;
}

/** Legt das Rezept aus der KI-Antwort in der Rezeptliste an. */
export function rezeptAusKi(rohText) {
  return importiereRezepte([bereinigeKiRezept(rohText)])[0];
}
