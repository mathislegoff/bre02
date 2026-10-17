#!/usr/bin/env python3
# Télécharge les plages côtières de Bretagne → public/data/plages.geojson
# Sources :
#  - liste, position et classement de qualité de l'eau : « Qualité des sites de baignade » (ministère de la Santé / ARS), data.gouv.fr, Licence Ouverte 2.0
#    https://www.data.gouv.fr/datasets/qualite-des-sites-de-baignade-1
#  - aires marines protégées à moins de 300 m : « Aires marines protégées françaises » (OFB), data.gouv.fr, Licence Ouverte 2.0
#    https://www.data.gouv.fr/datasets/aires-marines-protegees-francaises-3
# Usage : python3 scripts/plages.py
import csv, io, json, math, os, urllib.request

URL = "https://static.data.gouv.fr/resources/qualite-des-sites-de-baignade-1/20260709-081710/qualite-sites-baignade.csv"
DEPARTEMENTS = {"22", "29", "35", "56"}
# Aires marines protégées sur l'emprise Bretagne ouest (WFS de l'OFB), en WGS84 (bbox : lon, lat)
AMP_URL = (
    "https://wxs.ofb.fr/geoserver/gestion/ows?service=WFS&version=2.0.0&request=GetFeature"
    "&typeNames=gestion:ges_omon_amp_ofb_pol_3857_vue&outputFormat=application/json&srsName=EPSG:4326"
    "&bbox=-5.5,47.4,-1.9,48.95,EPSG:4326"
)
DISTANCE_AMP = 0.003  # ≈ 300 m : une plage en bord de zone compte comme dans la zone
PETITS_MOTS = {"de", "du", "des", "la", "le", "les", "et", "a", "à", "au", "aux", "en", "sur"}


def nom(brut):
    """« PLAGE DE L'ILE » → « Plage de l'Ile » (str.title() met tout en majuscule)."""
    mots = brut.lower().split()
    out = []
    for i, m in enumerate(mots):
        if i and m in PETITS_MOTS:
            out.append(m)
        elif i and m[:2] in ("l'", "d'"):
            out.append(m[:2] + m[2:].capitalize())
        else:
            out.append("-".join(p.capitalize() for p in m.split("-")))
    return " ".join(out)


OUT = os.path.join(os.path.dirname(__file__), "..", "public", "data", "plages.geojson")

text = urllib.request.urlopen(URL).read().decode("utf-8-sig")
amp = json.load(urllib.request.urlopen(AMP_URL, timeout=120))["features"]
KX = math.cos(math.radians(48.2))  # 1° de longitude vaut KX × 1° de latitude, à cette latitude


def zone(f):
    """Anneaux de la géométrie (MultiPolygon) + boîte englobante, longitudes ramenées à l'échelle des latitudes."""
    polys = f["geometry"]["coordinates"] if f["geometry"]["type"] == "MultiPolygon" else [f["geometry"]["coordinates"]]
    polys = [[[(x * KX, y) for x, y in anneau] for anneau in poly] for poly in polys]
    pts = [pt for poly in polys for pt in poly[0]]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return polys, (min(xs), min(ys), max(xs), max(ys))


def dans(x, y, anneau):
    """Point dans l'anneau ? (tir de rayon)"""
    dedans = False
    for (x1, y1), (x2, y2) in zip(anneau, anneau[1:]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            dedans = not dedans
    return dedans


def distance_bord(x, y, anneau):
    """Distance du point au bord de l'anneau (en degrés de latitude)."""
    d2 = math.inf
    for (x1, y1), (x2, y2) in zip(anneau, anneau[1:]):
        dx, dy = x2 - x1, y2 - y1
        t = 0 if dx == dy == 0 else max(0, min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
        d2 = min(d2, (x - x1 - t * dx) ** 2 + (y - y1 - t * dy) ** 2)
    return math.sqrt(d2)


def proche(x, y, polys):
    """Point dans le polygone (hors trous) ou à moins de DISTANCE_AMP de son bord ?"""
    for poly in polys:
        if dans(x, y, poly[0]) and not any(dans(x, y, trou) for trou in poly[1:]):
            return True
        if distance_bord(x, y, poly[0]) <= DISTANCE_AMP:
            return True
    return False


zones = [zone(f) for f in amp]


def aires(lon, lat):
    """Aires marines protégées autour du point : [{"nom": ..., "statuts": [...]}], une entrée par aire."""
    x, y = lon * KX, lat
    par_nom = {}
    for f, (polys, (x0, y0, x1, y1)) in zip(amp, zones):
        if x0 - DISTANCE_AMP <= x <= x1 + DISTANCE_AMP and y0 - DISTANCE_AMP <= y <= y1 + DISTANCE_AMP and proche(x, y, polys):
            props = f["properties"]
            nom_aire = props["mpa_oriname"][0].upper() + props["mpa_oriname"][1:]  # « baie d'Audierne » = « Baie d'Audierne »
            statuts = par_nom.setdefault(nom_aire, [])
            if props["des_desigfr"] not in statuts:
                statuts.append(props["des_desigfr"])
    return [{"nom": n, "statuts": sorted(st)} for n, st in sorted(par_nom.items())]


features = []
for r in csv.DictReader(io.StringIO(text), delimiter=";"):
    if r["departement"] in DEPARTEMENTS and r["type_eau_norm"] == "COTIERE" and r["latitude"]:
        lon, lat = round(float(r["longitude"]), 5), round(float(r["latitude"]), 5)
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [lon, lat]},
            "properties": {"nom": nom(r["nom_site"]), "commune": r["libelle_geographique"], "qualite": r["qualite"], "amp": aires(lon, lat)},
        })
with open(OUT, "w", encoding="utf-8") as f:
    json.dump({"type": "FeatureCollection", "features": features}, f, ensure_ascii=False)
print(f"{len(features)} plages ({sum(1 for f in features if f['properties']['amp'])} dans ou près d'une aire marine protégée) → {os.path.normpath(OUT)}")
