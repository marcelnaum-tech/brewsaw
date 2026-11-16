// Rezeptbibliothek: eigene Rezepte für klassische Bierstile.
// Alle Rezepte sind auf 20 l Ausschlagwürze und 65 % Sudhausausbeute ausgelegt;
// beim Übernehmen werden sie auf die eigene Anlage umgerechnet.
import { MALZE, HOPFEN, HEFEN } from './data.js';
import { DIYDOG } from './bibliothek-diydog.js';

export const BIB_AUSSCHLAG = 20;
export const BIB_SHA = 65;

const kombi = (t) => ({ einm: t + 1, rasten: [['Kombirast', t, 60], ['Abmaischen', 78, 5]] });
const RASTEN = {
  std: { einm: 60, rasten: [['Maltoserast', 63, 40], ['Verzuckerungsrast', 72, 25], ['Abmaischen', 78, 5]] },
  eiweiss: { einm: 57, rasten: [['Eiweißrast', 55, 10], ['Maltoserast', 63, 35], ['Verzuckerungsrast', 72, 25], ['Abmaischen', 78, 5]] },
  weizen: { einm: 47, rasten: [['Ferulasäurerast', 45, 10], ['Maltoserast', 63, 35], ['Verzuckerungsrast', 72, 25], ['Abmaischen', 78, 5]] },
  k64: kombi(64),
  k66: kombi(66),
  k67: kombi(67),
  k68: kombi(68),
};
const ART = { k: 'kochen', v: 'vwh', w: 'whirlpool', s: 'stopfen' };

