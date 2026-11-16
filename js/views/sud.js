import { num, sudhausausbeute, speisezucker, hefeMengeText, ZUCKER, SALZE } from '../calc.js';
import { STATUS, HOPFEN_ARTEN } from '../data.js';
import { state, speichern, heute, loescheSud } from '../store.js';
import { esc, fmt, sg, bind, inp, sel, kachel, bestaetigen } from '../ui.js';
import { sudWerte } from './sude.js';
import { bild } from '../bilder.js';

function gaerChart(messungen) {
  const pts = messungen.map((g) => ({
    t: Date.parse(g.datum) / 864e5,
    p: num(g.plato),
    c: g.temp === '' || g.temp == null ? null : num(g.temp),
  }));
  if (pts.length < 2) return '<p class="muted">Ab zwei Messungen erscheint hier der Gärverlauf als Diagramm.</p>';
  const W = 640, H = 260, l = 40, r = 40, t = 14, b = 30;
  const t0 = pts[0].t;
  const t1 = Math.max(pts[pts.length - 1].t, t0 + 1);
  const pMax = Math.max(4, Math.ceil(Math.max(...pts.map((p) => p.p)) + 1));
  const temps = pts.filter((p) => p.c != null);
  const cMin = temps.length ? Math.floor(Math.min(...temps.map((p) => p.c)) - 2) : 0;
  const cMax = temps.length ? Math.ceil(Math.max(...temps.map((p) => p.c)) + 2) : 1;
  const x = (v) => l + ((v - t0) / (t1 - t0)) * (W - l - r);
  const y = (v) => t + (1 - v / pMax) * (H - t - b);
  const yc = (v) => t + (1 - (v - cMin) / (cMax - cMin)) * (H - t - b);
  const linie = (arr, fy, feld) => arr.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${fy(p[feld]).toFixed(1)}`).join(' ');
  const schritt = pMax > 12 ? 4 : 2;
  let gitter = '';
  for (let v = 0; v <= pMax; v += schritt)
    gitter += `<line class="gitter" x1="${l}" x2="${W - r}" y1="${y(v)}" y2="${y(v)}"/><text class="achse" x="${l - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  const tage = Math.round(t1 - t0);
  const tSchritt = Math.max(1, Math.ceil(tage / 8));
  let xAchse = '';
  for (let d = 0; d <= tage; d += tSchritt)
    xAchse += `<text class="achse" x="${x(t0 + d)}" y="${H - 8}" text-anchor="middle">${d}</text>`;
  const tempAchse = temps.length
    ? [cMin, (cMin + cMax) / 2, cMax].map((v) => `<text class="achse temp" x="${W - r + 6}" y="${yc(v) + 4}">${fmt(v, 0)}°</text>`).join('')
    : '';
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gärverlauf: Extrakt in Grad Plato und Temperatur über die Gärtage">
    ${gitter}${xAchse}${tempAchse}
    <text class="achse" x="${l}" y="10">°P</text><text class="achse" x="${W - r + 6}" y="${H - 8}">Tage</text>
    ${temps.length > 1 ? `<path class="linie temp" d="${linie(temps, yc, 'c')}"/>` : ''}
    <path class="linie" d="${linie(pts, y, 'p')}"/>
    ${pts.map((p) => `<circle class="punkt" cx="${x(p.t).toFixed(1)}" cy="${y(p.p).toFixed(1)}" r="4"><title>${fmt(p.p)} °P</title></circle>`).join('')}
  </svg>
  <p class="legende"><span class="l-extrakt">Extrakt (°P)</span>${temps.length > 1 ? '<span class="l-temp">Temperatur (°C)</span>' : ''}</p>`;
}

export function sudView(root, id) {
  const sud = state.sude.find((x) => x.id === id);
  if (!sud) {
    root.innerHTML = `<div class="card leer"><p>Diesen Sud gibt es nicht (mehr).</p><a class="btn" href="#/sude">Zu den Suden</a></div>`;
    return;
  }
  const r = sud.rezept;

  const gaerZeile = (g, i) => `
    <div class="zrow">
      ${inp('Datum', `gaerung.${i}.datum`, g.datum, { type: 'date' })}
      ${inp('Extrakt', `gaerung.${i}.plato`, g.plato, { unit: '°P', step: '0.1' })}
      <div class="out"><span>Dichte</span><output data-out="sg-${i}">–</output></div>
      ${inp('Temperatur', `gaerung.${i}.temp`, g.temp, { unit: '°C', step: '0.1', min: -5 })}
      ${inp('Notiz', `gaerung.${i}.notiz`, g.notiz, { type: 'text', cls: 'wide' })}
      <button class="btn icon" data-act="mess-weg" data-i="${i}" aria-label="Messung entfernen">✕</button>
    </div>`;

  const rezeptInfo = () => {
    const z = r.wasser || {};
    const wasser = [
      ...Object.entries(SALZE).filter(([k]) => num(z[k]) > 0).map(([k, s]) => `${fmt(num(z[k]))} g ${s.name}`),
      ...(num(z.milchsaeureMl) > 0 ? [`${fmt(num(z.milchsaeureMl))} ml Milchsäure`] : []),
      ...(num(z.sauermalzG) > 0 ? [`${fmt(num(z.sauermalzG), 0)} g Sauermalz`] : []),
    ];
    return `
      <h3>Schüttung</h3><ul>${(r.malts || []).map((m) => `<li>${fmt(num(m.kg), 2)} kg ${esc(m.name)} (${fmt(num(m.ebc), 0)} EBC)</li>`).join('')}</ul>
      <h3>Hopfen</h3><ul>${(r.hops || [])
        .map((h) => {
          const art = HOPFEN_ARTEN.find(([k]) => k === h.art)?.[1] || h.art;
          const wann = h.art === 'vwh' ? '' : h.art === 'stopfen' ? `, ${fmt(num(h.zeit), 0)} Tage` : `, ${fmt(num(h.zeit), 0)} min`;
          return `<li>${fmt(num(h.g), 0)} g ${esc(h.name)} (${fmt(num(h.alpha))} % α) – ${esc(art)}${wann}</li>`;
        })
        .join('')}</ul>
      <h3>Hefe</h3><p>${esc(hefeMengeText(r.hefe))} ${esc(r.hefe?.name || '–')} · ${fmt(num(r.hefe?.temp), 0)} °C</p>
      <h3>Maischplan</h3><ul><li>Einmaischen bei ${fmt(num(r.einmaischTemp), 0)} °C</li>${(r.rasten || []).map((ra) => `<li>${esc(ra.name || 'Rast')}: ${fmt(num(ra.temp), 0)} °C, ${fmt(num(ra.dauer), 0)} min</li>`).join('')}</ul>
      ${wasser.length ? `<h3>Wasseraufbereitung</h3><p>${esc(wasser.join(', '))}</p>` : ''}
      ${r.notizen ? `<h3>Rezeptnotizen</h3><p>${esc(r.notizen)}</p>` : ''}`;
  };

  const zeichne = () => {
    const y = scrollY;
    const btLaeuft = sud.brautag && sud.status === 'brautag';
    root.innerHTML = `
      <a class="zurueck" href="#/sude">‹ Sude</a>
      <header class="kopf">
        ${bild(r.bildId) ? `<img class="kopf-bild" src="${bild(r.bildId)}" alt="Etikett von ${esc(sud.name)}">` : ''}
        <div class="titel-felder">
          <input class="titel" data-f="name" value="${esc(sud.name)}" aria-label="Name des Suds">
          <p class="muted">Sud #${sud.nr}</p>
        </div>
        <a class="btn primary" href="#/sud/${sud.id}/brautag">${btLaeuft ? 'Brautag fortsetzen' : sud.brautag ? 'Brautag ansehen' : 'Brautag starten'}</a>
      </header>

      <section class="card">
        <div class="felder">
          ${sel('Status', 'status', sud.status, STATUS)}
          ${inp('Brautag', 'datum', sud.datum, { type: 'date' })}
        </div>
        <div class="kzs" id="kz"></div>
      </section>

      <section class="card">
        <h2>Messwerte vom Brautag</h2>
        <div class="felder">
          ${inp('Pfannevoll-Menge', 'mess.pfannevollL', sud.mess.pfannevollL, { unit: 'l' })}
          ${inp('Pfannevoll-Würze', 'mess.pfannevollP', sud.mess.pfannevollP, { unit: '°P' })}
          ${inp('Ausschlagmenge', 'mess.ausschlagL', sud.mess.ausschlagL, { unit: 'l' })}
          ${inp('Stammwürze', 'mess.stammwuerzeP', sud.mess.stammwuerzeP, { unit: '°P' })}
          ${inp('Menge im Gärfass', 'mess.anstellL', sud.mess.anstellL, { unit: 'l' })}
        </div>
        <p class="hinweis" id="mess-sg"></p>
      </section>

      <section class="card">
        <h2>Gärverlauf</h2>
        <div id="chart"></div>
        ${sud.gaerung.map(gaerZeile).join('')}
        <div class="leiste"><button class="btn" data-act="mess-neu">+ Messung</button></div>
        <p class="hinweis">Extrakt mit der Bierspindel gemessen (scheinbarer Restextrakt). Bleibt der Wert an drei Tagen gleich, ist die Hauptgärung beendet.</p>
      </section>

      <section class="card">
        <h2>Abfüllung & Karbonisierung</h2>
        <div class="felder">
          ${inp('Abfülldatum', 'abfuellung.datum', sud.abfuellung.datum, { type: 'date' })}
          ${inp('Jungbiermenge', 'abfuellung.mengeL', sud.abfuellung.mengeL, { unit: 'l', ph: String(sud.mess.anstellL || '') })}
          ${inp('Jungbiertemperatur', 'abfuellung.tempC', sud.abfuellung.tempC, { unit: '°C' })}
          ${inp('Ziel-CO₂', 'abfuellung.zielCo2', sud.abfuellung.zielCo2, { unit: 'g/l', step: '0.1' })}
          ${sel('Zucker', 'abfuellung.zucker', sud.abfuellung.zucker, Object.entries(ZUCKER).map(([k, v]) => [k, v.name]))}
        </div>
        <div class="kzs klein" id="karbo"></div>
        <p class="hinweis">Richtwerte CO₂: Ale 4–5 g/l, Lager/Helles 5–5,5 g/l, Weizen 6–7 g/l. Nur abfüllen, wenn die Gärung sicher beendet ist – sonst droht Überdruck in den Flaschen.</p>
      </section>

      <section class="card">
        <h2>Bewertung & Notizen</h2>
        <div class="felder">${sel('Bewertung', 'bewertung', sud.bewertung, [['', '– noch nicht bewertet –'], [5, '★★★★★ hervorragend'], [4, '★★★★☆ gut'], [3, '★★★☆☆ ordentlich'], [2, '★★☆☆☆ mäßig'], [1, '★☆☆☆☆ misslungen']])}</div>
        <textarea data-f="notizen" rows="4" placeholder="Beobachtungen am Brautag, Geschmack, Ideen fürs nächste Mal …">${esc(sud.notizen)}</textarea>
      </section>

      <details class="card"><summary><h2>Rezept dieses Suds</h2></summary>${rezeptInfo()}</details>

      <div class="leiste ende"><button class="btn danger ghost" data-act="loeschen">Sud löschen</button></div>`;
    aktualisiere();
    scrollTo(0, y);
  };

  const aktualisiere = () => {
    const w = sudWerte(sud);
    const k = w.k;
    const m = sud.mess;
    const hat = (v) => v !== '' && v != null;
    const shaIst = hat(m.ausschlagL) && hat(m.stammwuerzeP) ? sudhausausbeute(r.malts, num(m.ausschlagL), num(m.stammwuerzeP)) : null;
    const soll = (t) => `<span class="kz-n">Soll ${t}</span>`;
    root.querySelector('#kz').innerHTML =
      kachel('Stammwürze', w.sw != null ? fmt(w.sw) : '–', '°P', (w.sw != null ? `<span class="kz-n">${sg(w.sw)}</span>` : '') + soll(`${fmt(k.sw)} °P · ${sg(k.sw)}`)) +
      kachel('Ausbeute', shaIst != null ? fmt(shaIst, 0) : '–', '%', soll(fmt(num(r.sha), 0) + ' %')) +
      kachel('Restextrakt', w.rest != null ? fmt(w.rest) : '–', '°P', (w.rest != null ? `<span class="kz-n">${sg(w.rest)}</span>` : '') + soll(`${fmt(k.restP)} °P · ${sg(k.restP)}`)) +
      kachel('Vergärungsgrad', w.alk ? fmt(w.alk.evg, 0) : '–', '%', soll(fmt(k.evg, 0) + ' %')) +
      kachel('Alkohol', w.alk ? fmt(w.alk.abv) : '–', '% vol', soll(fmt(k.abv) + ' % vol')) +
      kachel('Bittere', fmt(k.ibu, 0), 'IBU', `<span class="kz-n">Farbe ${fmt(k.ebc, 0)} EBC</span><i class="farbe" style="background:${k.farbe}"></i>`);
    root.querySelector('#chart').innerHTML = gaerChart(w.messungen);
    sud.gaerung.forEach((g, i) => {
      const o = root.querySelector(`[data-out="sg-${i}"]`);
      if (o) o.textContent = hat(g.plato) ? sg(num(g.plato)).slice(3) : '–';
    });
    const mSg = (feld) => (hat(m[feld]) ? sg(num(m[feld])) : '');
    root.querySelector('#mess-sg').textContent = [
      mSg('pfannevollP') && `Pfannevoll-Würze ${mSg('pfannevollP')}`,
      mSg('stammwuerzeP') && `Stammwürze ${mSg('stammwuerzeP')}`,
    ].filter(Boolean).join(' · ');

    const a = sud.abfuellung;
    const menge = hat(a.mengeL) ? num(a.mengeL) : num(m.anstellL) || k.wasser.gaerfass;
    const z = speisezucker(a.zielCo2, a.tempC, menge, a.zucker);
    root.querySelector('#karbo').innerHTML =
      kachel('Zucker gesamt', fmt(z.gesamt, 0), 'g', `<span class="kz-n">für ${fmt(menge)} l</span>`) +
      kachel('Zucker je Liter', fmt(z.gL), 'g/l') +
      kachel('Je 0,5-l-Flasche', fmt(z.gL / 2), 'g') +
      kachel('Bereits gelöst', fmt(z.rest), 'g/l CO₂');
  };

  bind(root, sud, (pfad, wert, typ) => {
    if (typ === 'change' && pfad === 'status') zeichne();
    else aktualisiere();
    speichern();
  });

  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'mess-neu') {
      const letzte = sud.gaerung[sud.gaerung.length - 1];
      sud.gaerung.push({ datum: heute(), plato: '', temp: letzte?.temp ?? r.hefe?.temp ?? '', notiz: '' });
    } else if (b.dataset.act === 'mess-weg') {
      sud.gaerung.splice(Number(b.dataset.i), 1);
    } else if (b.dataset.act === 'loeschen') {
      if (await bestaetigen('Sud löschen?', `Sud #${sud.nr} „${sud.name}“ wird mit allen Messwerten endgültig gelöscht.`)) {
        loescheSud(sud.id);
        location.hash = '#/sude';
      }
      return;
    } else return;
    speichern();
    zeichne();
  });

  zeichne();
}
