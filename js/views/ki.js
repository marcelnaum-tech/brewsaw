import { state } from '../store.js';
import {
  einstellungen, speichereEinstellungen, loescheSchluessel, frage, rezeptKontext, sudKontext,
  rezeptAusKi, REZEPT_FORMAT, STANDARD_MODELL,
} from '../ki.js';
import { esc, toast } from '../ui.js';

/** Entschärfter Text mit etwas Formatierung (fett, Aufzählungen, Zeilenumbrüche). */
const formatiere = (t) =>
  esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\s*[*-]\s+/gm, '• ')
    .replace(/\n/g, '<br>');

const SCHNELL = [
  ['Rezept prüfen', 'Prüfe dieses Rezept: Passt es zum Stil? Nenne Stärken, Schwächen und konkrete Verbesserungen (Schüttung, Hopfung, Hefe, Maischplan, Wasser).'],
  ['Wasser anpassen', 'Welche Wasseraufbereitung (Salze, Säure) empfiehlst du für dieses Rezept mit meinem Ausgangswasser? Nenne Zielwerte und begründe kurz.'],
  ['Gärung planen', 'Wie sollte ich Gärung, Temperaturführung, Reifung und Abfüllung für dieses Bier planen?'],
  ['Fehlersuche', 'Mein Bier hat ein Problem. Ich beschreibe es gleich – nenne die wahrscheinlichsten Ursachen und was ich beim nächsten Mal ändere.'],
];