// [Name, Stil, Kategorie, Tags, Malze [Name, kg], Hopfen [Name, g, Art, Zeit, (°C)], Hefe, Maischplan, Notizen, Optionen]
const ROH = [
  // ---------- Untergärig hell ----------
  ['Bayrisch Hell', 'Helles', 'uh', 'klassisch, süffig, einsteiger',
    [['Pilsner Malz', 3.9], ['Carahell', 0.2]],
    [['Hallertauer Tradition', 22, 'k', 60], ['Hallertauer Mittelfrüh', 15, 'k', 10]],
    'W-34/70', 'std', 'Klassisches Helles. Kalt vergären, danach 4–6 Wochen kalt lagern.', { koch: 70 }],
  ['Böhmisches Pilsner', 'Böhmisches Pilsner', 'uh', 'klassisch, hopfig, saazer',
    [['Pilsner Malz', 4.0], ['Carapils', 0.2], ['Carahell', 0.1]],
    [['Saazer', 50, 'k', 70], ['Saazer', 30, 'k', 20], ['Saazer', 30, 'k', 5]],
    'S-23', 'eiweiss', 'Weiches Wasser verwenden. Die drei Saazer-Gaben sorgen für die typische würzige Hopfennote.', { koch: 80 }],
  ['Norddeutsches Pils', 'Deutsches Pilsner', 'uh', 'klassisch, herb, schlank',
    [['Pilsner Malz', 3.9]],
    [['Magnum', 14, 'k', 70], ['Tettnanger', 20, 'k', 15], ['Tettnanger', 20, 'k', 5]],
    'W-34/70', 'std', 'Trocken und herb. Restalkalität möglichst unter 0 °dH einstellen.', { koch: 70 }],
  ['Dortmunder Export', 'Export', 'uh', 'klassisch, vollmundig',
    [['Pilsner Malz', 4.0], ['Münchner Malz Typ I', 0.4]],
    [['Perle', 20, 'k', 60], ['Hallertauer Tradition', 15, 'k', 15]],
    'W-34/70', 'std', 'Etwas kräftiger als ein Helles, ausgewogen zwischen Malz und Hopfen.'],
  ['Fränkisches Kellerbier', 'Kellerbier / Zwickl', 'uh', 'unfiltriert, süffig, bernstein',
    [['Pilsner Malz', 2.8], ['Wiener Malz', 1.0], ['Münchner Malz Typ I', 0.3]],
    [['Perle', 18, 'k', 60], ['Hersbrucker', 20, 'k', 10]],
    'W-34/70', 'std', 'Jung und naturtrüb trinken, mit wenig Kohlensäure (ca. 4 g/l).'],
  ['Märzen', 'Märzen / Festbier', 'uh', 'bernstein, malzig, herbst',
    [['Wiener Malz', 2.5], ['Münchner Malz Typ I', 1.5], ['Pilsner Malz', 0.5]],
    [['Hallertauer Tradition', 30, 'k', 60], ['Hallertauer Mittelfrüh', 15, 'k', 10]],
    'W-34/70', 'std', 'Mindestens 6 Wochen kalt lagern – traditionell im März gebraut, im Herbst getrunken.', { koch: 70 }],
  ['Wiener Lager', 'Wiener Lager', 'uh', 'bernstein, malzig, elegant',
    [['Wiener Malz', 3.6], ['Münchner Malz Typ II', 0.4], ['Carafa Typ II', 0.03]],
    [['Perle', 20, 'k', 60], ['Tettnanger', 15, 'k', 10]],
    'W-34/70', 'std', 'Kupferfarben mit leicht röstiger Malznote und trockenem Abgang.'],

  // ---------- Untergärig dunkel & stark ----------
  ['Münchner Dunkel', 'Münchner Dunkel', 'ud', 'dunkel, malzig, klassisch',
    [['Münchner Malz Typ II', 3.2], ['Pilsner Malz', 0.8], ['Caramünch Typ II', 0.2], ['Carafa Spezial Typ III', 0.08]],
    [['Hallertauer Tradition', 25, 'k', 60]],
    'W-34/70', 'std', 'Brotig-malzig mit dezenter Bittere. Verträgt härteres Wasser gut.'],
  ['Schwarzbier', 'Schwarzbier', 'ud', 'dunkel, röstig, schlank',
    [['Pilsner Malz', 2.6], ['Münchner Malz Typ I', 1.2], ['Caramünch Typ II', 0.2], ['Carafa Spezial Typ III', 0.2]],
    [['Perle', 20, 'k', 60], ['Tettnanger', 15, 'k', 10]],
    'W-34/70', 'std', 'Entspelztes Röstmalz gibt Farbe ohne kratzige Röstbittere. Röstmalz erst zum Abmaischen zugeben.'],
  ['Maibock', 'Heller Bock', 'ud', 'stark, hell, frühling',
    [['Pilsner Malz', 4.2], ['Wiener Malz', 1.2], ['Carahell', 0.3]],
    [['Magnum', 16, 'k', 60], ['Hallertauer Mittelfrüh', 20, 'k', 10]],
    'W-34/70', 'std', 'Doppelte Hefemenge anstellen und 8 Wochen kalt lagern.', { hg: 3.5, koch: 70 }],
  ['Doppelbock', 'Doppelbock', 'ud', 'stark, dunkel, winter, malzig',
    [['Münchner Malz Typ II', 4.0], ['Pilsner Malz', 1.8], ['Caramünch Typ III', 0.3], ['Carafa Typ II', 0.05]],
    [['Magnum', 14, 'k', 60]],
    'W-34/70', 'std', 'Starkbier: doppelte Hefemenge, lange kalte Lagerung (mindestens 10 Wochen).', { hg: 3.3, koch: 90 }],
  ['Bamberger Rauchbier', 'Rauchbier', 'ud', 'rauch, bernstein, speziell',
    [['Rauchmalz', 3.0], ['Münchner Malz Typ I', 1.0], ['Caramünch Typ II', 0.2], ['Carafa Typ II', 0.05]],
    [['Hallertauer Tradition', 28, 'k', 60]],
    'W-34/70', 'std', 'Rauchanteil über das Verhältnis Rauchmalz zu Münchner Malz steuern.'],

  // ---------- Obergärig deutsch ----------
  ['Kölner Art', 'Kölsch-Art', 'og', 'hell, schlank, obergärig, einsteiger',
    [['Pilsner Malz', 3.4], ['Weizenmalz hell', 0.4]],
    [['Hallertauer Tradition', 22, 'k', 60], ['Tettnanger', 15, 'k', 10]],
    'K-97', 'std', 'Kühl obergärig vergären (16–18 °C) und anschließend 3 Wochen kalt lagern.'],
  ['Düsseldorfer Art', 'Altbier', 'og', 'kupfer, herb, obergärig',
    [['Pilsner Malz', 2.4], ['Münchner Malz Typ II', 1.4], ['Caramünch Typ II', 0.2], ['Carafa Typ II', 0.05]],
    [['Magnum', 16, 'k', 60], ['Spalter Select', 20, 'k', 15]],
    'K-97', 'std', 'Kräftig gehopft und kühl vergoren – das obergärige Gegenstück zum Lager.'],
  ['Roggenbier', 'Roggenbier', 'og', 'roggen, würzig, trüb',
    [['Roggenmalz', 2.0], ['Münchner Malz Typ I', 1.4], ['Pilsner Malz', 0.6], ['Caramünch Typ II', 0.2]],
    [['Hallertauer Tradition', 22, 'k', 60]],
    'Munich Classic', 'weizen', 'Roggen macht die Maische zäh: langsam läutern und eine Rast bei 45 °C einlegen.'],

  // ---------- Weizen & Wit ----------
  ['Helles Hefeweizen', 'Hefeweizen', 'wz', 'weizen, fruchtig, klassisch, sommer',
    [['Weizenmalz hell', 2.2], ['Pilsner Malz', 1.6], ['Carahell', 0.1]],
    [['Hallertauer Tradition', 14, 'k', 60]],
    'Munich Classic', 'weizen', 'Wärmer vergären für mehr Banane, kühler für mehr Nelke. Mit 6–7 g/l CO₂ abfüllen.'],
  ['Dunkles Hefeweizen', 'Dunkles Weizen', 'wz', 'weizen, dunkel, malzig',
    [['Weizenmalz dunkel', 2.2], ['Münchner Malz Typ II', 1.3], ['Pilsner Malz', 0.3], ['Carafa Spezial Typ III', 0.05]],
    [['Hallertauer Tradition', 14, 'k', 60]],
    'Munich Classic', 'weizen', 'Karamellig und bananig – die malzige Schwester des hellen Weizens.'],
  ['Weizenbock', 'Weizenbock', 'wz', 'weizen, stark, winter',
    [['Weizenmalz hell', 3.0], ['Münchner Malz Typ II', 1.8], ['Pilsner Malz', 0.8], ['Caramünch Typ II', 0.3]],
    [['Magnum', 10, 'k', 60]],
    'Munich Classic', 'weizen', 'Kräftiges Weizenstarkbier, das einige Monate Flaschenreifung gut verträgt.', { hg: 3.4 }],
  ['Hopfenweisse', 'Hopfenweisse', 'wz', 'weizen, hopfig, stark, modern',
    [['Weizenmalz hell', 3.0], ['Pilsner Malz', 2.3]],
    [['Magnum', 16, 'k', 60], ['Mandarina Bavaria', 30, 'w', 15, 80], ['Hallertau Blanc', 40, 's', 4]],
    'WB-06', 'weizen', 'Weizenbock trifft Hopfenaroma: Stopfhopfen nach Abklingen der Hauptgärung geben.', { hg: 3.6 }],
  ['Belgisches Witbier', 'Witbier', 'wz', 'weizen, belgisch, gewürz, sommer',
    [['Pilsner Malz', 2.0], ['Weizenflocken', 1.6], ['Haferflocken', 0.2]],
    [['Saazer', 30, 'k', 60]],
    'Wit', 'eiweiss', 'Fünf Minuten vor Kochende 15 g geschroteten Koriander und 20 g Bitterorangenschale zugeben.'],

  // ---------- Ale & IPA ----------
  ['Hopfensäge Pale Ale', 'American Pale Ale', 'al', 'hopfig, einsteiger, cascade',
    [['Pale Ale Malz', 4.2], ['Carared', 0.3]],
    [['Magnum', 14, 'k', 60], ['Cascade', 20, 'k', 10], ['Cascade', 30, 'w', 15, 80], ['Cascade', 40, 's', 4]],
    'US-05', 'k67', 'Stopfhopfen nach Abklingen der Hauptgärung für ca. 4 Tage geben.'],
  ['English Bitter', 'Best Bitter', 'al', 'englisch, leicht, session',
    [['Maris Otter', 3.2], ['Caramünch Typ II', 0.25]],
    [['East Kent Goldings', 30, 'k', 60], ['East Kent Goldings', 20, 'k', 10], ['Fuggles', 15, 'w', 10, 90]],
    'S-04', 'k67', 'Wenig Kohlensäure (3,5–4 g/l) und nicht zu kalt servieren.'],
  ['Extra Special Bitter', 'ESB', 'al', 'englisch, malzig, bernstein',
    [['Maris Otter', 4.2], ['Caramünch Typ II', 0.35]],
    [['Challenger', 25, 'k', 60], ['East Kent Goldings', 25, 'k', 10]],
    'S-04', 'k67', 'Karamellige Malznote mit erdig-blumigem englischem Hopfen.'],
  ['West Coast IPA', 'American IPA', 'al', 'hopfig, bitter, citrus, stark',
    [['Pale Ale Malz', 5.0], ['Carahell', 0.3], ['Münchner Malz Typ I', 0.3]],
    [['Magnum', 25, 'k', 60], ['Centennial', 25, 'k', 10], ['Citra', 40, 'w', 20, 80], ['Simcoe', 40, 'w', 20, 80], ['Citra', 50, 's', 4], ['Simcoe', 50, 's', 4]],
    'US-05', 'k66', 'Sulfatbetontes Wasser betont die Bittere. Frisch trinken – Hopfenaroma baut schnell ab.', { hg: 3.6 }],
  ['New England IPA', 'Hazy IPA', 'al', 'hopfig, trüb, fruchtig, saftig, modern',
    [['Pale Ale Malz', 4.0], ['Haferflocken', 0.8], ['Weizenmalz hell', 0.6]],
    [['Magnum', 6, 'k', 60], ['Citra', 50, 'w', 20, 80], ['Mosaic', 50, 'w', 20, 80], ['Citra', 60, 's', 3], ['Mosaic', 60, 's', 3]],
    'S-04', 'k67', 'Chloridbetontes Wasser für ein weiches Mundgefühl. Sauerstoff beim Stopfen und Abfüllen unbedingt vermeiden.', { hg: 3.6 }],
  ['Session IPA', 'Session IPA', 'al', 'hopfig, leicht, sommer',
    [['Pale Ale Malz', 3.3], ['Carahell', 0.2], ['Haferflocken', 0.2]],
    [['Magnum', 8, 'k', 60], ['Amarillo', 30, 'k', 5], ['Mosaic', 40, 'w', 15, 80], ['Amarillo', 40, 's', 4]],
    'US-05', 'k68', 'Viel Hopfenaroma bei wenig Alkohol. Die höhere Rasttemperatur hält etwas Körper im Bier.'],
  ['Amber Ale', 'American Amber Ale', 'al', 'bernstein, karamell, hopfig',
    [['Pale Ale Malz', 3.8], ['Caramünch Typ II', 0.4], ['Carared', 0.2]],
    [['Magnum', 12, 'k', 60], ['Cascade', 25, 'k', 10], ['Centennial', 25, 'w', 15, 80]],
    'US-05', 'k67', 'Karamellmalz und amerikanischer Hopfen im Gleichgewicht.'],
  ['Nussbraunes Ale', 'English Brown Ale', 'al', 'englisch, braun, nussig, malzig',
    [['Maris Otter', 3.8], ['Caramünch Typ III', 0.3], ['Carafa Typ I', 0.12]],
    [['Fuggles', 35, 'k', 60], ['East Kent Goldings', 15, 'k', 10]],
    'S-04', 'k67', 'Nussig-karamellig mit zurückhaltender Bittere.'],
  ['Irish Red Ale', 'Irish Red Ale', 'al', 'rot, malzig, süffig',
    [['Pale Ale Malz', 3.8], ['Carared', 0.3], ['Röstgerste', 0.06]],
    [['East Kent Goldings', 30, 'k', 60]],
    'S-04', 'k67', 'Die kleine Menge Röstgerste sorgt für die rote Farbe und einen trockenen Abgang.'],
  ['Sommer Blonde', 'Blonde Ale', 'al', 'hell, leicht, sommer, einsteiger',
    [['Pilsner Malz', 3.4], ['Weizenmalz hell', 0.3], ['Carahell', 0.2]],
    [['Perle', 14, 'k', 60], ['Mandarina Bavaria', 20, 'k', 5]],
    'US-05', 'k66', 'Unkompliziertes, schnell trinkfertiges Bier – ideal für den ersten Sud.'],
  ['Citra SMaSH', 'Single Hop Pale Ale', 'al', 'smash, hopfig, citrus, einsteiger',
    [['Pale Ale Malz', 4.4]],
    [['Citra', 8, 'k', 60], ['Citra', 20, 'k', 10], ['Citra', 40, 'w', 15, 80], ['Citra', 50, 's', 4]],
    'US-05', 'k67', 'Ein Malz, ein Hopfen: ideal, um eine Hopfensorte kennenzulernen. Hopfen lässt sich 1:1 tauschen.'],

  // ---------- Stout & Porter ----------
  ['Dry Irish Stout', 'Irish Stout', 'sp', 'schwarz, röstig, trocken, leicht',
    [['Pale Ale Malz', 2.9], ['Gerstenflocken', 0.8], ['Röstgerste', 0.4]],
    [['Northern Brewer', 30, 'k', 60]],
    'S-04', 'k66', 'Trocken und kaffeeartig. Gerstenflocken sorgen für den cremigen Schaum.'],
  ['Oatmeal Stout', 'Oatmeal Stout', 'sp', 'schwarz, cremig, hafer',
    [['Maris Otter', 3.6], ['Haferflocken', 0.5], ['Caramünch Typ III', 0.3], ['Carafa Typ II', 0.25], ['Röstgerste', 0.15]],
    [['Fuggles', 40, 'k', 60]],
    'S-04', 'k68', 'Haferflocken geben ein samtiges Mundgefühl. Restalkalität darf hier höher liegen.'],
  ['Robust Porter', 'Porter', 'sp', 'dunkel, schokolade, röstig',
    [['Pale Ale Malz', 4.0], ['Münchner Malz Typ II', 0.5], ['Caramünch Typ III', 0.3], ['Carafa Typ I', 0.3]],
    [['Northern Brewer', 28, 'k', 60], ['Willamette', 20, 'k', 10]],
    'US-05', 'k67', 'Schokoladig-röstig mit spürbarer Hopfenbittere.'],
  ['Baltic Porter', 'Baltic Porter', 'sp', 'dunkel, stark, untergärig, winter',
    [['Münchner Malz Typ II', 3.0], ['Pilsner Malz', 2.4], ['Caramünch Typ III', 0.4], ['Carafa Spezial Typ III', 0.25]],
    [['Magnum', 18, 'k', 60]],
    'W-34/70', 'std', 'Untergärig vergorenes Starkbier. Mehrere Monate Reifung runden die Röstnoten ab.', { hg: 3.3, koch: 90 }],
  ['Imperial Stout', 'Russian Imperial Stout', 'sp', 'schwarz, stark, winter, lagerfähig',
    [['Pale Ale Malz', 6.0], ['Caramünch Typ III', 0.5], ['Haferflocken', 0.4], ['Röstgerste', 0.4], ['Carafa Typ II', 0.3]],
    [['Magnum', 40, 'k', 60], ['Willamette', 25, 'k', 10]],
    'US-05', 'k67', 'Sehr stark: zwei Päckchen Hefe anstellen und mindestens 3 Monate reifen lassen. Bringt den Einkocher an die Füllgrenze.', { hg: 2.8, koch: 90 }],

  // ---------- Belgisch ----------
  ['Belgian Blonde', 'Belgian Blonde Ale', 'be', 'belgisch, hell, fruchtig',
    [['Pilsner Malz', 4.6], ['Carahell', 0.2], ['Haushaltszucker', 0.3]],
    [['Hallertauer Tradition', 25, 'k', 60], ['Saazer', 20, 'k', 10]],
    'BE-256', 'k66', 'Zucker macht das Bier schlank. Gärtemperatur langsam von 18 auf 22 °C steigen lassen.', { hg: 3.6 }],
  ['Abtei Dubbel', 'Belgian Dubbel', 'be', 'belgisch, dunkel, trockenfrucht, stark',
    [['Pilsner Malz', 3.8], ['Münchner Malz Typ II', 0.8], ['Special W', 0.25], ['Caramünch Typ II', 0.2], ['Kandiszucker dunkel', 0.4]],
    [['Hallertauer Tradition', 25, 'k', 60]],
    'BE-256', 'k66', 'Noten von Rosinen und Pflaume. Kandiszucker 10 Minuten vor Kochende einrühren.', { hg: 3.6 }],
  ['Abtei Tripel', 'Belgian Tripel', 'be', 'belgisch, hell, stark, würzig',
    [['Pilsner Malz', 5.2], ['Carapils', 0.2], ['Haushaltszucker', 0.8]],
    [['Magnum', 14, 'k', 60], ['Saazer', 25, 'k', 15]],
    'BE-256', 'k64', 'Trügerisch leicht zu trinken. Mit 6–7 g/l CO₂ in druckfeste Flaschen abfüllen.', { hg: 3.6, koch: 90 }],
  ['Saison', 'Saison', 'be', 'belgisch, trocken, würzig, sommer',
    [['Pilsner Malz', 3.6], ['Weizenmalz hell', 0.5], ['Münchner Malz Typ I', 0.3]],
    [['Magnum', 10, 'k', 60], ['Saazer', 25, 'k', 10], ['Styrian Goldings', 20, 'w', 10, 90]],
    'Belle Saison', 'k64', 'Saisonhefe vergärt sehr weit – erst abfüllen, wenn der Extrakt eine Woche stabil ist.'],

  // ---------- Spezial ----------
  ['Kveik Pale Ale', 'Farmhouse Pale Ale', 'sz', 'kveik, schnell, hopfig, sommer',
    [['Pale Ale Malz', 4.2], ['Haferflocken', 0.3]],
    [['Magnum', 10, 'k', 60], ['Amarillo', 40, 'w', 15, 80]],
    'Voss', 'k67', 'Kveik vergärt bei 30–38 °C in wenigen Tagen – ideal im Sommer ohne Kühlung.'],
  ['Dinkelbier', 'Dinkelbier', 'sz', 'dinkel, hell, getreidig',
    [['Dinkelmalz', 2.0], ['Pilsner Malz', 1.6], ['Carahell', 0.3]],
    [['Hallertauer Tradition', 20, 'k', 60], ['Saphir', 15, 'k', 10]],
    'K-97', 'eiweiss', 'Nussig-getreidiges Obergäriges mit feiner Hopfenblume.'],
  ['Dampfbier', 'California Common', 'sz', 'bernstein, hybrid, northern brewer',
    [['Pale Ale Malz', 3.8], ['Caramünch Typ I', 0.3]],
    [['Northern Brewer', 22, 'k', 60], ['Northern Brewer', 15, 'k', 15], ['Northern Brewer', 15, 'w', 10, 90]],
    'W-34/70', 'k67', 'Untergärige Hefe bei 16–18 °C vergoren – braucht keine Kühlung.'],
  ['Leichtes Schankbier', 'Schankbier', 'sz', 'leicht, alkoholarm, sommer',
    [['Pilsner Malz', 2.4], ['Carahell', 0.3], ['Münchner Malz Typ I', 0.2]],
    [['Tettnanger', 25, 'k', 60], ['Saphir', 20, 'k', 5]],
    'W-34/70', 'k68', 'Wenig Alkohol, trotzdem aromatisch. Die hohe Rasttemperatur lässt Körper im Bier.'],
  ['Cream Ale', 'Cream Ale', 'sz', 'hell, leicht, mais, einsteiger',
    [['Pilsner Malz', 3.2], ['Maisflocken', 0.7]],
    [['Perle', 14, 'k', 60]],
    'US-05', 'k66', 'Sehr helles, mildes Ale. Maisflocken direkt mit einmaischen.'],
];

