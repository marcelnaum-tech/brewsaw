import { state, speichern, exportJson, importJson, allesLoeschen, beispieleLaden, heute } from '../store.js';
import { bind, inp, sel, bestaetigen, download, toast } from '../ui.js';

export function themeAnwenden() {
  const t = state.settings.theme;
  if (t === 'hell' || t === 'dunkel') document.documentElement.dataset.theme = t === 'hell' ? 'light' : 'dark';
  else delete document.documentElement.dataset.theme;
}

export function einstellungenView(root) {
  const s = state.settings;
  const a = s.anlage;

  const zeichne = () => {
    root.innerHTML = `
      <header class="kopf"><div><h1>Einstellungen</h1><p class="muted">Brauanlage, Darstellung und Datensicherung</p></div></header>

      <section class="card">
        <h2>Brauanlage</h2>
        <div class="felder">
          ${inp('Bezeichnung', 'anlage.name', a.name, { type: 'text', cls: 'wide' })}
          ${inp('Kesselvolumen', 'anlage.kesselL', a.kesselL, { unit: 'l' })}
          ${inp('Ausschlagmenge (Standard)', 'anlage.ausschlagL', a.ausschlagL, { unit: 'l' })}
          ${inp('Sudhausausbeute (Standard)', 'anlage.sha', a.sha, { unit: '%' })}
          ${inp('Hauptguss (Standard)', 'anlage.hauptgussLkg', a.hauptgussLkg, { unit: 'l/kg' })}
          ${inp('Totraum unter dem Malzrohr', 'anlage.totraumL', a.totraumL, { unit: 'l' })}
          ${inp('Verdampfung', 'anlage.verdampfungLh', a.verdampfungLh, { unit: 'l/h' })}
          ${inp('Treberverlust', 'anlage.treberverlustLkg', a.treberverlustLkg, { unit: 'l/kg' })}
          ${inp('Trub- und Hopfenverlust', 'anlage.trubverlustL', a.trubverlustL, { unit: 'l' })}
        </div>
        <div class="leiste">
          <button class="btn" data-act="g30">Werte für Grainfather G30 eintragen</button>
          <button class="btn ghost" data-act="einkocher">Werte für Einkocher 27 l eintragen</button>
        </div>
        <p class="hinweis">Hauptguss = Schüttung × Verhältnis + Totraum. Beim Grainfather G30 sind das 2,7 l/kg + 3,5 l.</p>
        <p class="hinweis">Die Standardwerte gelten für neue Rezepte. Verdampfung und Verluste wirken sofort auf alle Rezepte;
          bereits angelegte Sude behalten ihre Werte. Tipp: Sudhausausbeute nach den ersten Suden an deine gemessenen Werte anpassen.</p>
      </section>

      <section class="card">
        <h2>Darstellung</h2>
        <div class="felder">${sel('Farbschema', 'theme', s.theme, [['auto', 'Wie das Gerät'], ['hell', 'Hell'], ['dunkel', 'Dunkel']])}</div>
      </section>

      <section class="card">
        <h2>Datensicherung</h2>
        <p class="hinweis">Alle Daten liegen nur in diesem Browser auf diesem Gerät. Lege regelmäßig eine Sicherung an –
          damit lassen sich die Daten auch auf ein anderes Gerät übertragen.</p>
        <div class="leiste">
          <button class="btn primary" data-act="export">Sicherung herunterladen</button>
          <button class="btn" data-act="import">Sicherung einlesen …</button>
          <input type="file" id="datei" accept="application/json,.json" hidden>
        </div>
        <div class="leiste">
          <button class="btn ghost" data-act="beispiele">Beispielrezepte hinzufügen</button>
          <button class="btn danger ghost" data-act="reset">Alle Daten löschen</button>
        </div>
        <p class="muted">${state.rezepte.length} Rezepte · ${state.sude.length} Sude · ${state.lager.length} Lagerposten</p>
      </section>

      <p class="hinweis">Brewsaw – Brauhelfer für Hobbybrauer. Alle Berechnungen sind Näherungen (Bittere nach Tinseth mit der Würzedichte vor dem Kochen, Farbe nach Morey,
        Alkohol nach Balling, Restalkalität nach Kolbach) und ersetzen keine eigenen Messungen.</p>`;
  };

  bind(root, s, (pfad) => {
    if (pfad === 'theme') themeAnwenden();
    speichern();
  });

  root.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    const VORGABEN = {
      g30: { name: 'Grainfather G30', kesselL: 30, ausschlagL: 24, sha: 60, hauptgussLkg: 2.7, totraumL: 3.5, verdampfungLh: 3, treberverlustLkg: 0.8, trubverlustL: 1 },
      einkocher: { name: 'Einkocher mit Malzrohr', kesselL: 27, ausschlagL: 20, sha: 65, hauptgussLkg: 4, totraumL: 0, verdampfungLh: 3, treberverlustLkg: 0.9, trubverlustL: 2 },
    };
    if (VORGABEN[act]) {
      if (!(await bestaetigen('Anlagenwerte überschreiben?', `Die Werte der Brauanlage werden durch die Vorgaben für „${VORGABEN[act].name}“ ersetzt. Bestehende Rezepte behalten ihr eigenes Hauptguss-Verhältnis.`, 'Eintragen'))) return;
      Object.assign(a, VORGABEN[act]);
      speichern();
      zeichne();
      toast(`Werte für „${a.name}“ eingetragen.`);
      return;
    }
    if (act === 'export') {
      download(`brewsaw-sicherung-${heute()}.json`, exportJson());
      toast('Sicherung wurde heruntergeladen.');
    } else if (act === 'import') {
      root.querySelector('#datei').click();
    } else if (act === 'beispiele') {
      beispieleLaden();
      zeichne();
      toast('Beispielrezepte hinzugefügt.');
    } else if (act === 'reset') {
      if (await bestaetigen('Wirklich alle Daten löschen?', 'Rezepte, Sude, Lager und Einstellungen werden unwiderruflich gelöscht. Lege vorher am besten eine Sicherung an.', 'Alles löschen')) {
        allesLoeschen();
        themeAnwenden();
        zeichne();
        toast('Alle Daten wurden gelöscht.');
      }
    }
  });

  root.addEventListener('change', async (e) => {
    if (e.target.id !== 'datei' || !e.target.files[0]) return;
    const datei = e.target.files[0];
    e.target.value = '';
    try {
      const text = await datei.text();
      JSON.parse(text);
      if (!(await bestaetigen('Sicherung einlesen?', 'Die aktuellen Daten in diesem Browser werden durch den Inhalt der Sicherung ersetzt.', 'Ersetzen'))) return;
      importJson(text);
      themeAnwenden();
      zeichne();
      toast('Sicherung wurde eingelesen.');
    } catch (err) {
      toast('Einlesen fehlgeschlagen: ' + (err.message || 'ungültige Datei'), { art: 'fehler', dauer: 6000 });
    }
  });

  zeichne();
}