export function kiView(root) {
  const verlauf = [];
  let laeuft = false;

  const zeichne = () => {
    const e = einstellungen();
    const hatKey = !!e.key;
    root.innerHTML = `
      <header class="kopf"><div><h1>KI-Hilfe</h1><p class="muted">Rezepte erstellen und prüfen, Fragen zum Brautag (Google Gemini)</p></div></header>

      <section class="card">
        <h2>Zugang</h2>
        ${
          hatKey
            ? `<p class="hinweis">Schlüssel gespeichert (nur in diesem Browser). Modell: <b>${esc(e.modell)}</b>.</p>`
            : `<p class="hinweis">Für die KI brauchst du einen eigenen, kostenlosen Gemini-Schlüssel: Melde dich bei
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">Google AI Studio</a>
                mit deinem Google-Konto an, erzeuge einen API-Schlüssel und füge ihn hier ein.</p>`
        }
        <div class="felder">
          <label class="fld wide"><span>Gemini-Schlüssel</span><input id="key" type="password" autocomplete="off" spellcheck="false" placeholder="${hatKey ? '••••••••  (zum Ändern neu eintragen)' : 'AIza…'}"></label>
          <label class="fld"><span>Modell</span><input id="modell" type="text" value="${esc(e.modell)}" spellcheck="false"></label>
        </div>
        <div class="leiste">
          <button class="btn primary" data-act="key-speichern">Speichern</button>
          ${hatKey ? '<button class="btn danger ghost" data-act="key-loeschen">Schlüssel entfernen</button>' : ''}
        </div>
        <p class="hinweis"><b>Datenschutz:</b> Der Schlüssel bleibt in diesem Browser, wird nicht in Sicherungen aufgenommen und nur an Google gesendet.
          Mit jeder Anfrage gehen die gewählten Rezept- und Messdaten sowie deine Frage an Google. Bei kostenlosen Gemini-Tarifen darf Google Eingaben
          laut den Nutzungsbedingungen zur Verbesserung seiner Dienste verwenden – sende also nichts, was privat bleiben soll.
          Wer die App auf einem fremden Gerät nutzt, sollte den Schlüssel danach entfernen.</p>
      </section>

      <section class="card">
        <h2>Rezept erstellen</h2>
        <p class="hinweis">Beschreibe das Bier. Das Ergebnis wird als neues Rezept angelegt und von der App nachgerechnet – prüfe Werte und Mengen vor dem Brauen.</p>
        <label class="fld wide"><span>Wunschbier</span><textarea id="wunsch" rows="3" placeholder="z. B. Fruchtiges Pale Ale mit Citra und Mosaic, ca. 5,5 % vol, 35 IBU, helle Farbe"></textarea></label>
        <div class="leiste"><button class="btn primary" data-act="erstellen" ${hatKey ? '' : 'disabled'}>Rezept erstellen</button></div>
        <p class="hinweis" id="erstellt"></p>
      </section>

      <section class="card">
        <h2>Fragen &amp; Prüfen</h2>
        <div class="felder">
          <label class="fld wide"><span>Bezug</span><select id="bezug">
            <option value="">Allgemeine Frage (ohne Rezept)</option>
            ${state.rezepte.length ? `<optgroup label="Rezepte">${state.rezepte.map((r) => `<option value="r:${esc(r.id)}">${esc(r.name)}</option>`).join('')}</optgroup>` : ''}
            ${state.sude.length ? `<optgroup label="Sude">${state.sude.map((s) => `<option value="s:${esc(s.id)}">Sud #${esc(s.nr)} ${esc(s.name)}</option>`).join('')}</optgroup>` : ''}
          </select></label>
        </div>
        <div class="leiste">${SCHNELL.map(([n], i) => `<button class="btn ghost" data-act="schnell" data-i="${i}" ${hatKey ? '' : 'disabled'}>${esc(n)}</button>`).join('')}</div>
        <div id="chat" class="ki-chat" aria-live="polite"></div>
        <label class="fld wide"><span>Deine Frage</span><textarea id="frage" rows="3" placeholder="z. B. Die Gärung steht seit 2 Tagen bei 1,030 – was kann ich tun?"></textarea></label>
        <div class="leiste">
          <button class="btn primary" data-act="senden" ${hatKey ? '' : 'disabled'}>Fragen</button>
          <button class="btn ghost" data-act="neu">Neues Gespräch</button>
        </div>
        <p class="hinweis">Antworten der KI können falsche Angaben enthalten. Verlasse dich bei Sicherheit und Messwerten auf eigene Prüfung.</p>
      </section>`;
    chat();
  };

  const chat = () => {
    const box = root.querySelector('#chat');
    box.innerHTML = verlauf
      .map((v) => `<div class="ki-msg ${v.rolle === 'user' ? 'ich' : 'ki'}"><span class="ki-wer">${v.rolle === 'user' ? 'Du' : 'KI'}</span>${formatiere(v.text)}</div>`)
      .join('');
    if (laeuft) box.insertAdjacentHTML('beforeend', '<div class="ki-msg ki"><span class="ki-wer">KI</span>denkt nach …</div>');
  };

  const kontext = () => {
    const v = root.querySelector('#bezug').value;
    if (v.startsWith('r:')) {
      const r = state.rezepte.find((x) => x.id === v.slice(2));
      return r ? rezeptKontext(r) : '';
    }
    if (v.startsWith('s:')) {
      const s = state.sude.find((x) => x.id === v.slice(2));
      return s ? sudKontext(s) : '';
    }
    return '';
  };

  const sende = async (eingabe) => {
    if (laeuft || !eingabe.trim()) return;
    laeuft = true;
    verlauf.push({ rolle: 'user', text: eingabe.trim() });
    chat();
    try {
      const ctx = kontext();
      const antwort = await frage(verlauf, { system: ctx ? 'Kontext zum aktuellen Gespräch:\n' + ctx : '' });
      verlauf.push({ rolle: 'model', text: antwort });
    } catch (err) {
      verlauf.pop();
      toast(err.message, { art: 'fehler', dauer: 7000 });
    } finally {
      laeuft = false;
      chat();
    }
  };

  root.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const akt = b.dataset.act;
    if (akt === 'key-speichern') {
      const neu = root.querySelector('#key').value.trim();
      const alt = einstellungen();
      try {
        speichereEinstellungen({ key: neu || alt.key, modell: root.querySelector('#modell').value.trim() || STANDARD_MODELL });
        toast('KI-Einstellungen gespeichert.');
        zeichne();
      } catch (err) {
        toast(err.message, { art: 'fehler' });
      }
    } else if (akt === 'key-loeschen') {
      loescheSchluessel();
      verlauf.length = 0;
      zeichne();
      toast('Schlüssel entfernt.');
    } else if (akt === 'neu') {
      verlauf.length = 0;
      chat();
    } else if (akt === 'schnell') {
      sende(SCHNELL[Number(b.dataset.i)][1]);
    } else if (akt === 'senden') {
      const feld = root.querySelector('#frage');
      const t = feld.value;
      feld.value = '';
      sende(t);
    } else if (akt === 'erstellen') {
      const wunsch = root.querySelector('#wunsch').value.trim();
      if (!wunsch) return toast('Bitte beschreibe zuerst das Bier.');
      if (laeuft) return;
      laeuft = true;
      b.disabled = true;
      const ausgabe = root.querySelector('#erstellt');
      ausgabe.textContent = 'Die KI entwirft das Rezept …';
      try {
        const a = state.settings.anlage;
        const antwort = await frage(
          [{ rolle: 'user', text: `Entwirf ein Rezept für folgendes Bier: ${wunsch}\nAusschlagmenge ${a.ausschlagL} l, Sudhausausbeute ${a.sha} %, Kochzeit 60 min.\n${REZEPT_FORMAT}` }],
          { json: true },
        );
        const r = rezeptAusKi(antwort);
        ausgabe.innerHTML = `Rezept „${esc(r.name)}" wurde angelegt. <a href="#/rezept/${esc(r.id)}">Rezept öffnen ›</a>`;
      } catch (err) {
        ausgabe.textContent = '';
        toast(err.message, { art: 'fehler', dauer: 7000 });
      } finally {
        laeuft = false;
        b.disabled = false;
      }
    }
  });

  zeichne();
}
