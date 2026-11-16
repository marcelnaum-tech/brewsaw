// Stammdaten: typische Werte für gängige Zutaten (anpassbar im Rezept).

// [Name, EBC, Extraktpotenzial %, Kochzugabe?]
export const MALZE = [
  ['Pilsner Malz', 3, 80],
  ['Pale Ale Malz', 6.5, 80],
  ['Maris Otter', 6, 80],
  ['Wiener Malz', 8, 80],
  ['Münchner Malz Typ I', 15, 79],
  ['Münchner Malz Typ II', 25, 79],
  ['Weizenmalz hell', 4, 82],
  ['Weizenmalz dunkel', 17, 81],
  ['Roggenmalz', 6, 80],
  ['Dinkelmalz', 5, 80],
  ['Rauchmalz', 6, 79],
  ['Sauermalz', 4, 75],
  ['Carapils', 4, 75],
  ['Carahell', 25, 75],
  ['Carared', 50, 75],
  ['Caraamber', 70, 75],
  ['Melanoidinmalz', 70, 76],
  ['Caramünch Typ I', 90, 74],
  ['Caramünch Typ II', 120, 74],
  ['Caramünch Typ III', 150, 74],
  ['Abbey Malz', 45, 76],
  ['Special W', 300, 72],
  ['Caraaroma', 400, 72],
  ['Carafa Typ I', 900, 68],
  ['Carafa Typ II', 1150, 68],
  ['Carafa Spezial Typ III', 1400, 68],
  ['Röstgerste', 1200, 68],
  ['Haferflocken', 3, 70],
  ['Weizenflocken', 3, 75],
  ['Gerstenflocken', 4, 70],
  ['Maisflocken', 2, 78],
  ['Reisflocken', 2, 78],
  ['Haushaltszucker', 0, 100, true],
  ['Milchzucker (Laktose)', 0, 100, true, true],
  ['Kandiszucker dunkel', 150, 95, true],
].map(([name, ebc, potential, kochzugabe, unvergaerbar]) => ({ name, ebc, potential, kochzugabe: !!kochzugabe, unvergaerbar: !!unvergaerbar }));

// [Name, typische Alphasäure %]
export const HOPFEN = [
  ['Hallertauer Mittelfrüh', 4],
  ['Hallertauer Tradition', 6],
  ['Hersbrucker', 3],
  ['Tettnanger', 4],
  ['Spalter Select', 5],
  ['Saazer', 3.5],
  ['Perle', 7],
  ['Saphir', 3.5],
  ['Smaragd', 5],
  ['Northern Brewer', 9],
  ['Magnum', 13],
  ['Herkules', 16],
  ['Polaris', 20],
  ['Mandarina Bavaria', 8.5],
  ['Hüll Melon', 7],
  ['Hallertau Blanc', 10],
  ['Callista', 3.5],
  ['Ariana', 11],
  ['Cascade', 6.5],
  ['Centennial', 10],
  ['Chinook', 13],
  ['Amarillo', 9],
  ['Citra', 12.5],
  ['Simcoe', 13],
  ['Mosaic', 12],
  ['East Kent Goldings', 5.5],
  ['Fuggles', 4.5],
  ['Styrian Goldings', 4.5],
  ['Challenger', 7.5],
  ['Willamette', 5],
  ['Columbus', 15],
  ['Nelson Sauvin', 12],
  ['Galaxy', 14],
].map(([name, alpha]) => ({ name, alpha }));

// [Name, scheinbarer Endvergärungsgrad %, Gärtemperatur °C]
export const HEFEN = [
  ['Untergärig – Lager (z. B. W-34/70)', 82, 12],
  ['Untergärig – Lager (z. B. S-23)', 80, 12],
  ['Untergärig – Lager (z. B. Diamond)', 79, 12],
  ['Obergärig – American Ale (z. B. US-05)', 80, 18],
  ['Obergärig – English Ale (z. B. S-04)', 75, 18],
  ['Obergärig – Ale (z. B. Nottingham)', 78, 18],
  ['Obergärig – Kölsch/Alt (z. B. K-97)', 81, 17],
  ['Weizenbierhefe (z. B. WB-06)', 85, 20],
  ['Weizenbierhefe (z. B. Munich Classic)', 78, 20],
  ['Belgische Abteihefe (z. B. BE-256)', 84, 20],
  ['Belgische Witbierhefe (z. B. Wit)', 76, 20],
  ['Saisonhefe (z. B. Belle Saison)', 90, 24],
  ['Kveik (z. B. Voss)', 78, 35],
].map(([name, evg, temp]) => ({ name, evg, temp }));

export const HOPFEN_ARTEN = [
  ['vwh', 'Vorderwürze'],
  ['kochen', 'Kochen'],
  ['whirlpool', 'Whirlpool'],
  ['stopfen', 'Stopfen'],
];

export const STATUS = [
  ['geplant', 'Geplant'],
  ['brautag', 'Brautag'],
  ['gaerung', 'Gärung'],
  ['reifung', 'Reifung'],
  ['fertig', 'Fertig'],
];

export const LAGER_ARTEN = [
  ['malz', 'Malz', 'kg'],
  ['hopfen', 'Hopfen', 'g'],
  ['hefe', 'Hefe', 'Pkg.'],
  ['sonstiges', 'Sonstiges', ''],
];

export const KATEGORIEN = [
  ['uh', 'Untergärig hell'],
  ['ud', 'Untergärig dunkel & stark'],
  ['og', 'Obergärig deutsch'],
  ['wz', 'Weizen & Wit'],
  ['al', 'Ale & IPA'],
  ['sp', 'Stout & Porter'],
  ['be', 'Belgisch'],
  ['sz', 'Spezial'],
];

export const kategorieName = (key) => KATEGORIEN.find(([k]) => k === key)?.[1] || '';
