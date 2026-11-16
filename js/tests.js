// Prüfrechnungen für calc.js – im Browser über tests.html ausführen.
import * as c from './calc.js';
import { BIBLIOTHEK as ALLE } from './bibliothek.js';
import { filtere } from './suche.js';
import { leseBeerXml } from './beerxml.js';
import * as g from './grainfather.js';

const ergebnisse = [];
function nahe(name, ist, soll, tol) {
  const ok = Math.abs(ist - soll) <= tol;
  ergebnisse.push({ name, ok, ist, soll, tol });
}

// Dichte
nahe('12 °P → SG 1,0484', c.platoToSg(12), 1.0484, 0.0005);
nahe('SG 1,050 → 12,4 °P', c.sgToPlato(1.05), 12.39, 0.05);
nahe('Plato ↔ SG Rundreise', c.sgToPlato(c.platoToSg(16)), 16, 0.05);

// Stammwürze: 4,5 kg Basismalz, SHA 65 %, 20 l
const ex = c.extraktAusSchuettung([{ kg: 4.5, potential: 80 }], 65);
nahe('Extrakt 4,5 kg × 65 %', ex.gesamt, 2.925, 0.001);
const sw = c.stammwuerze(ex.gesamt, 20);
nahe('Stammwürze ≈ 13,85 °P', sw, 13.85, 0.1);
nahe('Extrakt-Rundreise', c.extraktInWuerze(20, sw), 2.925, 0.001);
nahe('SHA aus Messwerten', c.sudhausausbeute([{ kg: 4.5, potential: 80 }], 20, sw), 65, 0.05);
nahe(
  'Zucker geht voll in die Würze',
  c.extraktAusSchuettung([{ kg: 1, potential: 100, kochzugabe: true }], 65).gesamt,
  1,
  1e-9,
);

// Bittere: Tinseth-Referenz – 60 min bei SG 1,050 → Ausnutzung 0,231
nahe('Tinseth 60 min, SG 1,050', c.tinseth(1.05, 60), 0.231, 0.002);
nahe('Tinseth 0 min', c.tinseth(1.05, 0), 0, 1e-9);
nahe(
  'IBU 28 g Dolden 10 % α in 20 l',
  c.hopfenIbu({ g: 28, alpha: 10, art: 'kochen', zeit: 60, form: 'dolden' }, 20, 1.05, 60),
  32.3,
  0.5,
);
nahe('Stopfhopfen ohne IBU', c.hopfenIbu({ g: 50, alpha: 10, art: 'stopfen' }, 20, 1.05, 60), 0, 0);
nahe('Isomerisierung bei 100 °C', c.isoFaktor(100), 1, 0.02);
nahe('Isomerisierung bei 80 °C', c.isoFaktor(80), 0.23, 0.02);

// Farbe: 4,5 kg Pilsner (3 EBC) in 20 l → ca. 6 EBC
nahe('Farbe Pilsner', c.farbeEbc([{ kg: 4.5, ebc: 3 }], 20), 6.0, 0.3);

// Alkohol: 12 °P → 3 °P scheinbar ≈ 4,9 % vol
const alk = c.alkohol(12, 3);
nahe('Alkohol 12 → 3 °P', alk.abv, 4.87, 0.1);
nahe('Scheinbarer Vergärungsgrad', alk.evg, 75, 0.01);

// Hefemenge
const he1 = c.hefeEmpfehlung(20, 12, { temp: 18 });
nahe('Hefe: 20 l obergärig ≈ 10 g = 1 Päckchen', he1.gramm + he1.pakete * 100, 110, 1e-9);
const he2 = c.hefeEmpfehlung(20, 12.6, { temp: 12 });
nahe('Hefe: 20 l untergärig ≈ 21 g = 2 Päckchen', he2.gramm + he2.pakete * 100, 221, 0.01);
nahe('Hefe: Starkbier obergärig braucht 2 Päckchen', c.hefeEmpfehlung(20, 22, { temp: 18 }).pakete, 2, 0);
nahe('Hefe: untergärig am Namen erkannt', c.hefeEmpfehlung(20, 12, { name: 'Untergärig – Lager' }).untergaerig ? 1 : 0, 1, 0);
nahe('Hefe: Mengentext', c.hefeMengeText({ menge: 1.5, einheit: 'Pkg.' }) === '1,5 Pkg.' && c.hefeMengeText({}) === '1 Pkg.' ? 1 : 0, 1, 0);

