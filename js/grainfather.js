// Bluetooth-Anbindung an die Grainfather-G30-Steuerung (Connect-Controller) über Web Bluetooth.
//
// Das Protokoll ist nicht offiziell dokumentiert. Grundlage ist die von der Community
// ermittelte Beschreibung (github.com/clausbroch/Grainfather-Bluetooth-Protocol, MIT):
// Befehle sind ASCII-Text, auf genau 19 Zeichen mit Leerzeichen aufgefüllt; die Steuerung
// meldet ihren Zustand laufend in kurzen Textzeilen (X = Temperaturen, Y = Status, T = Timer, …).
import { kennzahlen, num } from './calc.js';

export const GF_SERVICE = '0000cdd0-0000-1000-8000-00805f9b34fb';
export const GF_LESEN = '0003cdd1-0000-1000-8000-00805f9b0131';
export const GF_SCHREIBEN = '0003cdd2-0000-1000-8000-00805f9b0131';
const LAENGE = 19;

export const unterstuetzt = () => typeof navigator !== 'undefined' && 'bluetooth' in navigator;

// ---------- Protokoll (reine Funktionen, ohne Bluetooth testbar) ----------

/** Füllt einen Befehl auf 19 Zeichen auf. Längere Befehle sind ungültig. */
export function paket(befehl) {
  if (befehl.length > LAENGE) throw new Error(`Befehl zu lang: ${befehl}`);
  return befehl.padEnd(LAENGE, ' ');
}

const zahl1 = (x) => (Math.round(num(x) * 10) / 10).toString();

export const BEFEHL = {
  heizung: (an) => (an ? 'K1' : 'K0'),
  pumpe: (an) => (an ? 'L1' : 'L0'),
  solltemperatur: (t) => `$${zahl1(t)},`,
  timer: (min) => `S${Math.round(num(min))},`,
  timerAbbrechen: () => 'C',
  timerPause: () => 'G',
  setTaste: () => 'T',
  hinweisBestaetigen: () => 'I',
  hopfengabeBestaetigen: () => 'A',
  sitzungBeenden: () => 'F',
  firmware: () => 'X',
  einheiten: () => 'g',
};

