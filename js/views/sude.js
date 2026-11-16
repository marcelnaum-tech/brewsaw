import { kennzahlen, num, alkohol, ebcHex } from '../calc.js';
import { STATUS } from '../data.js';
import { state } from '../store.js';
import { esc, fmt, datumDe } from '../ui.js';
import { bild } from '../bilder.js';

export const statusName = (s) => STATUS.find(([k]) => k === s)?.[1] || s;

/** Aktuelle Ist-Werte eines Suds aus Mess- und Gärdaten. */
export function sudWerte(sud) {
  const k = kennzahlen(sud.rezept, sud.anlage);
  const messungen = [...(sud.gaerung || [])]
    .filter((g) => g.datum && g.plato !== '' && g.plato != null)
    .sort((a, b) => a.datum.localeCompare(b.datum));
  const swIst = sud.mess.stammwuerzeP !== '' && sud.mess.stammwuerzeP != null ? num(sud.mess.stammwuerzeP) : null;
  const sw = swIst ?? (messungen.length ? num(messungen[0].plato) : null);
  const letzte = messungen.length > (swIst == null ? 1 : 0) ? messungen[messungen.length - 1] : null;
  const rest = letzte && sw != null && num(letzte.plato) < sw ? num(letzte.plato) : null;
  const alk = sw != null && rest != null ? alkohol(sw, rest) : null;
  return { k, messungen, swIst, sw, rest, alk };
}

export function sudeView(root) {
  const karte = (sud) => {
    const w = sudWerte(sud);
    return `<a class="card karte" href="#/sud/${sud.id}">
      ${bild(sud.rezept.bildId) ? `<img class="karten-bild" src="${bild(sud.rezept.bildId)}" alt="">` : `<span class="glas" style="--bier:${ebcHex(w.k.ebc)}" aria-hidden="true"></span>`}
      <span class="karte-text">
        <strong>#${sud.nr} ${esc(sud.name)}</strong>
        <span class="muted">${datumDe(sud.datum)} · <span class="badge s-${sud.status}">${esc(statusName(sud.status))}</span></span>
        <span class="werte">
          <span>${fmt(w.sw ?? w.k.sw)} °P${w.sw == null ? ' (Soll)' : ''}</span>
          ${w.alk ? `<span>${fmt(w.alk.abv)} % vol</span><span>EVG ${fmt(w.alk.evg, 0)} %</span>` : ''}
        </span>
      </span></a>`;
  };

  const aktiv = state.sude.filter((s) => s.status !== 'fertig');
  const fertig = state.sude.filter((s) => s.status === 'fertig');
  root.innerHTML = `
    <header class="kopf"><div><h1>Sude</h1><p class="muted">Brautage, Gärverläufe und Protokolle</p></div></header>
    ${
      state.sude.length
        ? `${aktiv.length ? `<h2 class="gruppe">Aktuell</h2><div class="karten">${aktiv.map(karte).join('')}</div>` : ''}
           ${fertig.length ? `<h2 class="gruppe">Abgeschlossen</h2><div class="karten">${fertig.map(karte).join('')}</div>` : ''}`
        : `<div class="card leer"><p>Noch kein Sud angelegt.</p><p class="muted">Öffne ein Rezept und wähle „Sud starten“.</p>
           <a class="btn primary" href="#/rezepte">Zu den Rezepten</a></div>`
    }`;
}
