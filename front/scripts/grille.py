#!/usr/bin/env python3
# Maillage MARC (WW3 NORGAS-UG, Ifremer/SHOM) sur l'emprise de la carte → public/data/grille-marc.json
#
# Le maillage est non structuré (triangles). On ne lit que les coordonnées et la connectivité
# (quelques Mo) dans le fichier de champs du mois de janvier, sans télécharger les 3 Go de données.
# `id` = indice du nœud dans le fichier MARC d'origine (pour y relier plus tard hs, tp, dir…).
#
# Usage : pip install netCDF4 && python3 scripts/grille.py
import json, os

import netCDF4
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "public", "data", "grille-marc.json")
URL = "https://data-dataref.ifremer.fr/ww3/homere/HINDCAST/2013/01/FIELD_NC/HOMERE_WW3-NORGAS-UG_201301.nc"

from cadre import EST, NORD, OUEST, SUD

with netCDF4.Dataset(URL + "#mode=bytes") as d:
    lon, lat, tri = (np.array(d[v][:]) for v in ("longitude", "latitude", "tri"))

dedans = (lon >= OUEST) & (lon <= EST) & (lat >= SUD) & (lat <= NORD)
ids = np.flatnonzero(dedans)
local = np.full(lon.size, -1)
local[ids] = np.arange(ids.size)

t = local[tri - 1]  # connectivité en base 1 dans le fichier
t = t[(t >= 0).all(axis=1)]  # triangles entièrement dans l'emprise

data = {
    "bounds": [[SUD, OUEST], [NORD, EST]],
    "id": ids.tolist(),
    "noeuds": [[round(float(lon[i]), 4), round(float(lat[i]), 4)] for i in ids],
    "triangles": t.tolist(),
}
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(data, f, separators=(",", ":"))
print(f"→ {os.path.normpath(OUT)}\n   {ids.size} nœuds, {len(t)} triangles, {os.path.getsize(OUT) // 1024} Ko")
