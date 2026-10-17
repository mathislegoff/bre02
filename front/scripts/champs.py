#!/usr/bin/env python3
# Prévision sur une grille de points (équipe modèle) → valeurs sur le maillage MARC → public/data/champs/<source>/
#
# Entrée : CSV « time,lon,lat,hs » (une ligne par point et par heure, time en ISO UTC, autres paramètres
# facultatifs : tp, dir). Chaque nœud MARC (public/data/grille-marc.json) prend la valeur du point de la
# grille le plus proche, s'il est à moins de MAX_KM ; sinon il reste vide.
#
# Sortie, pour chaque paramètre, deux copies des mêmes octets (1 octet par valeur, 255 = manquant) :
#   <param>.temps.bin   heure par heure  [heures × nœuds] → la carte lit 1 jour d'un coup (requête Range)
#   <param>.noeuds.bin  nœud par nœud    [nœuds × heures] → le graphique lit 1 nœud sur l'année (requête Range)
#   index.json          description (début, nombre d'heures et de nœuds, échelle de chaque paramètre)
#
# Usage : python3 scripts/champs.py ia sources/ia_grille_2013.csv "Notre modèle IA"
# (scripts/marc.py écrit les champs MARC dans le même format)
import csv, json, os, sys
from datetime import datetime

import numpy as np

from cadre import DEBUT, HEURES, INDEX

HERE = os.path.dirname(os.path.abspath(__file__))
GRILLE = os.path.join(HERE, "..", "public", "data", "grille-marc.json")
CHAMPS = os.path.join(HERE, "..", "public", "data", "champs")
MAX_KM = 10
MANQUANT = 255
# Pas de quantification : 1 octet → 0 à 254 × échelle
ECHELLES = {"hs": (0.05, "m"), "tp": (0.1, "s"), "dir": (2, "°"), "eau": (0.05, "m"), "vent": (0.5, "nds")}


def noeuds():
    with open(GRILLE, encoding="utf-8") as f:
        return np.array(json.load(f)["noeuds"])  # [N, (lon, lat)]


def plus_proche(cibles, sources):
    """Pour chaque cible (lon, lat), indice de la source la plus proche et distance en km."""
    cos = np.cos(np.radians(cibles[:, 1].mean()))
    idx = np.empty(len(cibles), dtype=int)
    dist = np.empty(len(cibles))
    for i, (lon, lat) in enumerate(cibles):
        d2 = ((sources[:, 0] - lon) * cos) ** 2 + (sources[:, 1] - lat) ** 2
        idx[i] = d2.argmin()
        dist[i] = np.sqrt(d2[idx[i]]) * 111.2
    return idx, dist


def ecrire(source, label, valeurs):
    """valeurs : {param: float array [heures, nœuds] (NaN = manquant)}."""
    dossier = os.path.join(CHAMPS, source)
    os.makedirs(dossier, exist_ok=True)
    params = {}
    for p, v in valeurs.items():
        echelle, unite = ECHELLES[p]
        q = np.where(np.isnan(v), MANQUANT, np.clip(np.round(v / echelle), 0, MANQUANT - 1)).astype(np.uint8)
        q.tofile(os.path.join(dossier, f"{p}.temps.bin"))
        np.ascontiguousarray(q.T).tofile(os.path.join(dossier, f"{p}.noeuds.bin"))
        params[p] = {"echelle": echelle, "unite": unite}
    heures, n = next(iter(valeurs.values())).shape
    index = {
        "source": source,
        "label": label,
        "debut": DEBUT.isoformat().replace("+00:00", "Z"),
        "heures": heures,
        "noeuds": n,
        "manquant": MANQUANT,
        "params": params,
    }
    with open(os.path.join(dossier, "index.json"), "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)
    taille = sum(os.path.getsize(os.path.join(dossier, x)) for x in os.listdir(dossier)) // 2**20
    print(f"→ {os.path.normpath(dossier)}  ({', '.join(params)} · {heures} h × {n} nœuds · {taille} Mo)")


def lire_csv(path):
    with open(path, encoding="utf-8") as f:
        lignes = list(csv.DictReader(f))
    params = [p for p in ECHELLES if p in lignes[0]]
    points = sorted({(float(r["lon"]), float(r["lat"])) for r in lignes})
    num = {pt: i for i, pt in enumerate(points)}
    v = {p: np.full((HEURES, len(points)), np.nan, dtype=np.float32) for p in params}
    for r in lignes:
        h = INDEX.get(datetime.fromisoformat(r["time"].replace("Z", "+00:00")))
        if h is None:
            continue
        j = num[(float(r["lon"]), float(r["lat"]))]
        for p in params:
            if r[p]:
                v[p][h, j] = float(r[p])
    return np.array(points), v


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__ or "Usage : python3 scripts/champs.py <source> <fichier.csv> [label]")
    source, path = sys.argv[1], sys.argv[2]
    label = sys.argv[3] if len(sys.argv) > 3 else source
    points, v = lire_csv(path)
    idx, dist = plus_proche(noeuds(), points)
    loin = dist > MAX_KM
    print(f"{len(points)} points → {len(idx)} nœuds MARC ({loin.sum()} à plus de {MAX_KM} km, laissés vides)")
    out = {}
    for p, pv in v.items():
        out[p] = pv[:, idx]
        out[p][:, loin] = np.nan
    ecrire(source, label, out)