/** Rezeptname für das Display: nur Großbuchstaben, Ziffern und Leerzeichen, höchstens 19 Zeichen. */
export function displayName(name) {
  const roh = String(name || 'BREWSAW')
    .replace(/ä/gi, 'ae').replace(/ö/gi, 'oe').replace(/ü/gi, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  return (roh || 'BREWSAW').slice(0, LAENGE);
}

/**
 * Befehlsfolge, mit der ein Rezept (Maischplan, Kochzeit, Hopfengaben) an die Steuerung
 * übertragen wird. Die Reihenfolge der Zeilen ist vom Protokoll vorgegeben.
 */
export function rezeptBefehle(rezept, anlage) {
  const k = kennzahlen(rezept, anlage);
  const rasten = (rezept.rasten || []).filter((r) => num(r.temp) > 0);
  if (!rasten.length) throw new Error('Das Rezept hat keinen Maischplan.');
  const kochzeit = Math.round(num(rezept.kochzeit));
  const hops = rezept.hops || [];
  // Jede unterschiedliche Kochdauer ist ein Stopp; Vorderwürzehopfen zählt als Gabe zu Kochbeginn.
  const zeiten = hops
    .filter((h) => h.art === 'kochen' || h.art === 'vwh')
    .map((h) => (h.art === 'vwh' ? kochzeit : Math.min(Math.round(num(h.zeit)), kochzeit)));
  const stopps = [...new Set(zeiten)].sort((a, b) => b - a);
  const whirlpool = Math.max(0, ...hops.filter((h) => h.art === 'whirlpool').map((h) => Math.round(num(h.zeit))));
  return [
    `R${kochzeit},${rasten.length},${zahl1(k.wasser.hauptguss)},${zahl1(k.wasser.nachguss)},`,
    '0,1,1,0,0,', // kein Wasseraufbereitungs-Hinweis, Nachguss-Zähler und -Hinweis an, kein verzögerter Start
    displayName(rezept.name),
    `${whirlpool},${stopps.length},0,0,`,
    ...stopps.map((t) => `${t},`),
    ...rasten.map((r) => `${zahl1(r.temp)}:${Math.round(num(r.dauer))},`),
  ];
}

export function leererZustand() {
  return {
    verbunden: false,
    verbinde: false,
    geraet: '',
    soll: null,
    ist: null,
    heizung: null,
    pumpe: null,
    automatik: null,
    stufe: null,
    wartet: null,
    wartetCode: null,
    heizleistung: null,
    timerAktiv: null,
    timerPausiert: null,
    restMin: null,
    restSek: null,
    celsius: null,
    firmware: '',
    fehler: '',
    zuletzt: 0,
  };
}

/** Wertet eine Meldung der Steuerung aus und trägt sie in den Zustand ein. Liefert true, wenn erkannt. */
export function verarbeite(zustand, zeile) {
  const text = String(zeile).replace(/[\0\r\n]/g, '').replace(/Z+$/, '').trim();
  if (!text) return false;
  const f = text.slice(1).split(',').map((s) => s.trim());
  const n = (i) => (f[i] === undefined || f[i] === '' || Number.isNaN(Number(f[i])) ? null : Number(f[i]));
  const an = (i) => (n(i) === null ? null : n(i) > 0);
  switch (text[0]) {
    case 'X':
      zustand.soll = n(0);
      zustand.ist = n(1);
      break;
    case 'Y':
      zustand.heizung = an(0);
      zustand.pumpe = an(1);
      zustand.automatik = an(2);
      zustand.wartet = an(4);
      zustand.wartetCode = f[5] ?? null;
      zustand.stufe = n(6);
      break;
    case 'T':
      zustand.timerAktiv = an(0);
      zustand.restMin = n(1);
      zustand.restSek = n(3);
      break;
    case 'W':
      zustand.heizleistung = n(0);
      zustand.timerPausiert = an(1);
      break;
    case 'I':
      zustand.wartetCode = f[0] ?? null;
      break;
    case 'V':
      zustand.celsius = n(1) === null ? null : n(1) === 1;
      break;
    case 'F':
      zustand.firmware = text.slice(1).replace(/,+$/, '');
      break;
    default:
      return false;
  }
  zustand.zuletzt = Date.now();
  return true;
}

// ---------- Verbindung ----------

export const gf = leererZustand();
export const protokoll = []; // letzte gesendete (>) und empfangene (<) Zeilen, für die Fehlersuche
const hoerer = new Set();
let geraet = null;
let schreiber = null;
let leser = null;
let schlange = Promise.resolve();
const dekoder = new TextDecoder();
const enkoder = new TextEncoder();

function melde() {
  for (const h of hoerer) {
    try {
      h(gf);
    } catch (e) {
      console.error(e);
    }
  }
}

/** Meldet Zustandsänderungen. Rückgabewert beendet das Abo. */
export function beobachte(h) {
  hoerer.add(h);
  return () => hoerer.delete(h);
}

function logge(richtung, text) {
  protokoll.push(`${new Date().toLocaleTimeString('de-DE')} ${richtung} ${text}`);
  if (protokoll.length > 80) protokoll.shift();
}

function empfangen(e) {
  const text = dekoder.decode(e.target.value);
  logge('<', text);
  verarbeite(gf, text);
  melde();
}

function getrennt() {
  leser?.removeEventListener('characteristicvaluechanged', empfangen);
  schreiber = null;
  leser = null;
  const name = gf.geraet;
  Object.assign(gf, leererZustand(), { geraet: name });
  logge('!', 'Verbindung getrennt');
  melde();
}

export async function verbinde() {
  if (!unterstuetzt()) throw new Error('Dieser Browser unterstützt kein Web Bluetooth. Bitte Chrome oder Edge verwenden.');
  if (gf.verbunden || gf.verbinde) return;
  gf.verbinde = true;
  gf.fehler = '';
  melde();
  try {
    geraet = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: 'Grain' }, { services: [GF_SERVICE] }],
      optionalServices: [GF_SERVICE],
    });
    geraet.addEventListener('gattserverdisconnected', getrennt);
    const server = await geraet.gatt.connect();
    const dienst = await server.getPrimaryService(GF_SERVICE);
    leser = await dienst.getCharacteristic(GF_LESEN);
    schreiber = await dienst.getCharacteristic(GF_SCHREIBEN);
    leser.addEventListener('characteristicvaluechanged', empfangen);
    await leser.startNotifications();
    gf.verbunden = true;
    gf.geraet = geraet.name || 'Grainfather';
    // Bewusst kein Befehl beim Verbinden: Die Steuerung meldet ihren Zustand von selbst.
    // Automatische Abfragen direkt nach dem Verbinden haben am Gerät einen Dauerton ausgelöst.
    logge('!', `Verbunden mit ${gf.geraet} (Schreiben: ${schreibart()})`);
  } catch (e) {
    // Abbruch der Geräteauswahl ist kein Fehler.
    if (e?.name !== 'NotFoundError') gf.fehler = e?.message || String(e);
    try {
      geraet?.gatt?.disconnect();
    } catch {
      /* war nicht verbunden */
    }
    throw e;
  } finally {
    gf.verbinde = false;
    melde();
  }
}

export function trenne() {
  try {
    geraet?.gatt?.disconnect();
  } catch {
    /* bereits getrennt */
  }
}

function schreibart() {
  if (!schreiber) return 'nicht verbunden';
  return schreiber.properties?.writeWithoutResponse && schreiber.writeValueWithoutResponse ? 'ohne Antwort' : 'mit Antwort';
}

/** Sendet einen Befehl. Befehle werden nacheinander abgearbeitet. */
export function sende(befehl) {
  const daten = enkoder.encode(paket(befehl));
  const auftrag = schlange.then(async () => {
    if (!schreiber) throw new Error('Der Grainfather ist nicht verbunden.');
    logge('>', befehl);
    // Das Referenzbeispiel der Protokollbeschreibung schreibt ohne Antwort („write without response“).
    if (schreibart() === 'ohne Antwort') await schreiber.writeValueWithoutResponse(daten);
    else if (schreiber.writeValueWithResponse) await schreiber.writeValueWithResponse(daten);
    else await schreiber.writeValue(daten);
  });
  // Ein fehlgeschlagener Befehl darf die folgenden nicht blockieren.
  schlange = auftrag.catch(() => {});
  return auftrag;
}

export async function sendeRezept(rezept, anlage) {
  for (const zeile of rezeptBefehle(rezept, anlage)) await sende(zeile);
}

/** Nur für Tests: Meldung der Steuerung einspielen, ohne dass ein Gerät verbunden ist. */
export function simuliere(zeile, verbunden = true) {
  gf.verbunden = verbunden;
  gf.geraet ||= 'Simulation';
  if (zeile) {
    logge('<', zeile);
    verarbeite(gf, zeile);
  }
  melde();
}
