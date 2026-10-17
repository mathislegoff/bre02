#!/usr/bin/env python3
# Champs MARC (WW3 NORGAS-UG, Ifremer/SHOM) sur le maillage de la carte → public/data/champs/marc/ (format de champs.py)
#
# hs  : hauteur significative (m)
# dir : direction moyenne d'où viennent les vagues (°, convention nautique)
#
# Les fichiers mensuels font ~3 Go (110 804 nœuds, 70 variables) : on ne lit que hs et dir, pas de temps par
# pas de temps, via des requêtes HTTP Range (≈ 125 Ko par pas et par variable, ≈ 2 Go pour l'année).
# Les 12 mois sont lus en parallèle. Compter quelques minutes à une demi-heure selon la connexion.
#
# Usage : pip install -r scripts/requirements.txt && python3 scripts/marc.py
import json
from concurrent.futures import ProcessPoolExecutor
from datetime import datetime, timedelta, timezone

import fsspec
import h5py
import numpy as np

from cadre import DEBUT, HEURES
from champs import GRILLE, ecrire

URL = "https://data-dataref.ifremer.fr/ww3/homere/HINDCAST/{a}/{m:02d}/FIELD_NC/HOMERE_WW3-NORGAS-UG_{a}{m:02d}.nc"
PARAMS = ("hs", "dir")
BLOC = 24  # pas de temps lus d'un coup


def mois(args):
    m, ids = args
    with fsspec.open(URL.format(a=DEBUT.year, m=m), block_size=2**20, cache_type="none") as fo, h5py.File(fo, "r") as f:
        jours = f["time"][:]  # jours depuis 1990-01-01
        heures = np.round((jours * 24) - (DEBUT - datetime(1990, 1, 1, tzinfo=timezone.utc)) / timedelta(hours=1)).astype(int)
        out = {}
        for p in PARAMS:
            d = f[p]
            echelle, vide = float(d.attrs["scale_factor"][0]), int(d.attrs["_FillValue"][0])
            v = np.empty((len(jours), len(ids)), dtype=np.float32)
            for t in range(0, len(jours), BLOC):
                brut = d[t : t + BLOC, :][:, ids]
                v[t : t + BLOC] = np.where(brut == vide, np.nan, brut * echelle)
            out[p] = v
    print(f"  {DEBUT.year}-{m:02d} : {len(jours)} pas", flush=True)
    return heures, out


if __name__ == "__main__":
    with open(GRILLE, encoding="utf-8") as f:
        ids = np.array(json.load(f)["id"])
    valeurs = {p: np.full((HEURES, len(ids)), np.nan, dtype=np.float32) for p in PARAMS}
    print(f"Lecture MARC {DEBUT.year}, {len(ids)} nœuds…")
    with ProcessPoolExecutor(max_workers=6) as pool:
        for heures, out in pool.map(mois, [(m, ids) for m in range(1, 13)]):
            ok = (heures >= 0) & (heures < HEURES)
            for p in PARAMS:
                valeurs[p][heures[ok]] = out[p][ok]
    ecrire("marc", "MARC (Ifremer/SHOM)", valeurs)