// Unvergärbarer Zucker und Totraum
const mitLaktose = c.kennzahlen(
  { ausschlagL: 20, sha: 65, kochzeit: 60, hauptgussLkg: 2.7, hefe: { evg: 80 }, hops: [],
    malts: [{ kg: 4, potential: 80 }, { kg: 0.65, potential: 100, kochzugabe: true, unvergaerbar: true }] },
  { totraumL: 3.5, verdampfungLh: 3, treberverlustLkg: 0.8 },
);
nahe('Laktose: 20 % des Extrakts bleiben unvergoren → Vergärungsgrad 64 %', (1 - mitLaktose.restP / mitLaktose.sw) * 100, 64, 0.01);
nahe('Totraum: Hauptguss = 4 kg × 2,7 l/kg + 3,5 l', mitLaktose.wasser.hauptguss, 14.3, 1e-9);

// Wassermengen
const w = c.wassermengen({
  schuettungKg: 4.5,
  ausschlagL: 20,
  kochzeit: 60,
  verdampfungLh: 3,
  treberverlustLkg: 0.9,
  trubverlustL: 2,
  hauptgussLkg: 4,
});
nahe('Gesamtwasser', w.gesamt, 27.05, 0.001);
nahe('Hauptguss', w.hauptguss, 18, 0.001);
nahe('Nachguss', w.nachguss, 9.05, 0.001);
nahe('Pfannevoll heiß', w.pfannevollHeiss, 23.96, 0.01);
nahe('Menge im Gärfass', w.gaerfass, 18, 0.001);

// Wasserchemie
const profil = { ca: 80, mg: 15, na: 10, so4: 40, cl: 20, hco3: 250 };
const h = c.haerte(profil);
nahe('Gesamthärte', h.gesamt, 14.65, 0.05);
nahe('Karbonathärte', h.kh, 11.49, 0.05);
nahe('Restalkalität', h.ra, 7.8, 0.05);
const beh = c.wasserBehandeln(profil, 27, { gips: 5 });
nahe('Gips hebt Calcium', beh.profil.ca, 80 + (5 * 232.8) / 27, 0.01);
nahe('Gips hebt Sulfat', beh.profil.so4, 40 + (5 * 557.7) / 27, 0.01);
const ml = c.milchsaeureFuerRa(h.ra, 0, 27);
nahe('Milchsäure für RA 0', ml, (h.ra * 0.3566 * 27) / 10.53, 0.001);
nahe('RA nach Säure = 0', c.wasserBehandeln(profil, 27, { milchsaeureMl: ml }).nach.ra, 0, 0.001);

// Karbonisierung
nahe('Rest-CO₂ bei 20 °C', c.restCo2(20), 1.66, 0.03);
nahe('Zucker für 5 g/l bei 20 °C', c.speisezucker(5, 20, 1).gL, 6.5, 0.2);

// Gesamtrechnung
const k = c.kennzahlen(
  {
    ausschlagL: 20,
    sha: 65,
    kochzeit: 60,
    hauptgussLkg: 4,
    malts: [{ kg: 4.5, ebc: 3, potential: 80 }],
    hops: [{ g: 28, alpha: 10, art: 'kochen', zeit: 60, form: 'dolden' }],
    hefe: { evg: 75 },
  },
  { verdampfungLh: 3, treberverlustLkg: 0.9, trubverlustL: 2, kesselL: 27 },
);
nahe('Kennzahlen: Stammwürze', k.sw, 13.85, 0.1);
nahe('Kennzahlen: Pfannevoll-Würze', k.pfannevollP, 12.15, 0.15);
nahe('Kennzahlen: Kessel reicht', k.kesselZuKlein ? 1 : 0, 0, 0);
nahe(
  'Kennzahlen: Bittere mit Pfannevoll-Dichte',
  k.ibu,
  c.hopfenIbu({ g: 28, alpha: 10, art: 'kochen', zeit: 60, form: 'dolden' }, 20, c.platoToSg(k.pfannevollP), 60),
  1e-9,
);

