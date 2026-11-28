"""Wandelt den BrewDog-"DIY Dog"-Datensatz in das Brewsaw-Bibliotheksformat um.

Quelle: https://github.com/sammdec/punkapi (Ordner data/, 325 JSON-Dateien).
Lizenzhinweis des Datensatzes: frei nutzbar, kopierbar und teilbar, aber nicht
für kommerzielle Zwecke.

Aufruf:  python -I tools/diydog_umwandeln.py <Ordner mit den JSON-Dateien> js/bibliothek-diydog.js

BrewDog nennt keine Alphasäuren, Malzfarben und keine Ausbeute. Diese Werte
werden hier aus Tabellen mit typischen Werten ergänzt; die Sudhausausbeute wird
so gewählt, dass die von BrewDog genannte Stammwürze herauskommt.
"""
import glob
import json
import os
import sys

# Schlüsselwort -> (EBC, Extraktpotenzial %, Kochzugabe). Reihenfolge: speziell vor allgemein.
MALZ = [
    ("chocolate wheat", 900, 68, False), ("pale chocolate", 600, 68, False), ("chocolate", 1000, 68, False),
    ("carafa special malt type 1", 900, 68, False), ("carafa special malt type 2", 1150, 68, False),
    ("carafa special malt type 3", 1400, 68, False),
    ("roasted", 1200, 68, False), ("black", 1400, 68, False),
    ("dark crystal 350", 350, 72, False), ("extra dark crystal", 350, 72, False), ("double roasted", 350, 72, False),
    ("drc", 350, 72, False), ("caraaroma", 400, 72, False), ("special w", 300, 72, False), ("special iii", 300, 72, False),
    ("dark crystal", 250, 73, False), ("crystal 120", 120, 74, False),
    ("pale crystal", 60, 75, False), ("light crystal", 60, 75, False),
    ("caramalt", 30, 75, False), ("carahell", 25, 75, False), ("golden naked oats", 20, 72, False),
    ("carared", 50, 75, False), ("caramunich", 120, 74, False), ("crystal", 150, 74, False),
    ("carapils", 4, 75, False), ("dextrin", 4, 75, False),
    ("amber", 60, 75, False), ("brown", 150, 72, False),
    ("smoked", 6, 79, False), ("peated", 6, 79, False), ("acidulated", 4, 75, False),
    ("munich", 20, 79, False), ("vienna", 8, 80, False),
    ("wheat", 4, 80, False), ("grano dei miracoli", 4, 80, False), ("spelt", 5, 80, False),
    ("rye", 6, 78, False), ("oats", 3, 70, False),
    ("maris otter", 6, 80, False), ("pale ale", 6, 80, False),
    ("extra pale", 3.5, 80, False), ("propino", 3.5, 80, False), ("lager", 3.5, 80, False), ("pilsner", 3.5, 80, False),
    ("dextrose", 0, 100, True), ("cane sugar", 0, 100, True), ("muscavado", 100, 95, True),
    ("honey", 10, 78, True), ("lactose", 0, 100, True),
]

# Hopfensorten mit typischer Alphasäure (%). Alles andere in der Hopfenliste gilt als Zusatz.
HOPFEN = {
    "simcoe": 13, "amarillo": 9, "centennial": 10, "citra": 12.5, "chinook": 13, "columbus": 15, "tomahawk": 15,
    "cascade": 6.5, "german cascade": 6, "magnum": 13, "mosaic": 12, "nelson sauvin": 12, "nz nelson sauvin": 12,
    "first gold": 7.5, "motueka": 7, "galena": 13, "ahtanum": 5.5, "bramling cross": 6,
    "bramling cross/ first gold": 6.5, "sorachi ace": 12, "saaz": 3.5, "mandarina bavaria": 8.5, "willamette": 5,
    "fuggles": 4.5, "hallertauer mittelfrüh": 4, "challenger": 7.5, "perle": 7, "equinox": 14, "hersbrucker": 3,
    "waimea": 17, "vic secret": 15.5, "ella": 15, "comet": 9.5, "german comet": 9.5, "bobek": 5, "enigma": 16,
    "crystal": 4.5, "goldings": 5, "east kent golding": 5.5, "east kent goldings": 5.5, "saphire": 3.5, "bravo": 15,
    "kohatu": 6.5, "ariana": 11, "dana": 12, "el dorado": 15, "sterling": 7.5, "hbc 366": 14, "exp 366": 14,
    "hbc 369": 12, "spalter": 4.5, "hallertauer blanc": 10, "hercules": 16, "mt.hood": 5.5, "pacific hallertau": 5.5,
    "galaxy": 14, "pioneer": 9, "pacifica": 5.5, "apollo": 18, "strisselspalt": 2.5, "pacific jade": 13,
    "tettnang": 4, "styrian goldings": 4.5, "green bullet": 13, "pacific gem": 15, "callista": 3.5, "idaho 7": 13,
    "nugget": 13, "jester": 8, "liberty": 4, "huell melon": 7,
}

