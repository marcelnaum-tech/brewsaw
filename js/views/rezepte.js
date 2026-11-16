import { kennzahlen, hefeEmpfehlung, num } from '../calc.js';
import { KATEGORIEN, HOPFEN_ARTEN, kategorieName } from '../data.js';
import { BIBLIOTHEK, QUELLEN } from '../bibliothek.js';
import { filtere, filterAktiv, FARBEN, BITTERE, STAERKE } from '../suche.js';
import { leseBeerXml } from '../beerxml.js';
import { state, neuesRezept, uebernehmeAusBibliothek, importiereRezepte } from '../store.js';
import { esc, fmt, sg, dialog, toast } from '../ui.js';
import { bild } from '../bilder.js';

// Suchzustand bleibt erhalten, wenn man aus einem Rezept zurückkommt.
const f = { tab: 'meine', q: '', kat: '', quelle: '', farbe: '', bittere: '', staerke: '', sort: '' };

// Die Bibliothek ändert sich nicht – Kennzahlen nur einmal berechnen.
let bibCache = null;
let bibVerdampfung = null;
const bibliothek = () => {
  const verdampfungLh = num(state.settings.anlage.verdampfungLh);
  if (!bibCache || bibVerdampfung !== verdampfungLh) {
    bibVerdampfung = verdampfungLh;
    bibCache = BIBLIOTHEK.map((r) => ({ r, k: kennzahlen(r, { verdampfungLh }) }));
  }
  return bibCache;
};

const optionen = (liste, wert, leer) =>
  `<option value="">${esc(leer)}</option>` +
  liste.map(([k, n]) => `<option value="${k}" ${k === wert ? 'selected' : ''}>${esc(n)}</option>`).join('');

const tagListe = (tags) =>
  String(tags || '').split(/[,.;]+/).map((t) => t.trim()).filter(Boolean);

