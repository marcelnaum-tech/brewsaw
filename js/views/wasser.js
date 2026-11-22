import {
  kennzahlen, wassermengen, wasserBehandeln, milchsaeureFuerRa, raEmpfehlung, maischePh,
  SALZE, DH_HCO3, num, runde,
} from '../calc.js';
import { state, speichern, leereZugaben } from '../store.js';
import { esc, fmt, bind, inp, kachel, toast } from '../ui.js';
import { WASSERPROFILE } from '../data.js';

const IONEN_NAMEN = [
  ['ca', 'Calcium'],
  ['mg', 'Magnesium'],
  ['na', 'Natrium'],
  ['so4', 'Sulfat'],
  ['cl', 'Chlorid'],
  ['hco3', 'Hydrogencarbonat'],
];

export function wasserView(root, rezeptId) {
  const s = state.settings;
  if (rezeptId !== undefined && state.rezepte.some((r) => r.id === rezeptId)) {
    s.wasserRezeptId = rezeptId;
    speichern();
  }

  const rezept = () => state.rezepte.find((r) => r.id === s.wasserRezeptId) || null;
  const zugaben = () => {
    const r = rezept();
    if (r) return (r.wasser ??= leereZugaben());
    return (s.wasserFrei.zugaben ??= leereZugaben());
  };
  const mengen = () => {
    const r = rezept();
    if (r) {
      const k = kennzahlen(r, s.anlage);
      return { w: k.wasser, ebc: k.ebc };
    }
    const f = s.wasserFrei;
    return {
      w: wassermengen({
        schuettungKg: f.schuettungKg,
        ausschlagL: f.ausschlagL,
        kochzeit: f.kochzeit,
        verdampfungLh: s.anlage.verdampfungLh,
        treberverlustLkg: s.anlage.treberverlustLkg,
        trubverlustL: s.anlage.trubverlustL,
        hauptgussLkg: s.anlage.hauptgussLkg,
        totraumL: s.anlage.totraumL,
      }),
      ebc: null,
    };
  };

  // Ein gemeinsames Objekt, damit data-f-Pfade für alle Bereiche funktionieren.
  const modell = {
    get profil() { return s.wasserprofil; },
    get frei() { return s.wasserFrei; },
    get z() { return zugaben(); },
  };

  const zeichne = () => {
    const r = rezept();
    const z = zugaben();
    const p = s.wasserprofil;
    root.innerHTML = `
      <header class="kopf"><div><h1>Wasserrechner</h1><p class="muted">Wassermengen und Aufbereitung des Brauwassers</p></div></header>

      <section class="card">
        <h2>Berechnen für</h2>
        <div class="felder">
          <label class="fld wide"><span>Rezept</span><select id="rezeptwahl">
            <option value="">Freie Eingabe (ohne Rezept)</option>
            ${state.rezepte.map((x) => `<option value="${x.id}" ${x.id === s.wasserRezeptId ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}
          </select></label>
        </div>
        ${
          r
            ? `<p class="hinweis">Mengen stammen aus dem Rezept. <a href="#/rezept/${r.id}">Rezept öffnen ›</a></p>`
            : `<div class="felder">
                ${inp('Schüttung', 'frei.schuettungKg', s.wasserFrei.schuettungKg, { unit: 'kg' })}
                ${inp('Ausschlagmenge', 'frei.ausschlagL', s.wasserFrei.ausschlagL, { unit: 'l' })}
                ${inp('Kochzeit', 'frei.kochzeit', s.wasserFrei.kochzeit, { unit: 'min' })}
              </div>`
        }
        <div class="kzs klein" id="mengen"></div>
        <p class="hinweis">Verdampfung, Treberverlust und Hauptguss-Verhältnis kommen aus den <a href="#/einstellungen">Einstellungen der Anlage</a>.</p>
      </section>

      <section class="card">
        <h2>Ausgangswasser</h2>
        <p class="hinweis">Die Werte stehen in der Trinkwasseranalyse deines Wasserversorgers (Angaben in mg/l).</p>
        <div class="zrow">
          <label class="fld"><span>Vorlage</span><select id="profilwahl"><option value="">Wasserprofil wählen …</option>
            ${WASSERPROFILE.map((x, i) => `<option value="${i}">${esc(x.name)}</option>`).join('')}</select></label>
          <button class="btn" data-act="profil">Vorlage laden</button>
        </div>
        <p class="hinweis" id="profilinfo"></p>
        <div class="felder">
          ${inp('Bezeichnung', 'profil.name', p.name, { type: 'text', cls: 'wide' })}
          ${IONEN_NAMEN.map(([k, n]) => inp(n, 'profil.' + k, p[k], { unit: 'mg/l' })).join('')}
          <label class="fld"><span>Karbonathärte <em>°dH</em></span><input id="kh" type="number" step="any" min="0" inputmode="decimal" value="${runde(num(p.hco3) / DH_HCO3, 1)}"></label>
        </div>
        <p class="hinweis">Karbonathärte und Hydrogencarbonat rechnen sich gegenseitig um (1 °dH = ${fmt(DH_HCO3, 1)} mg/l; Säurekapazität K<sub>S4,3</sub> in mmol/l × 2,8 = °dH).</p>
      </section>

      <section class="card">
        <h2>Aufbereitung</h2>
        <p class="hinweis">Mengen jeweils für das gesamte Brauwasser (Haupt- und Nachguss).</p>
        <div class="felder">
          ${Object.entries(SALZE).map(([k, salz]) => inp(`${salz.name} (${salz.formel})`, 'z.' + k, z[k], { unit: 'g', step: '0.1' })).join('')}
          ${inp('Milchsäure 80 %', 'z.milchsaeureMl', z.milchsaeureMl, { unit: 'ml', step: '0.1' })}
          ${inp('Sauermalz', 'z.sauermalzG', z.sauermalzG, { unit: 'g' })}
        </div>
        <div class="zrow ziel">
          ${inp('Ziel-Restalkalität', 'z.zielRA', z.zielRA, { unit: '°dH', min: -10, ph: 'z. B. 0' })}
          <button class="btn" data-act="saeure">Milchsäure für Ziel berechnen</button>
        </div>
        <p class="hinweis" id="empfehlung"></p>
      </section>

      <section class="card">
        <h2>Ergebnis</h2>
        <div class="kzs" id="ergebnis"></div>
        <div id="tabelle"></div>
        <div id="aufteilung"></div>
        <p class="hinweis">Die Restalkalität nach Kolbach ist eine Näherung für den Einfluss des Wassers auf den Maische-pH.
          Der Maische-pH ist nur eine grobe Schätzung (Malzfarbe und Restalkalität). Säuremengen vorsichtig dosieren und den pH nach 10 Minuten Rast nachmessen.</p>
      </section>`;
    aktualisiere();
  };

  const aktualisiere = () => {
    const { w, ebc } = mengen();
    const z = zugaben();
    const b = wasserBehandeln(s.wasserprofil, w.gesamt, z);
    root.querySelector('#mengen').innerHTML =
      kachel('Hauptguss', fmt(w.hauptguss), 'l') +
      kachel('Nachguss', fmt(w.nachguss), 'l') +
      kachel('Gesamtwasser', fmt(w.gesamt), 'l') +
      kachel('Treberverlust', fmt(w.treber), 'l') +
      kachel('Verdampfung', fmt(w.verdampft), 'l') +
      kachel('Pfannevoll', fmt(w.pfannevollHeiss), 'l heiß');

    const emp = ebc != null ? raEmpfehlung(ebc) : null;
    root.querySelector('#empfehlung').textContent = emp
      ? `Richtwert für dieses Rezept (${fmt(ebc, 0)} EBC) – ${emp.text}.`
      : 'Richtwerte: Pils ≤ 0 °dH, helle Biere ≤ 5 °dH, bernsteinfarbene ≤ 10 °dH, dunkle ≤ 15 °dH.';

    const zielGesetzt = z.zielRA !== '' && z.zielRA != null;
    const ziel = zielGesetzt ? num(z.zielRA) : emp?.max;
    const raOk = ziel == null || b.nach.ra <= ziel + 0.05;
    const ph = maischePh(ebc ?? 10, b.nach.ra);
    const phOk = ph.ph >= 5.15 && ph.ph <= 5.65;
    root.querySelector('#ergebnis').innerHTML =
      kachel('Restalkalität vorher', fmt(b.vor.ra), '°dH') +
      kachel('Restalkalität nachher', `<b class="${raOk ? 'gut' : 'schlecht'}">${fmt(b.nach.ra)}</b>`, '°dH') +
      kachel('Maische-pH (Schätzung)', `<b class="${phOk ? 'gut' : 'schlecht'}">${fmt(ph.ph, 2)}</b>`, '', `<span class="kz-n">${ebc != null ? `bei ${fmt(ebc, 0)} EBC` : 'bei angenommenen 10 EBC'}; Ziel 5,2–5,6</span>`) +
      kachel('Gesamthärte', fmt(b.nach.gesamt), '°dH') +
      kachel('Sulfat : Chlorid', b.so4cl == null ? '–' : fmt(b.so4cl), '', `<span class="kz-n">${b.so4cl == null ? '' : b.so4cl > 2 ? 'hopfenbetont' : b.so4cl < 0.8 ? 'malzbetont' : 'ausgewogen'}</span>`);

    root.querySelector('#tabelle').innerHTML = `<table class="tbl"><thead><tr><th>mg/l</th><th class="r">vorher</th><th class="r">nachher</th></tr></thead><tbody>
      ${IONEN_NAMEN.map(([k, n]) => `<tr><td>${n}</td><td class="r">${fmt(num(s.wasserprofil[k]), 0)}</td><td class="r">${fmt(b.profil[k], 0)}</td></tr>`).join('')}
      <tr><td>Karbonathärte (°dH)</td><td class="r">${fmt(b.vor.kh)}</td><td class="r">${fmt(b.nach.kh)}</td></tr>
      </tbody></table>`;

    const anteil = w.gesamt > 0 ? w.hauptguss / w.gesamt : 0;
    const zeilen = [
      ...Object.entries(SALZE).map(([k, salz]) => [salz.name, num(z[k]), 'g']),
      ['Milchsäure 80 %', num(z.milchsaeureMl), 'ml'],
    ].filter(([, m]) => m > 0);
    root.querySelector('#aufteilung').innerHTML = zeilen.length
      ? `<h3>Aufteilung auf Haupt- und Nachguss</h3><table class="tbl"><thead><tr><th>Zugabe</th><th class="r">Hauptguss (${fmt(w.hauptguss)} l)</th><th class="r">Nachguss (${fmt(w.nachguss)} l)</th></tr></thead><tbody>
          ${zeilen.map(([n, m, e]) => `<tr><td>${esc(n)}</td><td class="r">${fmt(m * anteil)} ${e}</td><td class="r">${fmt(m * (1 - anteil))} ${e}</td></tr>`).join('')}
          ${num(z.sauermalzG) > 0 ? `<tr><td>Sauermalz</td><td class="r">${fmt(num(z.sauermalzG), 0)} g (in die Schüttung)</td><td class="r">–</td></tr>` : ''}
        </tbody></table>`
      : '';
  };

  bind(root, modell, (pfad, wert) => {
    if (pfad === 'profil.hco3') root.querySelector('#kh').value = runde(num(wert) / DH_HCO3, 1);
    const r = rezept();
    if (r && pfad.startsWith('z.')) r.geaendert = Date.now();
    aktualisiere();
    speichern();
  });

  root.addEventListener('input', (e) => {
    if (e.target.id !== 'kh') return;
    s.wasserprofil.hco3 = runde(num(e.target.value) * DH_HCO3, 0);
    root.querySelector('[data-f="profil.hco3"]').value = s.wasserprofil.hco3;
    aktualisiere();
    speichern();
  });

  root.addEventListener('change', (e) => {
    if (e.target.id !== 'rezeptwahl') return;
    s.wasserRezeptId = e.target.value;
    speichern();
    zeichne();
  });

  root.addEventListener('click', (e) => {
    const akt = e.target.closest('[data-act]')?.dataset.act;
    if (akt === 'profil') {
      const v = WASSERPROFILE[root.querySelector('#profilwahl').value];
      if (!v) return toast('Bitte zuerst eine Vorlage wählen.');
      const { info, ...werte } = v;
      Object.assign(s.wasserprofil, werte);
      speichern();
      zeichne();
      root.querySelector('#profilinfo').textContent = info;
      return toast('Wasserprofil geladen.');
    }
    if (akt !== 'saeure') return;
    const { w, ebc } = mengen();
    const z = zugaben();
    const ziel = z.zielRA !== '' && z.zielRA != null ? num(z.zielRA) : ebc != null ? raEmpfehlung(ebc).max : 0;
    z.zielRA = ziel;
    const ohne = wasserBehandeln(s.wasserprofil, w.gesamt, { ...z, milchsaeureMl: 0 });
    z.milchsaeureMl = runde(milchsaeureFuerRa(ohne.nach.ra, ziel, w.gesamt), 1);
    speichern();
    zeichne();
    toast(z.milchsaeureMl > 0 ? `${fmt(z.milchsaeureMl)} ml Milchsäure für ${fmt(ziel)} °dH.` : 'Keine Säure nötig – das Ziel ist bereits erreicht.');
  });

  zeichne();
}
