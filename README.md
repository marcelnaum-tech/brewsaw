# Brewsaw – Brauhelfer

Web-App (PWA) für Hobbybrauer mit Einkocher/Malzrohr-Anlage.

- **Rezeptrechner** – Stammwürze, Bittere (Tinseth), Farbe (Morey), Alkohol (Balling), Wassermengen
- **Rezeptbibliothek** – 45 eigene Rezepte klassischer Bierstile und 319 Rezepte aus BrewDogs „DIY Dog“, mit Suche, Filtern und Tags; Import von BeerXML-Dateien
- **Grainfather-Anbindung** – Bluetooth-Verbindung zur G30-Steuerung im Brautag-Assistenten (nur Chrome/Edge)
- **Wasserrechner** – Haupt-/Nachguss, Restalkalität (Kolbach), Brausalze, Milchsäure, Sauermalz
- **Brautag-Assistent** – Schritt für Schritt mit Timern und Alarm für Rasten und Hopfengaben
- **Etiketten** – zu jedem Rezept lässt sich ein Bild hinterlegen
- **Sud- und Gärprotokoll** – Messwerte, Gärverlauf als Diagramm, Karbonisierungsrechner
- **Zutatenlager** – Bestand führen, beim Anlegen eines Suds abbuchen

## Starten

Doppelklick auf `start.bat` (benötigt Python, startet `server.py`) – die App öffnet sich unter <http://localhost:5173/>.

Die App braucht keinen Build-Schritt: reines HTML, CSS und JavaScript. Der Ordner kann unverändert
auf jeden statischen Webspace kopiert werden; über HTTPS lässt sie sich dann auf Handy und Tablet
installieren und funktioniert offline.

## Grainfather (Bluetooth)

Im Brautag-Assistenten lässt sich die G30-Steuerung per Web Bluetooth verbinden: Ist- und Solltemperatur,
Heizung, Pumpe und Timer werden live angezeigt; Solltemperatur, Heizung und Pumpe lassen sich schalten, der
Rast-Timer kann beim Erreichen der Temperatur automatisch starten, und der Maischplan kann an die Steuerung
übertragen werden.

- Funktioniert nur in Chrome oder Edge (Windows, macOS, Android), nicht in Firefox, Safari oder auf dem iPhone.
- Die Grainfather-App muss getrennt sein – die Steuerung erlaubt nur eine Bluetooth-Verbindung.
- Das Protokoll ist nicht offiziell dokumentiert; Grundlage ist
  <https://github.com/clausbroch/Grainfather-Bluetooth-Protocol>. Die Anlage nie unbeaufsichtigt heizen lassen.

## Rezeptquellen

- Eigene Rezepte: `js/bibliothek.js`.
- BrewDog „DIY Dog“: `js/bibliothek-diydog.js`, erzeugt mit `tools/diydog_umwandeln.py` aus dem Datensatz
  <https://github.com/sammdec/punkapi>. Laut dessen Lizenz frei nutzbar und teilbar, **nicht für kommerzielle Zwecke**.
  BrewDog nennt keine Alphasäuren und Malzfarben; die App ergänzt typische Werte.
- Rezepte von Brewer's Friend, Brewfather u. a. lassen sich dort als BeerXML exportieren und hier importieren.

## Android-App

Die Android-App ist eine „Trusted Web Activity": Sie öffnet die veröffentlichte Web-App in Chrome ohne
Adressleiste. Dadurch funktionieren Bluetooth (Grainfather), Offline-Betrieb und Benachrichtigungen wie im Browser,
und Aktualisierungen der Web-App kommen ohne neue APK an.

- Web-App online: <https://marcelnaum-tech.github.io/brewsaw/>
- Verknüpfungsdatei: <https://marcelnaum-tech.github.io/.well-known/assetlinks.json> (Repository `marcelnaum-tech.github.io`)
- Projekt: `android/` (nur Manifest und Ressourcen, kein eigener Programmcode).
- Adresse der Web-App und App-Kennung: `android/gradle.properties`.
- Bauen: `android/bauen.bat` – erzeugt `android/Brewsaw.apk`.
- Werkzeuge (Java, Gradle, Android-SDK) liegen portabel in `.android-tools/` und sind nicht Teil des Repositorys.
- Der Signaturschlüssel (`android/*.keystore`, `android/keystore.properties`) liegt nur lokal. **Unbedingt sichern** –
  ohne ihn lässt sich die App später nicht mehr aktualisieren.
- Damit die Adressleiste verschwindet, muss auf dem Host die Datei `/.well-known/assetlinks.json` mit dem
  Fingerabdruck des Signaturschlüssels liegen.

## Daten

Alle Daten liegen lokal im Browser (localStorage, Bilder in der IndexedDB). Unter *Einstellungen → Datensicherung* lässt sich
eine Sicherungsdatei herunterladen und wieder einlesen.

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `js/calc.js` | Brauberechnungen (reine Funktionen) |
| `js/tests.js`, `tests.html` | Prüfrechnungen – `http://localhost:5173/tests.html` öffnen |
| `js/store.js` | Datenhaltung, Lager, Export/Import |
| `js/data.js` | Stammdaten für Malz, Hopfen, Hefe, Kategorien |
| `js/bibliothek.js` | Rezeptbibliothek (20 l, 65 % Sudhausausbeute) |
| `js/bibliothek-diydog.js` | BrewDog-Rezepte (automatisch erzeugt) |
| `js/grainfather.js` | Bluetooth-Protokoll und Verbindung zur G30-Steuerung |
| `js/suche.js` | Suche, Filter und Sortierung |
| `js/beerxml.js` | BeerXML-Import |
| `js/brautag.js` | Brautag-Ablauf, Timer, Alarme |
| `js/views/` | Ansichten |
| `sw.js`, `manifest.webmanifest` | Offline-Betrieb und Installation |