const slug = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function baue([name, stil, kategorie, tags, malts, hops, hefe, rast, notizen, opt = {}]) {
  const plan = RASTEN[rast];
  const h = HEFEN.find((x) => x.name.includes(hefe));
  return {
    id: 'bib-' + slug(name),
    quelle: 'brewsaw',
    name,
    stil,
    kategorie,
    tags,
    ausschlagL: BIB_AUSSCHLAG,
    sha: BIB_SHA,
    kochzeit: opt.koch || 60,
    hauptgussLkg: opt.hg || 4,
    eigenerHauptguss: !!opt.hg,
    malts: malts.map(([n, kg]) => {
      const m = MALZE.find((x) => x.name === n);
      return { name: n, kg, ebc: m?.ebc ?? 0, potential: m?.potential ?? 0, ...(m?.kochzugabe ? { kochzugabe: true } : {}) };
    }),
    hops: hops.map(([n, g, art, zeit, temp]) => ({
      name: n,
      g,
      alpha: HOPFEN.find((x) => x.name === n)?.alpha ?? 0,
      art: ART[art],
      zeit,
      ...(temp ? { temp } : {}),
      form: 'pellets',
    })),
    hefe: { name: h?.name ?? '', evg: h?.evg ?? 0, temp: h?.temp ?? 0 },
    einmaischTemp: plan.einm,
    rasten: plan.rasten.map(([n, temp, dauer]) => ({ name: n, temp, dauer })),
    notizen,
  };
}