// Rezeptbibliothek: jedes Rezept muss vollständig und plausibel sein
const BIBLIOTHEK = ALLE.filter((r) => r.quelle === 'brewsaw');
const DOG = ALLE.filter((r) => r.quelle === 'brewdog');
nahe('BrewDog: 319 Rezepte geladen', DOG.length, 319, 0);
nahe(
  'BrewDog: alle Rezepte berechenbar',
  DOG.filter((r) => {
    const kz = c.kennzahlen(r, {});
    return [kz.sw, kz.ibu, kz.ebc, kz.abv].every(Number.isFinite) && kz.sw > 1.5 && kz.sw < 40 && r.malts.every((m) => m.kg > 0 && m.potential > 0) && r.hops.every((h) => h.alpha > 0 && h.art);
  }).length,
  DOG.length,
  0,
);
const punk = DOG.find((r) => r.name === 'Punk IPA 2010 - Current');
const punkKz = c.kennzahlen(punk, {});
nahe('BrewDog: Punk IPA trifft BrewDogs Stammwürze (1.055 ≈ 13,6 °P)', punkKz.sw, 13.57, 0.15);
nahe('BrewDog: Punk IPA Alkohol ≈ 5,6 %', punkKz.abv, 5.6, 0.4);
nahe('Bibliothek gesamt: eindeutige Kennungen', new Set(ALLE.map((r) => r.id)).size, ALLE.length, 0);
for (const r of BIBLIOTHEK) {
  const kz = c.kennzahlen(r, { verdampfungLh: 3, treberverlustLkg: 0.9, trubverlustL: 2, kesselL: 27 });
  const ok =
    r.malts.every((m) => m.potential > 0) &&
    r.hops.every((h) => h.alpha > 0) &&
    r.hefe.evg > 0 &&
    kz.sw > 7 && kz.sw < 24 && kz.ibu > 8 && kz.ibu < 90 && kz.abv > 2.5 && kz.abv < 11 &&
    !kz.kesselZuKlein;
  nahe(`Bibliothek: ${r.name} (${kz.sw.toFixed(1)} °P, ${kz.ibu.toFixed(0)} IBU, ${kz.ebc.toFixed(0)} EBC, ${kz.abv.toFixed(1)} %)`, ok ? 1 : 0, 1, 0);
}
nahe('Bibliothek: eindeutige Kennungen', new Set(BIBLIOTHEK.map((r) => r.id)).size, BIBLIOTHEK.length, 0);

// Suche
const eintraege = BIBLIOTHEK.map((r) => ({ r, k: c.kennzahlen(r, {}) }));
const leer = { q: '', kat: '', farbe: '', bittere: '', staerke: '', sort: '' };
const namen = (f) => filtere(eintraege, { ...leer, ...f }).map((e) => e.r.name);
nahe('Suche: ohne Filter alles', namen({}).length, BIBLIOTHEK.length, 0);
nahe('Filter: Quelle', filtere(ALLE.map((r) => ({ r, k: c.kennzahlen(r, {}) })), { ...leer, quelle: 'brewdog' }).length, DOG.length, 0);
nahe('Suche: „märzen“ findet Märzen', namen({ q: 'märzen' }).includes('Märzen') ? 1 : 0, 1, 0);
nahe('Suche: „maerzen“ und „MARZEN“ ebenso', namen({ q: 'maerzen' }).length + namen({ q: 'MARZEN' }).length, 2 * namen({ q: 'märzen' }).length, 0);
nahe('Suche: mehrere Wörter verknüpft', namen({ q: 'weizen stark' }).every((n) => /weizen|weisse/i.test(n)) && namen({ q: 'weizen stark' }).length > 0 ? 1 : 0, 1, 0);
nahe('Suche: Zutat „citra“', namen({ q: 'citra' }).includes('Citra SMaSH') ? 1 : 0, 1, 0);
nahe('Suche: Unsinn findet nichts', namen({ q: 'xyzzy' }).length, 0, 0);
nahe('Filter: Kategorie Stout & Porter', namen({ kat: 'sp' }).length, 5, 0);
nahe('Filter: dunkel + stark enthält Imperial Stout', namen({ farbe: 'dunkel', staerke: 'stark' }).includes('Imperial Stout') ? 1 : 0, 1, 0);
const nachIbu = filtere(eintraege, { ...leer, sort: 'ibu' }).map((e) => e.k.ibu);
nahe('Sortierung nach Bittere', nachIbu.every((v, i) => i === 0 || v >= nachIbu[i - 1]) ? 1 : 0, 1, 0);

