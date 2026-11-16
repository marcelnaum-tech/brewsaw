// Ablauf des Brautags: Schritte aus dem Rezept ableiten, Timer und Alarme.
import { kennzahlen, hefeMengeText, num, SALZE } from './calc.js';
import { fmt, sg } from './ui.js';

const hopfenText = (h) => `${fmt(num(h.g), 0)} g ${h.name || 'Hopfen'} (${fmt(num(h.alpha))} % α)`;

export function baueSchritte(sud) {
  const r = sud.rezept;
  const k = kennzahlen(r, sud.anlage);
  const w = k.wasser;
  const kochzeit = num(r.kochzeit);
  const hops = r.hops || [];
  const z = r.wasser || {};
  const schritte = [];

  const aufbereitung = [
    ...Object.entries(SALZE).filter(([key]) => num(z[key]) > 0).map(([key, s]) => `${fmt(num(z[key]))} g ${s.name}`),
    ...(num(z.milchsaeureMl) > 0 ? [`${fmt(num(z.milchsaeureMl))} ml Milchsäure`] : []),
  ];

  schritte.push({
    id: 'vorbereitung',
    titel: 'Vorbereitung',
    typ: 'check',
    text: 'Alles bereitstellen, bevor es losgeht.',
    punkte: [
      'Geräte reinigen und Zutaten bereitlegen',
      `Schüttung schroten: ${(r.malts || []).filter((m) => !m.kochzugabe).map((m) => `${fmt(num(m.kg), 2)} kg ${m.name}`).join(', ') || '–'}`,
      `Hauptguss einfüllen: ${fmt(w.hauptguss)} l`,
      ...(w.nachguss > 0 ? [`Nachguss bereitstellen: ${fmt(w.nachguss)} l (auf 78 °C erwärmen)`] : []),
      ...(aufbereitung.length ? [`Wasser aufbereiten (gesamt): ${aufbereitung.join(', ')}`] : []),
    ],
  });

  schritte.push({
    id: 'einmaischen',
    titel: 'Einmaischen',
    typ: 'check',
    temp: num(r.einmaischTemp),
    text: `Hauptguss auf ${fmt(num(r.einmaischTemp), 0)} °C aufheizen, dann das Malz langsam einrühren.`,
    punkte: [`Hauptguss hat ${fmt(num(r.einmaischTemp), 0)} °C`, 'Malz klumpenfrei eingerührt'],
  });

  (r.rasten || []).forEach((ra, i) => {
    schritte.push({
      id: 'rast' + i,
      titel: ra.name || `Rast ${i + 1}`,
      typ: 'timer',
      dauer: num(ra.dauer),
      temp: num(ra.temp),
      text: `Auf ${fmt(num(ra.temp), 0)} °C aufheizen. Timer starten, sobald die Temperatur erreicht ist, und ${fmt(num(ra.dauer), 0)} Minuten halten.`,
    });
  });

  const vwh = hops.filter((h) => h.art === 'vwh');
  schritte.push({
    id: 'laeutern',
    titel: 'Abmaischen & Läutern',
    typ: 'check',
    text: 'Malzrohr ziehen und abtropfen lassen, mit dem Nachguss übergießen.',
    punkte: [
      'Malzrohr gezogen und abgetropft',
      ...(w.nachguss > 0 ? [`Nachguss gegeben: ${fmt(w.nachguss)} l mit 78 °C`] : []),
      ...vwh.map((h) => `Vorderwürzehopfen: ${hopfenText(h)}`),
      'Würze zum Kochen bringen',
    ],
    mess: [
      { feld: 'pfannevollL', label: 'Pfannevoll-Menge', einheit: 'l', soll: `${fmt(w.pfannevollHeiss)} l heiß` },
      { feld: 'pfannevollP', label: 'Pfannevoll-Würze', einheit: '°P', soll: `${fmt(k.pfannevollP)} °P / ${sg(k.pfannevollP)}` },
    ],
  });

  const ereignisse = [];
  hops.forEach((h, i) => {
    if (h.art !== 'kochen') return;
    const zeit = Math.min(num(h.zeit), kochzeit);
    ereignisse.push({ id: 'h' + i, bei: kochzeit - zeit, text: `Hopfengabe: ${hopfenText(h)}`, rest: zeit });
  });
  (r.malts || []).forEach((m, i) => {
    if (m.kochzugabe) ereignisse.push({ id: 'z' + i, bei: Math.max(0, kochzeit - 10), text: `${fmt(num(m.kg), 2)} kg ${m.name} einrühren`, rest: Math.min(10, kochzeit) });
  });
  ereignisse.sort((a, b) => a.bei - b.bei);
  schritte.push({
    id: 'kochen',
    titel: 'Würzekochen',
    typ: 'timer',
    dauer: kochzeit,
    temp: 100,
    text: `Timer starten, sobald die Würze wallend kocht. Kochzeit ${fmt(kochzeit, 0)} Minuten.`,
    ereignisse,
  });

  const wp = hops.filter((h) => h.art === 'whirlpool');
  schritte.push({
    id: 'whirlpool',
    titel: 'Whirlpool',
    typ: 'timer',
    dauer: wp.length ? Math.max(...wp.map((h) => num(h.zeit))) : 15,
    text: wp.length
      ? 'Heizung aus, Würze auf Whirlpooltemperatur abkühlen lassen, Hopfen geben und kräftig andrehen.'
      : 'Heizung aus, Würze kräftig andrehen und ruhen lassen, damit sich der Trub in der Mitte sammelt.',
    punkte: wp.map((h) => `Whirlpoolhopfen bei ${fmt(num(h.temp) || 85, 0)} °C: ${hopfenText(h)}`),
  });

  const temp = num(r.hefe?.temp) || 18;
  schritte.push({
    id: 'anstellen',
    titel: 'Kühlen & Anstellen',
    typ: 'check',
    text: `Würze auf Anstelltemperatur (${fmt(temp, 0)} °C) kühlen, in den Gärbehälter umfüllen und die Hefe zugeben.`,
    punkte: [
      `Würze auf ${fmt(temp, 0)} °C gekühlt`,
      'In den desinfizierten Gärbehälter umgefüllt',
      `Hefe gegeben: ${hefeMengeText(r.hefe)} ${r.hefe?.name || 'Hefe'}`,
    ],
    mess: [
      { feld: 'ausschlagL', label: 'Ausschlagmenge', einheit: 'l', soll: `${fmt(w.ausschlag)} l` },
      { feld: 'stammwuerzeP', label: 'Stammwürze', einheit: '°P', soll: `${fmt(k.sw)} °P / ${sg(k.sw)}` },
      { feld: 'anstellL', label: 'Menge im Gärfass', einheit: 'l', soll: `${fmt(w.gaerfass)} l` },
    ],
  });

  return schritte;
}

