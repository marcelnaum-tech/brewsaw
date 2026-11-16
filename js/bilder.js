// Etiketten und Bilder zu Rezepten.
// Bilder liegen in der IndexedDB des Browsers (nicht im localStorage, dessen Platz für Bilder
// zu knapp ist) und zusätzlich im Arbeitsspeicher, damit Ansichten sie sofort anzeigen können.

const DB_NAME = 'brewsaw';
const STORE = 'bilder';
const speicher = new Map(); // Kennung → Data-URL
let db = null;

function oeffne() {
  return new Promise((resolve, reject) => {
    const anfrage = indexedDB.open(DB_NAME, 1);
    anfrage.onupgradeneeded = () => anfrage.result.createObjectStore(STORE);
    anfrage.onsuccess = () => resolve(anfrage.result);
    anfrage.onerror = () => reject(anfrage.error);
  });
}

function schreibe(aktion) {
  if (!db) return Promise.resolve();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    aktion(tx.objectStore(STORE));
    tx.oncomplete = () => resolve();
    tx.onerror = tx.onabort = () => {
      console.error('Bild konnte nicht gespeichert werden', tx.error);
      resolve();
    };
  });
}

/** Lädt alle gespeicherten Bilder. Einmal beim Start der App aufrufen. */
export async function ladeBilder() {
  try {
    db = await oeffne();
    await new Promise((resolve, reject) => {
      const zeiger = db.transaction(STORE).objectStore(STORE).openCursor();
      zeiger.onsuccess = () => {
        const c = zeiger.result;
        if (!c) return resolve();
        speicher.set(c.key, c.value);
        c.continue();
      };
      zeiger.onerror = () => reject(zeiger.error);
    });
  } catch (e) {
    // Ohne IndexedDB (z. B. privates Fenster) bleiben Bilder nur bis zum Schließen erhalten.
    console.warn('Bildspeicher nicht verfügbar', e);
  }
}

export const bild = (id) => (id && speicher.get(id)) || '';

export function setzeBild(id, dataUrl) {
  speicher.set(id, dataUrl);
  return schreibe((s) => s.put(dataUrl, id));
}

export function loescheBild(id) {
  speicher.delete(id);
  return schreibe((s) => s.delete(id));
}

/** Entfernt alle Bilder, deren Kennung nicht mehr verwendet wird. */
export function raeumeAuf(benutzt) {
  const weg = [...speicher.keys()].filter((id) => !benutzt.has(id));
  for (const id of weg) speicher.delete(id);
  return weg.length ? schreibe((s) => weg.forEach((id) => s.delete(id))) : Promise.resolve();
}

export const alleBilder = () => Object.fromEntries(speicher);

/** Ersetzt den gesamten Bildbestand (beim Einlesen einer Sicherung oder beim Zurücksetzen). */
export function ersetzeBilder(bilder = {}) {
  speicher.clear();
  for (const [id, url] of Object.entries(bilder)) if (typeof url === 'string' && url.startsWith('data:image/')) speicher.set(id, url);
  return schreibe((s) => {
    s.clear();
    for (const [id, url] of speicher) s.put(url, id);
  });
}

/**
 * Liest eine Bilddatei ein und verkleinert sie auf höchstens `max` Pixel Kantenlänge.
 * Ergebnis ist ein JPEG als Data-URL (transparente Flächen werden weiß).
 */
export async function bildAusDatei(datei, max = 1000) {
  if (!datei.type.startsWith('image/')) throw new Error('Die Datei ist kein Bild.');
  const url = URL.createObjectURL(datei);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Das Bild konnte nicht gelesen werden.'));
      el.src = url;
    });
    const faktor = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * faktor));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * faktor));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}