export function rezepteView(root) {
  const meine = () => state.rezepte.map((r) => ({ r, k: kennzahlen(r, state.settings.anlage) }));

  const karte = ({ r, k }, bib) => `
    <a class="card karte" href="${bib ? '#' : '#/rezept/' + r.id}" ${bib ? `data-bib="${r.id}"` : ''}>
      ${bild(r.bildId) ? `<img class="karten-bild" src="${bild(r.bildId)}" alt="">` : `<span class="glas" style="--bier:${k.farbe}" aria-hidden="true"></span>`}
      <span class="karte-text">
        <strong>${esc(r.name || 'Ohne Namen')}${r.quelle === 'brewdog' ? ' <span class="badge quelle">BrewDog</span>' : ''}</strong>
        <span class="muted">${esc(r.stil || kategorieName(r.kategorie) || 'Kein Bierstil angegeben')}</span>
        <span class="werte">
          <span>${fmt(k.sw)} °P · ${sg(k.sw)}</span><span>${fmt(k.ibu, 0)} IBU</span>
          <span>${fmt(k.ebc, 0)} EBC</span><span>${fmt(k.abv)} % vol</span>
        </span>
        ${tagListe(r.tags).length ? `<span class="tags">${tagListe(r.tags).map((t) => `<button type="button" class="tag" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</span>` : ''}
      </span></a>`;

  const zeichneListe = () => {
    const eigene = filtere(meine(), { ...f, sort: f.sort || 'neu' });
    const bib = filtere(bibliothek(), f);
    const zeigeBib = f.tab === 'bibliothek';
    const liste = zeigeBib ? bib : eigene;
    const gesamt = zeigeBib ? BIBLIOTHEK.length : state.rezepte.length;

    root.querySelector('#tab-meine').textContent = `Meine Rezepte (${eigene.length})`;
    root.querySelector('#tab-bib').textContent = `Bibliothek (${bib.length})`;
    root.querySelectorAll('.tabs button').forEach((b) => {
      const an = b.dataset.tab === f.tab;
      b.classList.toggle('aktiv', an);
      b.setAttribute('aria-selected', an);
    });
    root.querySelector('#reset').hidden = !filterAktiv(f);
    root.querySelector('#anzahl').textContent = filterAktiv(f)
      ? `${liste.length} von ${gesamt} Rezepten gefunden`
      : zeigeBib
        ? `${gesamt} Rezepte – antippen zum Ansehen und Übernehmen`
        : `${gesamt} Rezept${gesamt === 1 ? '' : 'e'}`;

    let html;
    if (!liste.length) {
      const andere = zeigeBib ? eigene.length : bib.length;
      html = `<div class="card leer"><p>${
        gesamt ? 'Kein Rezept passt zu dieser Suche.' : 'Noch keine eigenen Rezepte vorhanden.'
      }</p>
      ${andere && filterAktiv(f) ? `<p class="muted">${andere} Treffer in „${zeigeBib ? 'Meine Rezepte' : 'Bibliothek'}“.</p><button class="btn" data-tab="${zeigeBib ? 'meine' : 'bibliothek'}">Dort ansehen</button>` : ''}
      ${!gesamt && !zeigeBib ? `<button class="btn primary" data-tab="bibliothek">Bibliothek durchstöbern</button>` : ''}</div>`;
    } else if (!f.sort && zeigeBib) {
      // Standardansicht der Bibliothek: nach Kategorie gruppiert
      html = KATEGORIEN.map(([key, name]) => {
        const gruppe = liste.filter((e) => e.r.kategorie === key);
        return gruppe.length ? `<h2 class="gruppe">${esc(name)}</h2><div class="karten">${gruppe.map((e) => karte(e, true)).join('')}</div>` : '';
      }).join('');
    } else {
      html = `<div class="karten">${liste.map((e) => karte(e, zeigeBib)).join('')}</div>`;
    }
    root.querySelector('#liste').innerHTML = html;
  };

  const zeichne = () => {
    root.innerHTML = `
      <header class="kopf">
        <div><h1>Rezepte</h1></div>
        <div class="leiste oben">
          <button class="btn" data-act="import">Importieren …</button>
          <input type="file" id="datei" accept=".xml,.beerxml,text/xml,application/xml" hidden>
          <button class="btn primary" data-act="neu">+ Neues Rezept</button>
        </div>
      </header>

      <div class="tabs" role="tablist">
        <button role="tab" id="tab-meine" data-tab="meine"></button>
        <button role="tab" id="tab-bib" data-tab="bibliothek"></button>
      </div>

      <section class="card suche">
        <input type="search" id="q" value="${esc(f.q)}" placeholder="Suchen nach Name, Stil, Zutat oder Tag – z. B. „weizen citra“" aria-label="Rezepte durchsuchen" autocomplete="off">
        <div class="filter">
          <select id="kat" aria-label="Kategorie">${optionen(KATEGORIEN, f.kat, 'Alle Kategorien')}</select>
          <select id="quelle" aria-label="Quelle">${optionen(QUELLEN, f.quelle, 'Alle Quellen')}</select>
          <select id="farbe" aria-label="Farbe">${optionen(FARBEN, f.farbe, 'Jede Farbe')}</select>
          <select id="bittere" aria-label="Bittere">${optionen(BITTERE, f.bittere, 'Jede Bittere')}</select>
          <select id="staerke" aria-label="Alkoholgehalt">${optionen(STAERKE, f.staerke, 'Jede Stärke')}</select>
          <select id="sort" aria-label="Sortierung">${optionen(
            [['name', 'Sortiert nach Name'], ['stil', 'Sortiert nach Stil'], ['sw', 'Stammwürze aufsteigend'], ['ibu', 'Bittere aufsteigend'], ['ebc', 'Farbe hell → dunkel'], ['abv', 'Alkohol aufsteigend']],
            f.sort,
            'Standardsortierung',
          )}</select>
        </div>
        <p class="muted zeile"><span id="anzahl"></span> <button class="link" id="reset" data-act="reset" hidden>Filter zurücksetzen</button></p>
      </section>

      <div id="liste"></div>`;
    zeichneListe();
  };

  const vorschau = async (id) => {
    const eintrag = bibliothek().find((e) => e.r.id === id);
    if (!eintrag) return;
    const { r, k } = eintrag;
    const a = state.settings.anlage;
    const hopfen = (h) => {
      const art = HOPFEN_ARTEN.find(([key]) => key === h.art)?.[1];
      const wann = h.art === 'stopfen' ? `${h.zeit} Tage` : h.art === 'vwh' ? '' : `${h.zeit} min`;
      return `<li>${fmt(h.g, 0)} g ${esc(h.name)} – ${esc(art)}${wann ? ', ' + wann : ''}</li>`;
    };
    const d = await dialog({
      titel: r.name,
      html: `<p class="muted">${esc(r.stil)} · ${esc(kategorieName(r.kategorie))}</p>
        <div class="kzs klein">
          <div class="kz"><span class="kz-l">Stammwürze</span><span class="kz-w">${fmt(k.sw)}<small> °P</small></span><span class="kz-n">${sg(k.sw)}</span></div>
          <div class="kz"><span class="kz-l">Bittere</span><span class="kz-w">${fmt(k.ibu, 0)}<small> IBU</small></span></div>
          <div class="kz"><span class="kz-l">Farbe</span><span class="kz-w">${fmt(k.ebc, 0)}<small> EBC</small></span><i class="farbe" style="background:${k.farbe}"></i></div>
          <div class="kz"><span class="kz-l">Alkohol</span><span class="kz-w">${fmt(k.abv)}<small> % vol</small></span></div>
        </div>
        <p>${esc(r.notizen)}</p>
        <h3>Schüttung (für ${fmt(r.ausschlagL, 0)} l)</h3>
        <ul>${r.malts.map((m) => `<li>${fmt(m.kg, 2)} kg ${esc(m.name)}</li>`).join('')}</ul>
        <h3>Hopfen</h3><ul>${r.hops.map(hopfen).join('')}</ul>
        <h3>Hefe</h3><p>${hefeEmpfehlung(r.ausschlagL, k.sw, r.hefe).pakete} Pkg. ${esc(r.hefe.name)} · ${fmt(r.hefe.temp, 0)} °C</p>
        <h3>Maischplan</h3>
        <ul><li>Einmaischen bei ${r.einmaischTemp} °C</li>${r.rasten.map((x) => `<li>${esc(x.name)}: ${x.temp} °C, ${x.dauer} min</li>`).join('')}</ul>
        ${r.quelle === 'brewdog' ? `<p class="hinweis">Rezept aus BrewDogs „DIY Dog“ (frei für nicht-kommerzielle Nutzung). BrewDog nennt keine Alphasäuren und Malzfarben – die App rechnet mit typischen Werten, daher können Bittere und Farbe von BrewDogs Angabe abweichen.</p>` : ''}
        <p class="hinweis">Beim Übernehmen wird das Rezept auf deine Anlage umgerechnet
          (${fmt(num(a.ausschlagL), 0)} l, ${fmt(num(a.sha), 0)} % Sudhausausbeute) und lässt sich danach frei bearbeiten.</p>`,
      ok: 'In meine Rezepte übernehmen',
      abbrechen: 'Schließen',
    });
    if (!d) return;
    const neu = uebernehmeAusBibliothek(r);
    toast(`„${neu.name}“ wurde übernommen.`);
    location.hash = '#/rezept/' + neu.id;
  };

  root.addEventListener('input', (e) => {
    if (e.target.id !== 'q') return;
    f.q = e.target.value;
    zeichneListe();
  });

  root.addEventListener('change', async (e) => {
    const id = e.target.id;
    if (['kat', 'quelle', 'farbe', 'bittere', 'staerke', 'sort'].includes(id)) {
      f[id] = e.target.value;
      zeichneListe();
      return;
    }
    if (id !== 'datei' || !e.target.files[0]) return;
    const datei = e.target.files[0];
    e.target.value = '';
    try {
      const neu = importiereRezepte(leseBeerXml(await datei.text()));
      Object.assign(f, { tab: 'meine', q: '', kat: '', quelle: '', farbe: '', bittere: '', staerke: '' });
      if (neu.length === 1) location.hash = '#/rezept/' + neu[0].id;
      else zeichne();
      toast(neu.length === 1 ? `„${neu[0].name}“ wurde importiert.` : `${neu.length} Rezepte wurden importiert.`);
    } catch (err) {
      toast('Import fehlgeschlagen: ' + (err.message || 'ungültige Datei'), { art: 'fehler', dauer: 6000 });
    }
  });

  root.addEventListener('click', (e) => {
    const tag = e.target.closest('[data-tag]');
    if (tag) {
      // Klick auf ein Tag sucht danach, statt die Karte zu öffnen.
      e.preventDefault();
      f.q = tag.dataset.tag;
      root.querySelector('#q').value = f.q;
      zeichneListe();
      return;
    }
    const bib = e.target.closest('[data-bib]');
    if (bib) {
      e.preventDefault();
      vorschau(bib.dataset.bib);
      return;
    }
    const tab = e.target.closest('[data-tab]');
    if (tab) {
      f.tab = tab.dataset.tab;
      zeichneListe();
      return;
    }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'neu') location.hash = '#/rezept/' + neuesRezept().id;
    if (act === 'import') root.querySelector('#datei').click();
    if (act === 'reset') {
      Object.assign(f, { q: '', kat: '', quelle: '', farbe: '', bittere: '', staerke: '' });
      zeichne();
      root.querySelector('#q').focus();
    }
  });

  zeichne();
}