STOPFEN = {"dry hop", "fv", "fv addition", "secondary", "maturation"}
ENDE = {"end", "flame out", "0"}


def plato_to_sg(p):
    return 1 + p / (258.6 - (p / 258.2) * 227.1)


def sg_to_plato(sg):
    return -616.868 + 1111.14 * sg - 630.272 * sg * sg + 135.997 * sg ** 3


def malz_werte(name):
    n = name.lower()
    for key, ebc, pot, koch in MALZ:
        if key in n:
            return ebc, pot, koch
    return None


def hopfen_gabe(add):
    """-> (Art, Zeit, Temperatur) oder None, wenn die Angabe keine Hopfengabe beschreibt."""
    a = str(add or "").strip().lower()
    if a in STOPFEN:
        return "s", 5, None
    if a in ENDE:
        return "w", 15, 90
    if a == "whirlpool":
        return "w", 20, 80
    if a in ("first wort hops", "mash"):
        return "v", 0, None
    if a in ("start", "kettle"):
        return "k", 60, None
    if a == "middle":
        return "k", 30, None
    if a.isdigit():
        return "k", int(a), None
    return None


def kategorie(b, hefe, ebc, abv):
    t = (b["name"] + " " + (b.get("tagline") or "")).lower()
    h = hefe.lower()
    if "stout" in t or "porter" in t:
        return "sp"
    if any(w in t for w in ("wheat", "weizen", "weisse", " wit", "hefe")) or any(w in h for w in ("wheat", "weizen", "witbier")):
        return "wz"
    if any(w in t for w in ("saison", "belgian", "tripel", "dubbel", "quad", "abbey", "trappist")) or any(
        w in h for w in ("belgian", "saison", "trappist", "monastery", "westvleteren")
    ):
        return "be"
    if any(w in h for w in ("lager", "s189", "34/70")) or any(w in t for w in ("lager", "pils", "bock", "helles")):
        return "ud" if (ebc or 0) >= 40 or (abv or 0) >= 6.5 else "uh"
    if any(w in t for w in ("ipa", "ale", "india", "bitter", "barley wine", "barleywine", "red", "amber")):
        return "al"
    return "sz"