// BeerXML-Import
const xml = `<?xml version="1.0"?><RECIPES><RECIPE><NAME>Testbier</NAME><VERSION>1</VERSION><TYPE>All Grain</TYPE>
<STYLE><NAME>Pale Ale</NAME></STYLE><BATCH_SIZE>23.0</BATCH_SIZE><BOIL_TIME>75</BOIL_TIME><EFFICIENCY>70</EFFICIENCY>
<HOPS><HOP><NAME>Cascade</NAME><ALPHA>6.5</ALPHA><AMOUNT>0.025</AMOUNT><USE>Boil</USE><TIME>60</TIME><FORM>Leaf</FORM></HOP>
<HOP><NAME>Citra</NAME><ALPHA>12</ALPHA><AMOUNT>0.05</AMOUNT><USE>Dry Hop</USE><TIME>4320</TIME></HOP></HOPS>
<FERMENTABLES><FERMENTABLE><NAME>Pale Malt</NAME><TYPE>Grain</TYPE><AMOUNT>5.0</AMOUNT><YIELD>80</YIELD><COLOR>3</COLOR></FERMENTABLE>
<FERMENTABLE><NAME>Cane Sugar</NAME><TYPE>Sugar</TYPE><AMOUNT>0.3</AMOUNT><YIELD>100</YIELD><COLOR>0</COLOR></FERMENTABLE></FERMENTABLES>
<YEASTS><YEAST><NAME>US-05</NAME><AMOUNT>0.0115</AMOUNT><AMOUNT_IS_WEIGHT>TRUE</AMOUNT_IS_WEIGHT><LABORATORY>Fermentis</LABORATORY><ATTENUATION>81</ATTENUATION><MIN_TEMPERATURE>18</MIN_TEMPERATURE><MAX_TEMPERATURE>22</MAX_TEMPERATURE></YEAST></YEASTS>
<MASH><NAME>Single</NAME><MASH_STEPS><MASH_STEP><NAME>Kombirast</NAME><TYPE>Infusion</TYPE><STEP_TEMP>67</STEP_TEMP><STEP_TIME>60</STEP_TIME></MASH_STEP></MASH_STEPS></MASH>
<NOTES>Notiz</NOTES></RECIPE></RECIPES>`;
const imp = leseBeerXml(xml)[0];
nahe('BeerXML: Name und Stil getrennt', imp.name === 'Testbier' && imp.stil === 'Pale Ale' ? 1 : 0, 1, 0);
nahe('BeerXML: Menge, Ausbeute (70 % × 0,8), Kochzeit', imp.ausschlagL + imp.sha + imp.kochzeit, 23 + 56 + 75, 1e-9);
nahe('BeerXML: Hopfen in Gramm', imp.hops[0].g, 25, 0);
nahe('BeerXML: Dolden erkannt', imp.hops[0].form === 'dolden' ? 1 : 0, 1, 0);
nahe('BeerXML: Stopfhopfen in Tagen', imp.hops[1].art === 'stopfen' ? imp.hops[1].zeit : -1, 3, 0);
nahe('BeerXML: Farbe Lovibond → EBC', imp.malts[0].ebc, 7, 0.5);
nahe('BeerXML: Zucker als Kochzugabe', imp.malts[1].kochzugabe ? 1 : 0, 1, 0);
nahe('BeerXML: Hefe', imp.hefe.name === 'Fermentis US-05' ? imp.hefe.evg + imp.hefe.temp : -1, 81 + 20, 0);
nahe('BeerXML: Hefemenge in Gramm', imp.hefe.einheit === 'g' ? imp.hefe.menge : -1, 11.5, 1e-9);
nahe('BeerXML: Maischplan', imp.rasten[0].temp + imp.rasten[0].dauer + imp.einmaischTemp, 67 + 60 + 67, 0);
let xmlFehler = 0;
try { leseBeerXml('<a><b></a>'); } catch { xmlFehler++; }
try { leseBeerXml('<RECIPES></RECIPES>'); } catch { xmlFehler++; }
nahe('BeerXML: ungültige Dateien werden abgelehnt', xmlFehler, 2, 0);

