#!/usr/bin/env python3
# Télécharge les plages côtières de Bretagne → public/data/plages.geojson
# Source (liste et position des plages) : « Qualité des sites de baignade » (ministère de la Santé / ARS), data.gouv.fr, Licence Ouverte 2.0
# https://www.data.gouv.fr/datasets/qualite-des-sites-de-baignade-1
# Usage : python3 scripts/plages.py
import csv, io, json, os, urllib.request

URL = "https://static.data.gouv.fr/resources/qualite-des-sites-de-baignade-1/20260709-081710/qualite-sites-baignade.csv"
DEPARTEMENTS = {"22", "29", "35", "56"}
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
features = [
    {
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [round(float(r["longitude"]), 5), round(float(r["latitude"]), 5)]},
        "properties": {"nom": nom(r["nom_site"]), "commune": r["libelle_geographique"]},
    }
    for r in csv.DictReader(io.StringIO(text), delimiter=";")
    if r["departement"] in DEPARTEMENTS and r["type_eau_norm"] == "COTIERE" and r["latitude"]
]
with open(OUT, "w", encoding="utf-8") as f:
    json.dump({"type": "FeatureCollection", "features": features}, f, ensure_ascii=False)
print(f"{len(features)} plages → {os.path.normpath(OUT)}")
