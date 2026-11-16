import { kennzahlen, extraktInWuerze, hefeEmpfehlung, HEFE_PAKET_G, num, runde } from '../calc.js';
import { MALZE, HOPFEN, HEFEN, HOPFEN_ARTEN, KATEGORIEN } from '../data.js';
import { state, speichern, heute, uid, neuerSud, dupliziereRezept, loescheRezept, bedarf, abbuchen, bilderAufraeumen } from '../store.js';
import { bild, setzeBild, bildAusDatei } from '../bilder.js';
import { esc, fmt, sg, bind, inp, sel, datalist, kachel, dialog, bestaetigen, toast } from '../ui.js';

const gleich = (a, b) => String(a).trim().toLowerCase() === String(b).trim().toLowerCase();

export function rezeptView(root, id) {
  const r = state.rezepte.find((x) => x.id === id);
  if (!r) {
    root.innerHTML = `<div class="card leer"><p>Dieses Rezept gibt es nicht (mehr).</p><a class="btn" href="#/rezepte">Zu den Rezepten</a></div>`;
    return;
  }

  const lagerNamen = (art) => state.lager.filter((l) => l.art === art).map((l) => l.name);

  const malzZeile = (m, i) => `
    <div class="zrow">
      ${inp('Malz', `malts.${i}.name`, m.name, { type: 'text', list: 'dl-malz', cls: 'wide', ph: 'Malz wählen oder eingeben' })}
      ${inp('Menge', `malts.${i}.kg`, m.kg, { unit: 'kg', step: '0.01' })}
      ${inp('Farbe', `malts.${i}.ebc`, m.ebc, { unit: 'EBC' })}
      ${inp('Extrakt', `malts.${i}.potential`, m.potential, { unit: '%' })}
      <div class="out"><span>Anteil</span><output data-out="malz-${i}">–</output></div>
      <button class="btn icon" data-act="malz-weg" data-i="${i}" aria-label="Malz entfernen">✕</button>
    </div>`;

  const zeitFeld = (h, i) => {
    if (h.art === 'vwh') return `<div class="out"><span>Zeit</span><output>ganze Kochzeit</output></div>`;
    if (h.art === 'whirlpool')
      return (
        inp('Dauer', `hops.${i}.zeit`, h.zeit, { unit: 'min' }) +
        inp('Temperatur', `hops.${i}.temp`, h.temp ?? 85, { unit: '°C' })
      );
    if (h.art === 'stopfen') return inp('Dauer', `hops.${i}.zeit`, h.zeit, { unit: 'Tage' });
    return inp('Kochdauer', `hops.${i}.zeit`, h.zeit, { unit: 'min' });
  };

  const hopfenZeile = (h, i) => `
    <div class="zrow">
      ${inp('Hopfen', `hops.${i}.name`, h.name, { type: 'text', list: 'dl-hopfen', cls: 'wide', ph: 'Hopfen wählen oder eingeben' })}
      ${inp('Menge', `hops.${i}.g`, h.g, { unit: 'g' })}
      ${inp('Alpha', `hops.${i}.alpha`, h.alpha, { unit: '%' })}
      ${sel('Gabe', `hops.${i}.art`, h.art, HOPFEN_ARTEN)}
      ${zeitFeld(h, i)}
      ${sel('Form', `hops.${i}.form`, h.form || 'pellets', [['pellets', 'Pellets'], ['dolden', 'Dolden']])}
      <div class="out"><span>Bittere</span><output data-out="hopfen-${i}">–</output></div>
      <button class="btn icon" data-act="hopfen-weg" data-i="${i}" aria-label="Hopfen entfernen">✕</button>
    </div>`;

  const rastZeile = (ra, i) => `
    <div class="zrow">
      ${inp('Rast', `rasten.${i}.name`, ra.name, { type: 'text', cls: 'wide', ph: 'z. B. Maltoserast' })}
      ${inp('Temperatur', `rasten.${i}.temp`, ra.temp, { unit: '°C' })}
      ${inp('Dauer', `rasten.${i}.dauer`, ra.dauer, { unit: 'min' })}
      <button class="btn icon" data-act="rast-weg" data-i="${i}" aria-label="Rast entfernen">✕</button>
    </div>`;

  const zeichne = () => {
    const y = scrollY;
    root.innerHTML = `
      ${datalist('dl-malz', [...lagerNamen('malz'), ...MALZE.map((m) => m.name)])}
      ${datalist('dl-hopfen', [...lagerNamen('hopfen'), ...HOPFEN.map((h) => h.name)])}
      ${datalist('dl-hefe', [...lagerNamen('hefe'), ...HEFEN.map((h) => h.name)])}
      <a class="zurueck" href="#/rezepte">‹ Rezepte</a>
      <header class="kopf">
        <div class="titel-felder">
          <input class="titel" data-f="name" value="${esc(r.name)}" aria-label="Rezeptname" placeholder="Rezeptname">
          <input class="untertitel" data-f="stil" value="${esc(r.stil)}" aria-label="Bierstil" placeholder="Bierstil, z. B. Helles">
        </div>
        <button class="btn primary" data-act="sud">Sud starten</button>
      </header>

      <section class="card sticky"><div class="kzs" id="kz"></div><div id="warn"></div></section>

      <section class="card etikett">
        ${
          bild(r.bildId)
            ? `<button class="etikett-bild" data-act="bild-zeigen" aria-label="Etikett vergrößern"><img src="${bild(r.bildId)}" alt="Etikett von ${esc(r.name)}"></button>`
            : `<div class="etikett-bild leer" aria-hidden="true">🏷️</div>`
        }
        <div class="etikett-text">
          <h2>Etikett / Bild</h2>
          <p class="hinweis">Etikett, Foto vom fertigen Bier oder ein anderes Bild. Es erscheint in der Rezeptliste und bei den Suden dieses Rezepts.</p>
          <div class="leiste">
            <button class="btn" data-act="bild-waehlen">${bild(r.bildId) ? 'Bild ersetzen …' : 'Bild wählen …'}</button>
            ${bild(r.bildId) ? '<button class="btn ghost" data-act="bild-weg">Entfernen</button>' : ''}
            <input type="file" id="bilddatei" accept="image/*" hidden>
          </div>
        </div>
      </section>

      <section class="card">
        <h2>Eckdaten</h2>
        <div class="felder">
          ${inp('Ausschlagmenge', 'ausschlagL', r.ausschlagL, { unit: 'l' })}
          ${inp('Sudhausausbeute', 'sha', r.sha, { unit: '%' })}
          ${inp('Kochzeit', 'kochzeit', r.kochzeit, { unit: 'min' })}
          ${inp('Hauptguss', 'hauptgussLkg', r.hauptgussLkg, { unit: 'l/kg' })}
          ${sel('Kategorie', 'kategorie', r.kategorie, [['', '– keine –'], ...KATEGORIEN])}
          ${inp('Tags (mit Komma getrennt)', 'tags', r.tags, { type: 'text', cls: 'wide', ph: 'z. B. sommer, hopfig' })}
        </div>
        <div class="kzs klein" id="wasser"></div>
        <p class="hinweis">Ausschlagmenge = kalte Würze im Kessel nach dem Kochen.
          <a href="#/wasser/${r.id}">Wasseraufbereitung berechnen ›</a></p>
      </section>

      <section class="card">
        <h2>Schüttung</h2>
        ${r.malts.map(malzZeile).join('') || '<p class="muted">Noch kein Malz eingetragen.</p>'}
        <div class="leiste">
          <button class="btn" data-act="malz-neu">+ Malz</button>
          <button class="btn ghost" data-act="skalieren">Rezept skalieren …</button>
        </div>
      </section>

      <section class="card">
        <h2>Hopfen</h2>
        ${r.hops.map(hopfenZeile).join('') || '<p class="muted">Noch kein Hopfen eingetragen.</p>'}
        <div class="leiste"><button class="btn" data-act="hopfen-neu">+ Hopfen</button></div>
      </section>

      <section class="card">
        <h2>Hefe</h2>
        <div class="zrow">
          ${inp('Hefe', 'hefe.name', r.hefe.name, { type: 'text', list: 'dl-hefe', cls: 'wide', ph: 'Hefe wählen oder eingeben' })}
          ${inp('Menge', 'hefe.menge', r.hefe.menge, { step: '0.5' })}
          ${sel('Einheit', 'hefe.einheit', r.hefe.einheit || 'Pkg.', [['Pkg.', 'Päckchen'], ['g', 'Gramm'], ['ml', 'Milliliter']])}
          ${inp('Vergärungsgrad', 'hefe.evg', r.hefe.evg, { unit: '%' })}
          ${inp('Gärtemperatur', 'hefe.temp', r.hefe.temp, { unit: '°C' })}
        </div>
        <p class="hinweis" id="hefe-hinweis"></p>
      </section>

      <section class="card">
        <h2>Maischplan</h2>
        <div class="felder">${inp('Einmaischen bei', 'einmaischTemp', r.einmaischTemp, { unit: '°C' })}</div>
        ${r.rasten.map(rastZeile).join('')}
        <div class="leiste"><button class="btn" data-act="rast-neu">+ Rast</button></div>
      </section>

      <section class="card">
        <h2>Notizen</h2>
        <textarea data-f="notizen" rows="4" placeholder="Hinweise zu Gärführung, Lagerung, Besonderheiten …">${esc(r.notizen)}</textarea>
      </section>

      <div class="leiste ende">
        <button class="btn" data-act="lager">Lagerbestand prüfen</button>
        <button class="btn" data-act="kopie">Duplizieren</button>
        <button class="btn danger ghost" data-act="loeschen">Rezept löschen</button>
      </div>`;
    aktualisiere();
    scrollTo(0, y);
  };

  const aktualisiere = () => {
    const k = kennzahlen(r, state.settings.anlage);
    const w = k.wasser;
    root.querySelector('#kz').innerHTML =
      kachel('Stammwürze', fmt(k.sw), '°P', `<span class="kz-n">${sg(k.sw)}</span>`) +
      kachel('Bittere', fmt(k.ibu, 0), 'IBU') +
      kachel('Farbe', fmt(k.ebc, 0), 'EBC', `<i class="farbe" style="background:${k.farbe}"></i>`) +
      kachel('Alkohol', fmt(k.abv), '% vol') +
      kachel('Restextrakt', fmt(k.restP), '°P', `<span class="kz-n">${sg(k.restP)}</span>`) +
      kachel('Schüttung', fmt(k.schuettung, 2), 'kg');
    root.querySelector('#wasser').innerHTML =
      kachel('Hauptguss', fmt(w.hauptguss), 'l') +
      kachel('Nachguss', fmt(w.nachguss), 'l') +
      kachel('Gesamtwasser', fmt(w.gesamt), 'l') +
      kachel('Pfannevoll', fmt(w.pfannevollHeiss), 'l heiß') +
      kachel('Im Gärfass', fmt(w.gaerfass), 'l');
    root.querySelector('#warn').innerHTML = k.kesselZuKlein
      ? `<p class="warnung">Achtung: Maische (${fmt(w.maischevolumen)} l) bzw. Pfannevoll-Würze (${fmt(w.pfannevollHeiss)} l) passen nicht in den Kessel (${fmt(num(state.settings.anlage.kesselL), 0)} l).</p>`
      : '';
    const he = hefeEmpfehlung(r.ausschlagL, k.sw, r.hefe);
    const menge = r.hefe.menge === '' || r.hefe.menge == null ? 0 : num(r.hefe.menge);
    const gramm = r.hefe.einheit === 'g' ? menge : r.hefe.einheit === 'ml' ? null : menge * HEFE_PAKET_G;
    const zuWenig = gramm != null && gramm < he.gramm * 0.8;
    root.querySelector('#hefe-hinweis').innerHTML =
      `Richtwert Trockenhefe für ${fmt(num(r.ausschlagL), 0)} l mit ${fmt(k.sw)} °P, ${he.untergaerig ? 'untergärig' : 'obergärig'}: ` +
      `ca. <b>${fmt(he.gramm, 0)} g</b> = ${he.pakete} Päckchen à ${fmt(HEFE_PAKET_G)} g.` +
      (zuWenig ? ' <b class="schlecht">Die eingetragene Menge liegt deutlich darunter.</b>' : '') +
      (r.hefe.einheit === 'ml' ? ' Bei Flüssighefe gilt die Angabe des Herstellers; für Starkbiere einen Starter ansetzen.' : '');
    r.malts.forEach((m, i) => {
      const o = root.querySelector(`[data-out="malz-${i}"]`);
      if (o) o.textContent = k.malzGesamt > 0 ? fmt((num(m.kg) / k.malzGesamt) * 100, 0) + ' %' : '–';
    });
    r.hops.forEach((h, i) => {
      const o = root.querySelector(`[data-out="hopfen-${i}"]`);
      if (o) o.textContent = fmt(k.hopIbus[i]) + ' IBU';
    });
  };

  // Übernimmt Stammdaten, wenn ein bekannter Name gewählt wurde.
  const ausfuellen = (pfad, el) => {
    const zeile = el.closest('.zrow');
    const setze = (obj, feld, wert, basis) => {
      obj[feld] = wert;
      const f = zeile.querySelector(`[data-f="${basis}.${feld}"]`);
      if (f) f.value = wert;
    };
    let m;
    if ((m = pfad.match(/^malts\.(\d+)\.name$/))) {
      const malz = r.malts[m[1]];
      const lager = state.lager.find((l) => l.art === 'malz' && gleich(l.name, malz.name));
      const db = MALZE.find((x) => gleich(x.name, malz.name));
      if (db) {
        setze(malz, 'ebc', num(lager?.ebc) || db.ebc, `malts.${m[1]}`);
        setze(malz, 'potential', db.potential, `malts.${m[1]}`);
        malz.kochzugabe = db.kochzugabe;
        malz.unvergaerbar = db.unvergaerbar;
      } else if (num(lager?.ebc)) setze(malz, 'ebc', num(lager.ebc), `malts.${m[1]}`);
    } else if ((m = pfad.match(/^hops\.(\d+)\.name$/))) {
      const hopfen = r.hops[m[1]];
      const lager = state.lager.find((l) => l.art === 'hopfen' && gleich(l.name, hopfen.name));
      const db = HOPFEN.find((x) => gleich(x.name, hopfen.name));
      const alpha = num(lager?.alpha) || db?.alpha;
      if (alpha) setze(hopfen, 'alpha', alpha, `hops.${m[1]}`);
    } else if (pfad === 'hefe.name') {
      const db = HEFEN.find((x) => gleich(x.name, r.hefe.name));
      if (db) {
        setze(r.hefe, 'evg', db.evg, 'hefe');
        setze(r.hefe, 'temp', db.temp, 'hefe');
      }
    }
  };

  bind(root, r, (pfad, wert, typ, el) => {
    r.geaendert = Date.now();
    if (typ === 'change' && /name$/.test(pfad)) ausfuellen(pfad, el);
    if (typ === 'change' && /^hops\.\d+\.art$/.test(pfad)) {
      const h = r.hops[pfad.split('.')[1]];
      if (wert === 'stopfen') h.zeit = 4;
      else if (wert === 'whirlpool') Object.assign(h, { zeit: 15, temp: 80 });
      else if (wert === 'kochen') h.zeit = 10;
      zeichne();
    } else aktualisiere();
    speichern();
  });

  const skalieren = async () => {
    const k = kennzahlen(r, state.settings.anlage);
    const d = await dialog({
      titel: 'Rezept skalieren',
      html: `<p>Malz und Hopfen werden so umgerechnet, dass Menge und Stärke zum Ziel passen. Die Bittere bleibt annähernd gleich.</p>
        <div class="felder">
          <label class="fld"><span>Ausschlagmenge <em>l</em></span><input name="vol" type="number" step="any" min="1" value="${num(r.ausschlagL)}"></label>
          <label class="fld"><span>Stammwürze <em>°P</em></span><input name="sw" type="number" step="any" min="1" value="${runde(k.sw, 1)}"></label>
        </div>
        <p class="hinweis">Aktuell: ${fmt(k.sw)} °P = ${sg(k.sw)}.</p>`,
      ok: 'Skalieren',
    });
    if (!d) return;
    const vol = num(d.querySelector('[name=vol]').value);
    const sw = num(d.querySelector('[name=sw]').value);
    if (!(vol > 0) || !(sw > 0) || !(k.extrakt > 0)) return toast('Skalieren nicht möglich – bitte Werte prüfen.');
    const fVol = vol / num(r.ausschlagL);
    const fMalz = extraktInWuerze(vol, sw) / k.extrakt;
    r.malts.forEach((m) => (m.kg = runde(num(m.kg) * fMalz, 2)));
    r.hops.forEach((h) => (h.g = runde(num(h.g) * fVol, 0)));
    r.ausschlagL = vol;
    r.geaendert = Date.now();
    speichern();
    zeichne();
    toast('Rezept skaliert.');
  };

  const bedarfTabelle = (liste) =>
    `<table class="tbl"><thead><tr><th>Zutat</th><th class="r">Bedarf</th><th class="r">Im Lager</th></tr></thead><tbody>${liste
      .map(
        (b) =>
          `<tr><td>${esc(b.name)}</td><td class="r">${fmt(b.menge, b.einheit === 'kg' ? 2 : 0)} ${esc(b.einheit)}</td>
           <td class="r ${b.reicht ? 'gut' : 'schlecht'}">${fmt(b.vorhanden, b.einheit === 'kg' ? 2 : 0)} ${esc(b.einheit)} ${b.reicht ? '✓' : '✗'}</td></tr>`,
      )
      .join('')}</tbody></table>`;

  const sudStarten = async () => {
    const liste = bedarf(r);
    const imLager = liste.some((b) => b.vorhanden > 0);
    const d = await dialog({
      titel: 'Neuen Sud anlegen',
      html: `<div class="felder">
          <label class="fld wide"><span>Name des Suds</span><input name="name" type="text" value="${esc(r.name)}"></label>
          <label class="fld"><span>Brautag</span><input name="datum" type="date" value="${heute()}"></label>
        </div>
        ${liste.length ? bedarfTabelle(liste) : ''}
        ${imLager ? `<label class="check"><input name="abbuchen" type="checkbox" checked> Zutaten vom Lager abbuchen</label>` : ''}
        <p class="hinweis">Der Sud bekommt eine eigene Kopie des Rezepts – spätere Rezeptänderungen wirken sich nicht auf ihn aus.</p>`,
      ok: 'Sud anlegen',
    });
    if (!d) return;
    if (d.querySelector('[name=abbuchen]')?.checked) abbuchen(r);
    const sud = neuerSud(r, {
      name: d.querySelector('[name=name]').value.trim(),
      datum: d.querySelector('[name=datum]').value,
    });
    location.hash = '#/sud/' + sud.id;
  };

  root.addEventListener('change', async (e) => {
    if (e.target.id !== 'bilddatei' || !e.target.files[0]) return;
    const datei = e.target.files[0];
    e.target.value = '';
    try {
      const daten = await bildAusDatei(datei);
      // Neue Kennung: bereits angelegte Sude behalten das Etikett, das sie beim Anlegen hatten.
      r.bildId = uid();
      await setzeBild(r.bildId, daten);
      r.geaendert = Date.now();
      speichern();
      bilderAufraeumen();
      zeichne();
      toast('Bild gespeichert.');
    } catch (err) {
      toast(err.message || 'Das Bild konnte nicht gelesen werden.', { art: 'fehler', dauer: 6000 });
    }
  });

  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const i = Number(b.dataset.i);
    switch (b.dataset.act) {
      case 'bild-waehlen':
        root.querySelector('#bilddatei').click();
        return;
      case 'bild-zeigen':
        return dialog({ titel: r.name, html: `<img class="bild-gross" src="${bild(r.bildId)}" alt="Etikett von ${esc(r.name)}">`, ok: 'Schließen', abbrechen: '' });
      case 'bild-weg':
        if (!(await bestaetigen('Bild entfernen?', 'Das Etikett wird von diesem Rezept entfernt.', 'Entfernen'))) return;
        delete r.bildId;
        r.geaendert = Date.now();
        speichern();
        bilderAufraeumen();
        zeichne();
        return;
      case 'malz-neu':
        r.malts.push({ name: '', kg: 1, ebc: 3, potential: 80 });
        break;
      case 'malz-weg':
        r.malts.splice(i, 1);
        break;
      case 'hopfen-neu':
        r.hops.push({ name: '', g: 20, alpha: 5, art: 'kochen', zeit: 60, form: 'pellets' });
        break;
      case 'hopfen-weg':
        r.hops.splice(i, 1);
        break;
      case 'rast-neu':
        r.rasten.push({ name: '', temp: 72, dauer: 20 });
        break;
      case 'rast-weg':
        r.rasten.splice(i, 1);
        break;
      case 'skalieren':
        return skalieren();
      case 'sud':
        return sudStarten();
      case 'lager': {
        const liste = bedarf(r);
        return dialog({
          titel: 'Lagerbestand für dieses Rezept',
          html: liste.length ? bedarfTabelle(liste) : '<p>Das Rezept enthält noch keine Zutaten.</p>',
          abbrechen: '',
        });
      }
      case 'kopie':
        location.hash = '#/rezept/' + dupliziereRezept(r).id;
        return toast('Rezept dupliziert.');
      case 'loeschen':
        if (await bestaetigen('Rezept löschen?', `„${r.name}“ wird endgültig gelöscht. Bereits angelegte Sude bleiben erhalten.`)) {
          loescheRezept(r.id);
          location.hash = '#/rezepte';
        }
        return;
      default:
        return;
    }
    r.geaendert = Date.now();
    speichern();
    zeichne();
  });

  zeichne();
}