// Grainfather-Protokoll
const gleich = (name, ist, soll) => nahe(`${name}: „${ist}“`, ist === soll ? 1 : 0, 1, 0);
nahe('Grainfather: Befehle haben 19 Zeichen', g.paket('K1').length, 19, 0);
gleich('Grainfather: Heizung an', g.paket(g.BEFEHL.heizung(true)), 'K1                 ');
gleich('Grainfather: Pumpe aus', g.BEFEHL.pumpe(false), 'L0');
gleich('Grainfather: Solltemperatur', g.BEFEHL.solltemperatur(63), '$63,');
gleich('Grainfather: Solltemperatur mit Komma', g.BEFEHL.solltemperatur(66.5), '$66.5,');
gleich('Grainfather: Timer', g.BEFEHL.timer(40), 'S40,');
gleich('Grainfather: Displayname', g.displayName('Hopfensäge Pale Ale – Sud 3'), 'HOPFENSAEGE PALE AL');
const gz = g.leererZustand();
g.verarbeite(gz, 'X61.0,22.8,ZZZZZZ');
nahe('Grainfather: Soll- und Isttemperatur', gz.soll + gz.ist, 61 + 22.8, 1e-9);
g.verarbeite(gz, 'Y1,0,1,0,0,0,2,0,Z');
nahe('Grainfather: Heizung an, Pumpe aus, Stufe 2', (gz.heizung ? 1 : 0) + (gz.pumpe ? 10 : 0) + gz.stufe * 100, 201, 0);
g.verarbeite(gz, 'Y0,0,0,0,1,5,0,0,Z');
nahe('Grainfather: wartet auf Bestätigung (Code 5)', gz.wartet === true && gz.wartetCode === '5' ? 1 : 0, 1, 0);
g.verarbeite(gz, 'Y1,0,1,0,0,0,2,0,Z');
nahe('Grainfather: wartet nicht mehr', gz.wartet === false ? 1 : 0, 1, 0);
g.verarbeite(gz, 'T1,39,40,58,ZZZZZ');
nahe('Grainfather: Timer 39:58', gz.timerAktiv ? gz.restMin * 60 + gz.restSek : -1, 39 * 60 + 58, 0);
g.verarbeite(gz, 'W75,1,0,0,0,0,ZZZ');
nahe('Grainfather: Heizleistung und Pause', gz.heizleistung + (gz.timerPausiert ? 1 : 0), 76, 0);
g.verarbeite(gz, 'V0,1,ZZZZZZZZZZZZ');
nahe('Grainfather: Einheit °C erkannt', gz.celsius === true ? 1 : 0, 1, 0);
nahe('Grainfather: unbekannte Meldung wird ignoriert', g.verarbeite(gz, 'Qxyz') ? 1 : 0, 0, 0);
// Beispiel aus der Protokollbeschreibung: 75 min Kochen, 2 Rasten, 4 Hopfengaben
const gfRezept = {
  name: 'Saison', ausschlagL: 23, sha: 70, kochzeit: 75, hauptgussLkg: 3,
  malts: [{ kg: 5.2333, potential: 80, ebc: 3 }],
  hops: [75, 45, 30, 10, 10].map((zeit) => ({ g: 10, alpha: 5, art: 'kochen', zeit })),
  rasten: [{ temp: 65, dauer: 60 }, { temp: 75, dauer: 10 }],
};
const gfZeilen = g.rezeptBefehle(gfRezept, { verdampfungLh: 3, treberverlustLkg: 0.9, trubverlustL: 2 });
gleich('Grainfather: Rezeptkopf', gfZeilen[0], 'R75,2,15.7,15.8,');
gleich('Grainfather: Rezeptname', gfZeilen[2], 'SAISON');
gleich('Grainfather: Hopfenstopps', gfZeilen.slice(3, 8).join(' '), '0,4,0,0, 75, 45, 30, 10,');
gleich('Grainfather: Rasten', gfZeilen.slice(8).join(' '), '65:60, 75:10,');
nahe('Grainfather: alle Rezeptzeilen passen in ein Paket', gfZeilen.every((z) => z.length <= 19) ? 1 : 0, 1, 0);