def zahl(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def kurz(x):
    """Zahl ohne überflüssige Nachkommastellen."""
    return int(x) if float(x).is_integer() else round(x, 3)


def wandle(b):
    extras = []
    malts = []
    for m in b["ingredients"]["malt"]:
        menge = zahl(m["amount"]["value"])
        werte = malz_werte(m["name"])
        if werte is None or not menge or not str(m["amount"]["unit"]).startswith("kilogram"):
            extras.append(f'{m["amount"]["value"]} {m["amount"]["unit"]} {m["name"]}')
            continue
        ebc, pot, koch = werte
        malts.append([m["name"].strip(), kurz(menge), ebc, pot] + ([1] if koch else []))

    hops = []
    for h in b["ingredients"]["hops"]:
        name = h["name"].strip()
        alpha = HOPFEN.get(name.lower())
        gabe = hopfen_gabe(h.get("add"))
        menge = zahl(h["amount"]["value"])
        if alpha is None or gabe is None or not menge or h["amount"]["unit"] != "grams":
            extras.append(f'{h["amount"]["value"]} {h["amount"]["unit"]} {name} ({h.get("add")})')
            continue
        art, zeit, temp = gabe
        hops.append([name, kurz(menge), alpha, art, zeit] + ([temp] if temp else []))

    kochzeit = max([60] + [h[4] for h in hops if h[3] == "k"])

    # Stammwürze laut BrewDog (teils als 1.065, teils als 1065 angegeben)
    og = zahl(b.get("target_og"))
    fg = zahl(b.get("target_fg"))
    if og and og > 2:
        og /= 1000
    if fg and fg > 2:
        fg /= 1000
    basis = sum(m[1] * m[3] / 80 for m in malts if len(m) == 4)
    zucker = sum(m[1] * m[3] / 100 for m in malts if len(m) == 5)
    sha = 65
    if og and 1.02 < og < 1.2 and basis > 0:
        extrakt = 20 * og * sg_to_plato(og) / 100
        sha = round(min(95, max(25, (extrakt - zucker) / basis * 100)))

    evg = zahl(b.get("attenuation_level"))
    if og and fg and og > 1 and 1 <= fg < og:
        evg = (og - fg) / (og - 1) * 100
    evg = round(min(98, max(50, evg or 75)))

    hefe = (b["ingredients"].get("yeast") or "Hefe nach Wahl").replace("™", "").strip()
    gaertemp = zahl(((b["method"].get("fermentation") or {}).get("temp") or {}).get("value")) or 18
    rasten = []
    for r in b["method"].get("mash_temp") or []:
        t = zahl((r.get("temp") or {}).get("value"))
        if t:
            rasten.append([kurz(t), int(zahl(r.get("duration")) or 60)])
    if not rasten:
        rasten = [[66, 60]]

    abv, ibu, ebc = zahl(b.get("abv")), zahl(b.get("ibu")), zahl(b.get("ebc"))
    notiz = []
    # BrewDogs Beschreibungstexte (brewers_tips, twist) werden bewusst nicht übernommen.
    if extras:
        notiz.append("Weitere Zutaten laut BrewDog: " + "; ".join(extras) + ".")
    angaben = [f"{kurz(abv)} % vol" if abv else "", f"{kurz(ibu)} IBU" if ibu else "", f"{kurz(ebc)} EBC" if ebc else ""]
    notiz.append("Angabe von BrewDog: " + ", ".join(a for a in angaben if a) + ".")
    notiz.append(f"Quelle: BrewDog DIY Dog, Bier Nr. {b['id']}.")

    return {
        "i": b["id"],
        "n": b["name"].strip(),
        "s": (b.get("tagline") or "").strip().rstrip("."),
        "k": kategorie(b, hefe, ebc, abv),
        "sha": sha,
        "koch": kochzeit,
        "m": malts,
        "h": hops,
        "y": [hefe, evg, kurz(gaertemp)],
        "r": rasten,
        "t": " ".join(notiz),
    }


def main(quelle, ziel):
    biere = []
    for pfad in sorted(glob.glob(os.path.join(quelle, "*.json"))):
        with open(pfad, encoding="utf-8") as f:
            biere.append(json.load(f))
    rezepte = [wandle(b) for b in sorted(biere, key=lambda b: b["name"].lower())]
    # Ohne Schüttung lässt sich nichts berechnen. Rezepte, deren Mengen offensichtlich nicht zur
    # angegebenen Stammwürze passen (Fehler im Datensatz), werden ausgelassen.
    rezepte = [r for r in rezepte if r["m"] and 25 < r["sha"] < 95 and sum(m[1] for m in r["m"]) <= 16]
    with open(ziel, "w", encoding="utf-8", newline="\n") as f:
        f.write("// Automatisch erzeugt von tools/diydog_umwandeln.py – nicht von Hand bearbeiten.\n")
        f.write("// Rezepte aus BrewDogs „DIY Dog“ (Datensatz: github.com/sammdec/punkapi).\n")
        f.write("// Laut Lizenz des Datensatzes frei nutzbar und teilbar, jedoch nicht für kommerzielle Zwecke.\n")
        f.write("// Nur Zutaten- und Verfahrensangaben; BrewDogs Beschreibungstexte (Tipps, Besonderheiten) sind bewusst nicht enthalten.\n")
        f.write("// Format: i Nr., n Name, s Stil, k Kategorie, m Malze [Name, kg, EBC, Extrakt %, Kochzugabe],\n")
        f.write("// h Hopfen [Name, g, Alpha %, Art, Zeit, °C], y Hefe [Name, Vergärungsgrad %, °C], r Rasten [°C, min], t Notizen.\n")
        f.write("export const DIYDOG = [\n")
        for r in rezepte:
            f.write(json.dumps(r, ensure_ascii=False, separators=(",", ":")) + ",\n")
        f.write("];\n")
    print(len(biere), "Biere gelesen,", len(rezepte), "Rezepte geschrieben,", os.path.getsize(ziel) // 1024, "KB")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
