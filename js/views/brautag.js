import { state, speichern, heute } from '../store.js';
import { esc, fmt, bind, inp, bestaetigen, toast, kachel } from '../ui.js';
import * as grainfather from '../grainfather.js';
import {
  baueSchritte, neuerBrautag, vergangenMs, timerStart, timerPause, timerReset, geheZu,
  tonVorbereiten, signalton, benachrichtigungErlauben, bildschirmAnlassen,
} from '../brautag.js';

const zeit = (ms) => {
  const s = Math.floor(Math.abs(ms) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const p = (n) => String(n).padStart(2, '0');
  return (h ? h + ':' + p(m) : p(m)) + ':' + p(s % 60);
};

export function brautagView(root, id) {
  const sud = state.sude.find((x) => x.id === id);
  if (!sud) {
    root.innerHTML = `<div class="card leer"><p>Diesen Sud gibt es nicht (mehr).</p><a class="btn" href="#/sude">Zu den Suden</a></div>`;
    return;
  }
  if (!sud.brautag) {
    sud.brautag = neuerBrautag();
    if (sud.status === 'geplant') sud.status = 'brautag';
    speichern();
  }
  const bt = sud.brautag;
  let schritte = baueSchritte(sud);
  let wach = false;

  const zeichne = () => {
    schritte = baueSchritte(sud);
    bt.idx = Math.min(bt.idx, schritte.length - 1);
    const s = schritte[bt.idx];
    const letzter = bt.idx === schritte.length - 1;
    root.innerHTML = `
      <a class="zurueck" href="#/sud/${sud.id}">‹ Sud #${sud.nr} ${esc(sud.name)}</a>
      <ol class="schritte" aria-label="Fortschritt">
        ${schritte.map((x, i) => `<li class="${i < bt.idx ? 'fertig' : i === bt.idx ? 'aktiv' : ''}"><button data-act="gehe" data-i="${i}" title="${esc(x.titel)}"><span>${i + 1}</span></button></li>`).join('')}
      </ol>
      <section class="card brautag">
        <p class="muted">Schritt ${bt.idx + 1} von ${schritte.length}</p>
        <h1>${esc(s.titel)}</h1>
        <p class="gross">${esc(s.text)}</p>

        ${
          s.typ === 'timer'
            ? `<div class="timer" id="timer">
                <div class="ziffern" id="ziffern" aria-live="off">--:--</div>
                <div class="balken"><i id="balken"></i></div>
                <p class="muted" id="timerinfo"></p>
                <div class="leiste mitte">
                  <button class="btn primary gross-btn" data-act="startstopp" id="startstopp"></button>
                  <button class="btn" data-act="plus">+1 min</button>
                  <button class="btn ghost" data-act="reset">Zurücksetzen</button>
                </div>
              </div>`
            : ''
        }

        ${s.ereignisse?.length ? `<h2>Gaben während des Kochens</h2><ul class="gaben" id="gaben"></ul>` : ''}

        ${
          s.punkte?.length
            ? `<ul class="checkliste">${s.punkte
                .map((p, i) => {
                  const key = `${s.id}:p${i}`;
                  return `<li><label class="check"><input type="checkbox" data-erledigt="${key}" ${bt.erledigt[key] ? 'checked' : ''}> <span>${esc(p)}</span></label></li>`;
                })
                .join('')}</ul>`
            : ''
        }

        ${
          s.mess?.length
            ? `<h2>Messwerte</h2><div class="felder">${s.mess
                .map((m) => inp(`${m.label} (Soll ${m.soll})`, 'mess.' + m.feld, sud.mess[m.feld], { unit: m.einheit }))
                .join('')}</div>`
            : ''
        }
      </section>

      <section class="card" id="gf"></section>

      <div class="leiste zwischen">
        <button class="btn" data-act="zurueck" ${bt.idx === 0 ? 'disabled' : ''}>‹ Zurück</button>
        <label class="check"><input type="checkbox" id="wach" ${wach ? 'checked' : ''}> Bildschirm anlassen</label>
        <button class="btn ghost small" data-act="testton">🔔 Signalton testen</button>
        <button class="btn primary" data-act="${letzter ? 'abschluss' : 'weiter'}">${letzter ? 'Brautag abschließen ✓' : 'Weiter ›'}</button>
      </div>`;
    gfSignatur = '';
    zeichneGf();
    tick();
  };

  // ---------- Grainfather ----------
  const gf = grainfather.gf;
  let gfSignatur = '';
  const anAus = (v) => (v == null ? '–' : v ? 'an' : 'aus');

  const zeichneGf = () => {
    const box = root.querySelector('#gf');
    if (!box) return;
    const s = schritte[bt.idx];
    // Die Karte nur neu aufbauen, wenn sich ihr Aufbau ändert – Messwerte werden direkt eingetragen,
    // damit Schaltflächen bei laufenden Meldungen der Steuerung bedienbar bleiben.
    const signatur = [gf.verbunden, gf.verbinde, gf.fehler, bt.idx, gf.celsius, gf.heizung, gf.pumpe, gf.wartet, gf.wartetCode].join('|');
    if (signatur !== gfSignatur) {
      gfSignatur = signatur;
      if (!grainfather.unterstuetzt()) {
        box.innerHTML = `<h2>Grainfather</h2><p class="hinweis">Die Bluetooth-Verbindung funktioniert nur in Chrome oder Edge
          (Windows, macOS, Android) – nicht in Firefox, Safari oder auf dem iPhone. Öffne die App dort unter derselben Adresse.</p>`;
      } else if (!gf.verbunden) {
        box.innerHTML = `<h2>Grainfather</h2>
          <p class="hinweis">Verbinde die G30-Steuerung per Bluetooth, um Temperaturen live zu sehen und Sollwerte zu senden.
            Die Grainfather-App auf dem Handy muss dabei getrennt sein – die Steuerung erlaubt nur eine Verbindung.</p>
          ${gf.fehler ? `<p class="warnung">Verbindung fehlgeschlagen: ${esc(gf.fehler)}</p>` : ''}
          <div class="leiste"><button class="btn primary" data-gf="verbinden" ${gf.verbinde ? 'disabled' : ''}>${gf.verbinde ? 'Verbinde …' : 'Mit Grainfather verbinden'}</button></div>`;
      } else {
        const fahrenheit = gf.celsius === false;
        box.innerHTML = `<h2>Grainfather <span class="badge s-fertig">verbunden</span></h2>
          <div class="kzs" id="gf-werte"></div>
          ${gf.wartet ? `<p class="warnung">Die Steuerung wartet auf eine Bestätigung${gf.wartetCode ? ` (Code ${esc(gf.wartetCode)})` : ''}. Das ist eine mögliche Ursache, wenn sie piept.
            Bestätige am Gerät mit der Set-Taste oder hier: <button class="btn small" data-gf="bestaetigen">Bestätigen</button></p>` : ''}
          ${fahrenheit ? '<p class="warnung">Die Steuerung ist auf °F eingestellt. Bitte am Gerät auf °C umstellen, bevor du Sollwerte sendest.</p>' : ''}
          <div class="leiste">
            ${s.temp && !fahrenheit ? `<button class="btn primary" data-gf="soll" data-t="${s.temp}">Soll auf ${fmt(s.temp, 0)} °C setzen</button>` : ''}
            <button class="btn" data-gf="heizung">${gf.heizung ? 'Heizung aus' : 'Heizung an'}</button>
            <button class="btn" data-gf="pumpe">${gf.pumpe ? 'Pumpe aus' : 'Pumpe an'}</button>
          </div>
          <label class="check auto"><input type="checkbox" id="gf-auto" ${bt.gfAuto ? 'checked' : ''}>
            <span>Rast-Timer automatisch starten, sobald die Solltemperatur erreicht ist</span></label>
          <div class="leiste">
            <button class="btn ghost" data-gf="rezept">Maischplan an die Steuerung senden …</button>
            <button class="btn ghost" data-gf="trennen">Trennen</button>
          </div>
          <details><summary class="hinweis">Protokoll der Verbindung</summary><pre id="gf-log"></pre>
            <button class="btn small ghost" data-gf="log-kopieren">Protokoll kopieren</button></details>
          <p class="hinweis">Das Bluetooth-Protokoll des Grainfather ist nicht offiziell dokumentiert. Die Anlage nie unbeaufsichtigt heizen lassen
            und Heizung und Pumpe nur einschalten, wenn der Kessel gefüllt ist.</p>`;
      }
    }
    const werte = root.querySelector('#gf-werte');
    if (werte) {
      const timer = gf.timerAktiv ? `${gf.restMin ?? 0}:${String(gf.restSek ?? 0).padStart(2, '0')}` : '–';
      werte.innerHTML =
        kachel('Ist', gf.ist == null ? '–' : fmt(gf.ist), '°C') +
        kachel('Soll', gf.soll == null ? '–' : fmt(gf.soll), '°C') +
        kachel('Heizung', anAus(gf.heizung), gf.heizleistung == null ? '' : `${fmt(gf.heizleistung, 0)} %`) +
        kachel('Pumpe', anAus(gf.pumpe)) +
        kachel('Timer am Gerät', timer, gf.timerPausiert ? 'pausiert' : '');
      const log = root.querySelector('#gf-log');
      if (log && log.parentElement.open) log.textContent = grainfather.protokoll.slice(-25).join('\n');
    }
  };

  // Rast-Timer starten, wenn der Grainfather die Rasttemperatur erreicht hat
  const gfAutomatik = () => {
    const s = schritte[bt.idx];
    if (!bt.gfAuto || !gf.verbunden || gf.ist == null) return;
    if (!s || s.typ !== 'timer' || !s.id.startsWith('rast') || bt.timer.laeuft || vergangenMs(bt) !== 0) return;
    if (gf.ist < s.temp - 0.5) return;
    timerStart(bt);
    speichern();
    signalton();
    toast(`${fmt(gf.ist)} °C erreicht – Timer für „${s.titel}“ gestartet.`, { dauer: 6000 });
    tick();
  };

  const gfAbo = grainfather.beobachte(() => {
    zeichneGf();
    gfAutomatik();
  });

  const gfAktion = async (aktion, knopf) => {
    try {
      if (aktion === 'verbinden') {
        tonVorbereiten();
        await grainfather.verbinde();
        if (gf.verbunden) toast(`Verbunden mit ${gf.geraet}.`);
      } else if (aktion === 'log-kopieren') {
        await navigator.clipboard.writeText(grainfather.protokoll.join('\n'));
        toast('Protokoll in die Zwischenablage kopiert.');
      } else if (aktion === 'trennen') {
        grainfather.trenne();
      } else if (aktion === 'soll') {
        await grainfather.sende(grainfather.BEFEHL.solltemperatur(Number(knopf.dataset.t)));
        toast(`Solltemperatur ${fmt(Number(knopf.dataset.t), 0)} °C gesendet.`);
      } else if (aktion === 'bestaetigen') {
        await grainfather.sende(grainfather.BEFEHL.hinweisBestaetigen());
      } else if (aktion === 'pumpe') {
        await grainfather.sende(grainfather.BEFEHL.pumpe(!gf.pumpe));
      } else if (aktion === 'heizung') {
        if (!gf.heizung && !(await bestaetigen('Heizung einschalten?', 'Nur einschalten, wenn der Kessel gefüllt ist und du bei der Anlage bist.', 'Heizung einschalten'))) return;
        await grainfather.sende(grainfather.BEFEHL.heizung(!gf.heizung));
      } else if (aktion === 'rezept') {
        const zeilen = grainfather.rezeptBefehle(sud.rezept, sud.anlage);
        const ok = await bestaetigen(
          'Maischplan an die Steuerung senden?',
          `Der Grainfather übernimmt Rasten, Kochzeit und Hopfengaben als eigenes Programm und führt dann selbst durch den Brautag (${zeilen.length} Zeilen). Eine laufende Sitzung am Gerät wird dabei ersetzt.`,
          'Senden',
        );
        if (!ok) return;
        await grainfather.sendeRezept(sud.rezept, sud.anlage);
        toast('Maischplan gesendet – bitte am Gerät prüfen.', { dauer: 6000 });
      }
    } catch (e) {
      // Abbruch der Geräteauswahl durch den Benutzer ist kein Fehler.
      if (e?.name !== 'NotFoundError') toast('Grainfather: ' + (e?.message || e), { art: 'fehler', dauer: 7000 });
    }
    zeichneGf();
  };

  const tick = () => {
    const s = schritte[bt.idx];
    if (!s || s.typ !== 'timer' || !root.querySelector('#ziffern')) return;
    const ms = vergangenMs(bt);
    const rest = s.dauer * 60000 - ms;
    const z = root.querySelector('#ziffern');
    z.textContent = (rest < 0 ? '+' : '') + zeit(rest);
    z.classList.toggle('ueber', rest < 0);
    root.querySelector('#balken').style.width = Math.min(100, (ms / (s.dauer * 60000 || 1)) * 100) + '%';
    root.querySelector('#timerinfo').textContent =
      rest < 0 ? 'Zeit abgelaufen – weiter zum nächsten Schritt.' : bt.timer.laeuft ? `läuft seit ${zeit(ms)}` : ms > 0 ? 'pausiert' : 'bereit';
    root.querySelector('#startstopp').textContent = bt.timer.laeuft ? 'Pause' : ms > 0 ? 'Fortsetzen' : 'Timer starten';

    const gaben = root.querySelector('#gaben');
    if (gaben) {
      const html = s.ereignisse
        .map((ev) => {
          const key = `${s.id}:${ev.id}`;
          const bis = ev.bei * 60000 - ms;
          const fertig = !!bt.erledigt[key];
          const status = fertig ? 'erledigt' : bis <= 0 ? 'jetzt' : 'offen';
          return `<li class="${status}"><label class="check"><input type="checkbox" data-erledigt="${key}" ${fertig ? 'checked' : ''}>
            <span><b>${esc(ev.text)}</b><small>${fmt(ev.rest, 0)} min vor Kochende · ${fertig ? 'erledigt' : bis <= 0 ? 'JETZT GEBEN' : 'in ' + zeit(bis)}</small></span></label></li>`;
        })
        .join('');
      // Nur neu zeichnen, wenn sich die Statusklassen ändern oder Zeiten angezeigt werden.
      if (gaben.dataset.html !== html) {
        gaben.innerHTML = html;
        gaben.dataset.html = html;
      }
    }
  };

  bind(root, sud, () => speichern());

  root.addEventListener('change', async (e) => {
    const key = e.target.dataset?.erledigt;
    if (key) {
      bt.erledigt[key] = e.target.checked;
      speichern();
      tick();
    }
    if (e.target.id === 'gf-auto') {
      bt.gfAuto = e.target.checked;
      tonVorbereiten();
      speichern();
      gfAutomatik();
    }
    if (e.target.id === 'wach') {
      wach = await bildschirmAnlassen(e.target.checked);
      e.target.checked = wach;
    }
  });

  root.addEventListener('click', async (e) => {
    const g = e.target.closest('[data-gf]');
    if (g) return gfAktion(g.dataset.gf, g);
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const s = schritte[bt.idx];
    switch (b.dataset.act) {
      case 'startstopp':
        tonVorbereiten();
        benachrichtigungErlauben();
        if (bt.timer.laeuft) timerPause(bt);
        else timerStart(bt);
        break;
      case 'plus':
        bt.timer.basis -= 60000;
        delete bt.gemeldet[`${s.id}:ende`];
        break;
      case 'reset':
        if (vergangenMs(bt) > 0 && !(await bestaetigen('Timer zurücksetzen?', 'Die bisher gelaufene Zeit geht verloren.', 'Zurücksetzen'))) return;
        timerReset(bt, s.id);
        break;
      case 'gehe':
      case 'zurueck':
      case 'weiter': {
        const ziel = b.dataset.act === 'gehe' ? Number(b.dataset.i) : bt.idx + (b.dataset.act === 'weiter' ? 1 : -1);
        if (ziel === bt.idx || ziel < 0 || ziel >= schritte.length) return;
        if (bt.timer.laeuft && !(await bestaetigen('Schritt wechseln?', 'Der laufende Timer wird dabei beendet.', 'Wechseln'))) return;
        geheZu(bt, ziel);
        scrollTo(0, 0);
        break;
      }
      case 'abschluss':
        sud.status = 'gaerung';
        timerPause(bt);
        if (!sud.gaerung.length && sud.mess.stammwuerzeP !== '' && sud.mess.stammwuerzeP != null) {
          sud.gaerung.push({ datum: heute(), plato: sud.mess.stammwuerzeP, temp: sud.rezept.hefe?.temp ?? '', notiz: 'Angestellt' });
        }
        speichern();
        bildschirmAnlassen(false);
        location.hash = '#/sud/' + sud.id;
        return;
      case 'testton':
        signalton();
        return;
      default:
        return;
    }
    speichern();
    zeichne();
  });

  const intervall = setInterval(tick, 250);
  const sichtbar = () => {
    if (!document.hidden && wach) bildschirmAnlassen(true);
  };
  document.addEventListener('visibilitychange', sichtbar);
  zeichne();

  return () => {
    gfAbo();
    clearInterval(intervall);
    document.removeEventListener('visibilitychange', sichtbar);
    bildschirmAnlassen(false);
  };
}
