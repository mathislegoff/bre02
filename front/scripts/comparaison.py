#!/usr/bin/env python3
# État de mer en 2013 à la bouée des Pierres Noires : mesures in situ vs prévision MARC vs IA
# → public/data/pierres-noires-2013.json
#
# Paramètres comparés (mêmes conventions des deux côtés, direction = d'où viennent les vagues) :
#   hs  : hauteur significative (m)   CANDHIS HM0     MARC hs
#   tp  : période au pic (s)          CANDHIS TP      MARC 1/fp
#   t02 : période moyenne (s)         CANDHIS T02     MARC 1/f02
#   dir : direction au pic (°)        CANDHIS THETAP  MARC th1p
#
# Sources :
#   - Mesures in situ CANDHIS (Cerema), campagne 02911, licence Etalab : à télécharger à la main sur
#     https://candhis.cerema.fr (onglet Archives → Téléchargement), à déposer dans scripts/sources/
#   - Prévision MARC (WW3 NORGAS-UG, Ifremer/SHOM), point 62069, téléchargée automatiquement
#     https://data-dataref.ifremer.fr/ww3/homere/HINDCAST/2013/
#   - Modèle IA : CSV « time,hs,tp,t02,dir » (colonnes facultatives) fourni par l'équipe modèle,
#     à déposer dans scripts/sources/ia_2013.csv
#
# Usage : pip install netCDF4 && python3 scripts/comparaison.py
import csv, glob, json, os, urllib.request
from datetime import datetime, timezone

import netCDF4
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
SOURCES = os.path.join(HERE, "sources")
OUT = os.path.join(HERE, "..", "public", "data", "pierres-noires-2013.json")
MARC_URL = "https://data-dataref.ifremer.fr/ww3/homere/HINDCAST/2013/{m:02d}/FREQ_NC/HOMERE_WW3-NORGAS-UG-62069_2013{m:02d}_freq.nc"

PARAMS = ["hs", "tp", "t02", "dir"]
CANDHIS_COLS = {"hs": "HM0", "tp": "TP", "t02": "T02", "dir": "THETAP"}

from cadre import DEBUT as START, INDEX, TEMPS as HEURES


def vide():
    return {p: [None] * len(HEURES) for p in PARAMS}


def val(x):
    """Valeur netCDF → float, ou None si manquante."""
    return None if np.ma.is_masked(x) else float(x)


def marc():
    out, lat, lon = vide(), None, None
    for m in range(1, 13):
        path = os.path.join(SOURCES, f"marc_62069_2013{m:02d}.nc")
        if not os.path.exists(path):
            print(f"Téléchargement MARC 2013-{m:02d}…")
            urllib.request.urlretrieve(MARC_URL.format(m=m), path)
        with netCDF4.Dataset(path) as d:
            lat, lon = float(d["latitude"][0, 0]), float(d["longitude"][0, 0])
            t = d["time"]
            for k, date in enumerate(netCDF4.num2date(t[:], t.units)):
                i = INDEX.get(datetime(*date.timetuple()[:4], tzinfo=timezone.utc))
                if i is None:
                    continue
                hs, fp, f02, th = (val(d[v][k, 0]) for v in ("hs", "fp", "f02", "th1p"))
                if hs is not None:
                    out["hs"][i] = round(hs, 2)
                if fp:
                    out["tp"][i] = round(1 / fp, 1)
                if f02:
                    out["t02"][i] = round(1 / f02, 1)
                if th is not None:
                    out["dir"][i] = round(th)
    return out, lat, lon


def nombre(s):
    """Valeur CANDHIS → float, ou None si vide / manquante (code 999.999)."""
    s = s.strip().replace(",", ".")
    if not s or s in ("-", "NaN"):
        return None
    x = float(s)
    return None if x >= 999 else x


def candhis():
    """Archive CANDHIS « Candhis_02911_2013_arch.csv » (séparateur ;, DateHeure en UTC, pas de 30 min). Heures pleines."""
    fichiers = glob.glob(os.path.join(SOURCES, "*02911*"))
    if not fichiers:
        print("Pas de mesures CANDHIS dans scripts/sources/ (fichier contenant « 02911 »).")
        return None
    out = vide()
    with open(fichiers[0], encoding="utf-8-sig", errors="replace") as f:
        texte = f.read()
    sep = ";" if texte.count(";") > texte.count("\t") else "\t"
    lignes = list(csv.reader(texte.splitlines(), delimiter=sep))
    entete = next(i for i, l in enumerate(lignes) if any(c.strip() == "HM0" for c in l))
    cols = [c.strip() for c in lignes[entete]]
    idx = {p: cols.index(nom) if nom in cols else None for p, nom in CANDHIS_COLS.items()}
    for l in lignes[entete + 1:]:
        try:
            if len(l) > 2 and ":" in l[1]:  # « 01/01/2013 ; 00:00 »
                t = datetime.strptime(f"{l[0].strip()} {l[1].strip()}", "%d/%m/%Y %H:%M")
            else:  # « 2013-01-01 00:00:00 » dans une seule colonne
                t = datetime.fromisoformat(l[0].strip()[:19])
        except (ValueError, IndexError):
            continue
        i = INDEX.get(t.replace(tzinfo=timezone.utc))
        if i is None:
            continue
        for p, c in idx.items():
            if c is not None and c < len(l):
                try:
                    out[p][i] = nombre(l[c])
                except ValueError:
                    pass
    return out


def ia():
    path = os.path.join(SOURCES, "ia_2013.csv")
    if not os.path.exists(path):
        return None
    out = vide()
    with open(path, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            i = INDEX.get(datetime.fromisoformat(r["time"].replace("Z", "+00:00")))
            if i is None:
                continue
            for p in PARAMS:
                if r.get(p):
                    out[p][i] = float(r[p])
    return out


os.makedirs(SOURCES, exist_ok=True)
marc_data, lat, lon = marc()
data = {
    "station": {"nom": "Bouée des Pierres Noires", "candhis": "02911", "marc": "62069", "lat": round(lat, 4), "lon": round(lon, 4)},
    "debut": START.isoformat().replace("+00:00", "Z"),
    "pas_heures": 1,
    "series": {"mesure": candhis(), "marc": marc_data, "ia": ia()},
}
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
n = {k: {p: sum(v is not None for v in s[p]) for p in PARAMS} if s else 0 for k, s in data["series"].items()}
print(f"→ {os.path.normpath(OUT)}\n   valeurs horaires : {n}")