// BrewDog „DIY Dog“: Rezepte für 20 l; Alphasäuren und Malzfarben sind typische Werte,
// die Sudhausausbeute ist so gewählt, dass BrewDogs Stammwürze erreicht wird.
function baueDiyDog(d) {
  return {
    id: 'dog-' + d.i,
    quelle: 'brewdog',
    name: d.n,
    stil: d.s,
    kategorie: d.k,
    tags: 'brewdog, diy dog',
    ausschlagL: BIB_AUSSCHLAG,
    sha: d.sha,
    kochzeit: d.koch,
    hauptgussLkg: 4,
    eigenerHauptguss: false,
    malts: d.m.map(([name, kg, ebc, potential, koch]) => ({ name, kg, ebc, potential, ...(koch ? { kochzugabe: true } : {}) })),
    hops: d.h.map(([name, g, alpha, art, zeit, temp]) => ({ name, g, alpha, art: ART[art], zeit, ...(temp ? { temp } : {}), form: 'pellets' })),
    hefe: { name: d.y[0], evg: d.y[1], temp: d.y[2] },
    einmaischTemp: d.r[0][0] + 1,
    rasten: [...d.r.map(([temp, dauer]) => ({ name: 'Rast', temp, dauer })), { name: 'Abmaischen', temp: 78, dauer: 5 }],
    notizen: d.t,
  };
}

export const QUELLEN = [
  ['brewsaw', 'Brewsaw-Rezepte'],
  ['brewdog', 'BrewDog DIY Dog'],
];

export const BIBLIOTHEK = [...ROH.map(baue), ...DIYDOG.map(baueDiyDog)];