export function neuerBrautag() {
  return { idx: 0, timer: { laeuft: false, start: 0, basis: 0 }, gemeldet: {}, erledigt: {} };
}

export function vergangenMs(bt) {
  const t = bt.timer;
  return t.basis + (t.laeuft ? Date.now() - t.start : 0);
}

export function timerStart(bt) {
  if (bt.timer.laeuft) return;
  bt.timer.start = Date.now();
  bt.timer.laeuft = true;
}

export function timerPause(bt) {
  if (!bt.timer.laeuft) return;
  bt.timer.basis = vergangenMs(bt);
  bt.timer.laeuft = false;
}

export function timerReset(bt, stepId) {
  bt.timer = { laeuft: false, start: 0, basis: 0 };
  for (const key of Object.keys(bt.gemeldet)) if (key.startsWith(stepId + ':')) delete bt.gemeldet[key];
}

export function geheZu(bt, idx) {
  bt.idx = idx;
  bt.timer = { laeuft: false, start: 0, basis: 0 };
}

/** Liefert neu fällige Meldungen (Hopfengaben, Timerende) und merkt sie als gemeldet. */
export function pruefeAlarme(sud) {
  const bt = sud.brautag;
  if (!bt || !bt.timer.laeuft) return [];
  const schritt = baueSchritte(sud)[bt.idx];
  if (!schritt || schritt.typ !== 'timer') return [];
  const min = vergangenMs(bt) / 60000;
  const meldungen = [];
  for (const ev of schritt.ereignisse || []) {
    const key = `${schritt.id}:${ev.id}`;
    if (min >= ev.bei && !bt.gemeldet[key]) {
      bt.gemeldet[key] = true;
      meldungen.push(ev.text);
    }
  }
  const ende = `${schritt.id}:ende`;
  if (min >= schritt.dauer && !bt.gemeldet[ende]) {
    bt.gemeldet[ende] = true;
    meldungen.push(`${schritt.titel} beendet (${fmt(schritt.dauer, 0)} min)`);
  }
  return meldungen;
}

// ---------- Signalton, Benachrichtigung, Bildschirmsperre ----------

let audio = null;
export function tonVorbereiten() {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
  } catch {
    /* kein Ton verfügbar */
  }
}

export function signalton() {
  tonVorbereiten();
  if (!audio) return;
  const t0 = audio.currentTime;
  [0, 0.35, 0.7, 1.4, 1.75, 2.1].forEach((dt, i) => {
    const osz = audio.createOscillator();
    const gain = audio.createGain();
    osz.type = 'square';
    osz.frequency.value = i % 3 === 2 ? 1175 : 880;
    gain.gain.setValueAtTime(0.0001, t0 + dt);
    gain.gain.exponentialRampToValueAtTime(0.25, t0 + dt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.28);
    osz.connect(gain).connect(audio.destination);
    osz.start(t0 + dt);
    osz.stop(t0 + dt + 0.3);
  });
  navigator.vibrate?.([300, 150, 300, 150, 600]);
}

export function benachrichtigungErlauben() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
}

export function benachrichtige(titel, text) {
  try {
    if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
      new Notification(titel, { body: text, icon: 'icons/icon-192.png', tag: 'brewsaw' });
    }
  } catch {
    /* Benachrichtigungen sind optional */
  }
}

let sperre = null;
export async function bildschirmAnlassen(an) {
  try {
    if (an && 'wakeLock' in navigator) sperre = await navigator.wakeLock.request('screen');
    else if (!an && sperre) {
      await sperre.release();
      sperre = null;
    }
  } catch {
    sperre = null;
  }
  return !!sperre;
}
