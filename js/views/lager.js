import { num } from '../calc.js';
import { MALZE, HOPFEN, HEFEN, LAGER_ARTEN } from '../data.js';
import { state, speichern, uid } from '../store.js';
import { esc, bind, inp, datalist, bestaetigen } from '../ui.js';

const VORSCHLAEGE = { malz: MALZE, hopfen: HOPFEN, hefe: HEFEN, sonstiges: [] };
const gleich = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

export function lagerView(root) {
  // Felder werden über den Index im Lager gebunden.
  const modell = { get l() { return state.lager; } };

  const zeile = (p) => {
    const i = state.lager.indexOf(p);
    const [, , einheit] = LAGER_ARTEN.find(([k]) => k === p.art);
    const leer = !(num(p.menge) > 0);
    return `<div class="zrow ${leer ? 'leer-posten' : ''}">
      ${inp('Bezeichnung', `l.${i}.name`, p.name, { type: 'text', cls: 'wide', list: 'dl-' + p.art, ph: 'Name' })}
      ${inp('Bestand', `l.${i}.menge`, p.menge, { unit: einheit || p.einheit || '', step: p.art === 'malz' ? '0.01' : '1' })}
      ${p.art === 'malz' ? inp('Farbe', `l.${i}.ebc`, p.ebc, { unit: 'EBC' }) : ''}
      ${p.art === 'hopfen' ? inp('Alpha', `l.${i}.alpha`, p.alpha, { unit: '%' }) : ''}
      ${p.art === 'sonstiges' ? inp('Einheit', `l.${i}.einheit`, p.einheit, { type: 'text', ph: 'g, Stk. …' }) : ''}
      ${inp('Haltbar bis', `l.${i}.mhd`, p.mhd, { type: 'date' })}
      <button class="btn icon" data-act="weg" data-id="${p.id}" aria-label="Posten entfernen">✕</button>
    </div>`;
  };

  const zeichne = () => {
    const y = scrollY;
    root.innerHTML = `
      ${LAGER_ARTEN.map(([art]) => datalist('dl-' + art, VORSCHLAEGE[art].map((v) => v.name))).join('')}
      <header class="kopf"><div><h1>Zutatenlager</h1><p class="muted">Bestand an Malz, Hopfen, Hefe und Zubehör</p></div></header>
      ${LAGER_ARTEN.map(([art, name]) => {
        const posten = state.lager.filter((p) => p.art === art);
        return `<section class="card">
          <h2>${name}</h2>
          ${posten.map(zeile).join('') || '<p class="muted">Nichts eingetragen.</p>'}
          <div class="leiste"><button class="btn" data-act="neu" data-art="${art}">+ ${name}</button></div>
        </section>`;
      }).join('')}
      <p class="hinweis">Beim Anlegen eines Suds kannst du die Zutaten automatisch abbuchen lassen. Zugeordnet wird über den Namen – er muss mit dem Namen im Rezept übereinstimmen.</p>`;
    scrollTo(0, y);
  };

  bind(root, modell, (pfad, wert, typ, el) => {
    const m = pfad.match(/^l\.(\d+)\.(\w+)$/);
    const p = m && state.lager[m[1]];
    if (p && typ === 'change' && m[2] === 'name') {
      // Typische Werte aus den Stammdaten vorschlagen
      const db = VORSCHLAEGE[p.art].find((v) => gleich(v.name, p.name));
      const setze = (feld, w) => {
        p[feld] = w;
        const f = el.closest('.zrow').querySelector(`[data-f="l.${m[1]}.${feld}"]`);
        if (f) f.value = w;
      };
      if (db && p.art === 'malz') setze('ebc', db.ebc);
      if (db && p.art === 'hopfen') setze('alpha', db.alpha);
    }
    if (p && m[2] === 'menge') el.closest('.zrow').classList.toggle('leer-posten', !(num(wert) > 0));
    speichern();
  });

  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'neu') {
      const art = b.dataset.art;
      state.lager.push({ id: uid(), art, name: '', menge: art === 'hefe' ? 1 : '', einheit: '', ebc: '', alpha: '', mhd: '' });
    } else if (b.dataset.act === 'weg') {
      const p = state.lager.find((x) => x.id === b.dataset.id);
      if (p?.name && !(await bestaetigen('Posten entfernen?', `„${p.name}“ wird aus dem Lager gelöscht.`, 'Entfernen'))) return;
      state.lager.splice(state.lager.indexOf(p), 1);
    } else return;
    speichern();
    zeichne();
    if (b.dataset.act === 'neu') {
      const felder = root.querySelectorAll(`[data-f="l.${state.lager.length - 1}.name"]`);
      felder[0]?.focus();
    }
  });

  zeichne();
}
