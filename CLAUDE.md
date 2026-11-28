# Brewsaw – Hinweise für Claude

Brauhelfer als Web-App (PWA) für Hobbybrauer, mit Android-Hülle (TWA). Veröffentlicht über GitHub Pages:
<https://marcelnaum-tech.github.io/brewsaw/>. Sprache der Oberfläche, Kommentare und Commits: **Deutsch**.

## Aufbau
- Vanilla-JavaScript mit ES-Modulen, **kein Build-Schritt**. `index.html` lädt `js/app.js`.
- `js/calc.js` Rechenkern · `js/store.js` Zustand (localStorage) · `js/views/*.js` Ansichten · `js/ui.js` Helfer.
- `js/bibliothek.js` (45 eigene Rezepte) und `js/bibliothek-diydog.js` (319 BrewDog-Rezepte, **generiert** von `tools/diydog_umwandeln.py`, nicht von Hand ändern).
- `js/ki.js` KI-Anbindung (Google Gemini, Schlüssel nur im Browser des Nutzers) · `js/grainfather.js` Bluetooth.
- `sw.js` Service Worker · `android/` Gradle-Projekt (Hilfsprogramme in `.android-tools/`, nicht im Repo).

## Lokal arbeiten
- Server: `python server.py 5199` (oder `start.bat`). **Nicht Port 5173** – dort läuft ein anderes Projekt.
- Tests: `http://localhost:5199/tests.html` im Browser öffnen. Erwartet „Alle … Prüfungen bestanden" (aktuell 172).
  Neue Berechnungen bekommen Prüfungen in `js/tests.js`. Test-Browser-Daten danach mit `localStorage.clear()` entfernen.

## Regeln, die man leicht vergisst
- **Bei jeder ausgelieferten Änderung** `CACHE` in `sw.js` erhöhen (`brewsaw-vNN`) und neue Dateien in `DATEIEN` eintragen.
  Sonst sehen Nutzer die alte Version.
- **Texte aus fremden Quellen** (Import, KI, Backup) nie ungeprüft in HTML einsetzen: immer `esc()`; technische Felder laufen durch
  `bereinige()` in `store.js`. Die Sicherheitsrichtlinie (CSP) steht in `index.html`; neue externe Adressen nur dort ergänzen.
- KI-Antworten sind nicht vertrauenswürdig: nur über `bereinigeKiRezept()` zu Rezepten machen.
- Der Gemini-Schlüssel gehört nie in `state`, Sicherungen, Logs oder den Code.
- Bluetooth zum Grainfather: **beim Verbinden keine Befehle senden** (löste Dauerpiepen aus).

## Rechtliches
- BrewDog-Rezepte sind nur **nicht-kommerziell** nutzbar und nur als Zutaten-/Verfahrensangaben; keine Beschreibungstexte
  (Tipps, Besonderheiten) übernehmen. Brewsaw darf nicht kommerziell genutzt werden, solange sie enthalten sind.
- Namen wie BrewDog, Grainfather, Brewfather nur zur Herkunfts-/Kompatibilitätsangabe; kein Anschein einer Verbindung.
- Code steht unter MIT (`LICENSE`), außer `js/bibliothek-diydog.js`.

## Geheimnisse und Privates – nicht lesen, ändern oder einchecken
- `android/brewsaw.keystore`, `android/keystore.properties`, `*.jks` (Signaturschlüssel; ohne sie gibt es keine Updates der APK).
- `tests/` (private Brewfather-Exportdatei) und `.claude/`.
- Ein Hook in `.claude/hooks/` blockiert den Zugriff darauf.

## Git
- Commit-Nachrichten auf Deutsch, kurz und sachlich; Attribution-Zeile laut Vorgabe der Sitzung.
- **Kein** Umschreiben des Verlaufs und kein `--force` ohne ausdrückliche Zusage des Nutzers.
- Nach dem Push prüfen, ob die Live-Seite die neue Version ausliefert.

## Android
- `android/bauen.bat` baut die APK. Nur nötig bei Änderungen am Android-Teil oder Manifest; Web-Änderungen kommen ohne neue APK an.