// Echter Brewfather-Export: Vergleich mit den Werten aus Brewfather
// Die Datei ist ein privates Rezept und liegt nur lokal vor; ohne sie entfallen diese Prüfungen.
const bfAntwort = await fetch('tests/brewfather-imperial-stout.xml').catch(() => null);
if (bfAntwort?.ok) {
  const bfXml = await bfAntwort.text();
  const bfRoh = leseBeerXml(bfXml)[0];
  nahe('Brewfather: Ausschlag = 23 l im Gärfass + 1 l Trub', bfRoh.ausschlagL, 24, 0);
  nahe('Brewfather: Hauptguss aus der Datei', bfRoh.hauptgussL, 24.57, 1e-9);
  nahe('Brewfather: Hefe 4 Päckchen', bfRoh.hefe.einheit === 'Pkg.' ? bfRoh.hefe.menge : -1, 4, 0);
  nahe('Brewfather: Gärtemperatur 20 °C', bfRoh.hefe.temp, 20, 0);
  nahe('Brewfather: Malzfarbe Chocolate Pale 600 EBC', bfRoh.malts[1].ebc, 600, 0.5);
  nahe('Brewfather: Laktose unvergärbar', bfRoh.malts[2].unvergaerbar && bfRoh.malts[2].kochzugabe ? 1 : 0, 1, 0);
  nahe('Brewfather: Hopfen als Dolden, 120 g', bfRoh.hops[0].form === 'dolden' ? bfRoh.hops[0].g : -1, 120, 0);
  nahe('Brewfather: Wasserzusätze summiert (Gips 3,3 + 0,8 g)', bfRoh.wasser.gips, 4.1, 1e-9);
  nahe('Brewfather: Gewürze stehen in den Notizen', /Cardamom/.test(bfRoh.notizen) && /Cacao Nibs/.test(bfRoh.notizen) ? 1 : 0, 1, 0);
  // Rezept wie beim Import auf einer G30-Anlage (Totraum 3,5 l)
  const bfAnlage = { kesselL: 30, totraumL: 3.5, verdampfungLh: 3, treberverlustLkg: 0.8, trubverlustL: 1 };
  const bfKg = bfRoh.malts.filter((m) => !m.kochzugabe).reduce((s, m) => s + m.kg, 0);
  const bf = c.kennzahlen({ ...bfRoh, hauptgussLkg: (bfRoh.hauptgussL - 3.5) / bfKg }, bfAnlage);
  nahe('Brewfather: Stammwürze SG 1,095', bf.sg, 1.095, 0.002);
  nahe('Brewfather: Restextrakt SG 1,022 (Brewfather rechnet etwas höher vergoren)', c.platoToSg(bf.restP), 1.022, 0.004);
  nahe('Brewfather: Alkohol 9,58 % vol', bf.abv, 9.58, 0.5);
  nahe('Brewfather: Bittere 49,4 IBU', bf.ibu, 49.4, 1.5);
  nahe('Brewfather: Farbe 91,6 SRM = 180 EBC', bf.ebc, 180, 10);
  nahe('Brewfather: Hauptguss 24,57 l', bf.wasser.hauptguss, 24.57, 0.01);
  nahe('Brewfather: Pfannevoll 28 l', bf.wasser.pfannevollHeiss, 28, 0.2);
  nahe('Brewfather: 23 l im Gärfass', bf.wasser.gaerfass, 23, 1e-9);
}

const fehler = ergebnisse.filter((e) => !e.ok);
document.getElementById('out').innerHTML =
  `<h1>${fehler.length ? '❌ ' + fehler.length + ' Fehler' : '✅ Alle ' + ergebnisse.length + ' Prüfungen bestanden'}</h1>` +
  '<table>' +
  ergebnisse
    .map(
      (e) =>
        `<tr class="${e.ok ? 'ok' : 'bad'}"><td>${e.ok ? '✓' : '✗'}</td><td>${e.name}</td><td>${e.ist.toFixed(4)}</td><td>${e.soll} ± ${e.tol}</td></tr>`,
    )
    .join('') +
  '</table>';
window.__tests = { gesamt: ergebnisse.length, fehler };
