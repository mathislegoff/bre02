#!/usr/bin/env python3
# Prévision « IA » FICTIVE pour la démo : ajoute la série `ia` à public/data/pierres-noires-2013.json, en attendant les vraies
# prévisions de l'équipe modèle (scripts/sources/ia_2013.csv + scripts/comparaison.py).
#
# Réalisme : la prévision part de la mesure de la bouée, avec une erreur lente (corrélée d'une heure à l'autre, comme une vraie
# prévision) qui grandit avec l'état de mer ; elle sous-estime un peu les pics, comme tout modèle ; elle reste meilleure que MARC
# sans être parfaite. Le fichier porte `"demo": ["ia"]` : le site affiche « données de démonstration » à côté de la courbe.
# Usage : python3 scripts/ia_demo.py   (relançable ; mêmes valeurs à chaque fois)
import json, math, os, random

FICHIER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "data", "pierres-noires-2013.json")
rng = random.Random(2013)

with open(FICHIER, encoding="utf-8") as f:
    d = json.load(f)
mesure, marc = d["series"]["mesure"], d["series"]["marc"]
n = len(mesure["hs"])


def base(param, i):
    """Mesure de la bouée, ou MARC les heures où la bouée n'a rien enregistré."""
    v = mesure[param][i]
    return v if v is not None else marc[param][i]


def erreur_lente(sigma_de, phi=0.93):
    """Erreur autocorrélée (AR(1)) : sigma_de(i) donne l'écart-type voulu à l'heure i."""
    e = 0.0
    for i in range(n):
        e = phi * e + math.sqrt(1 - phi * phi) * rng.gauss(0, 1)
        yield e * sigma_de(i)


ia = {}
hs = [base("hs", i) for i in range(n)]
ia["hs"] = [
    None if h is None else round(max(0.1, h * (1 - 0.006 * min(h, 6)) + e), 2)  # pics un peu sous-estimés
    for h, e in zip(hs, erreur_lente(lambda i: 0.09 + 0.05 * (hs[i] or 0)))
]
for param, sigma in (("tp", 0.55), ("t02", 0.35)):
    vals = [base(param, i) for i in range(n)]
    ia[param] = [None if v is None else round(max(3.0, v + e), 1) for v, e in zip(vals, erreur_lente(lambda i, s=sigma: s))]
dirs = [base("dir", i) for i in range(n)]
ia["dir"] = [None if v is None else round((v + e) % 360, 1) for v, e in zip(dirs, erreur_lente(lambda i: 7.0))]

d["series"]["ia"] = ia
d["demo"] = ["ia"]
with open(FICHIER, "w", encoding="utf-8") as f:
    json.dump(d, f, ensure_ascii=False, separators=(",", ":"))


def ecarts(sim):
    paires = [(m, s) for m, s in zip(mesure["hs"], sim) if m is not None and s is not None]
    rmse = math.sqrt(sum((s - m) ** 2 for m, s in paires) / len(paires))
    mm, ms = (sum(x) / len(paires) for x in zip(*paires))
    cov = sum((m - mm) * (s - ms) for m, s in paires)
    r = cov / math.sqrt(sum((m - mm) ** 2 for m, s in paires) * sum((s - ms) ** 2 for m, s in paires))
    return rmse, ms - mm, r


for nom, sim in (("MARC", marc["hs"]), ("IA (démo)", ia["hs"])):
    rmse, biais, r = ecarts(sim)
    print(f"{nom:10s} écart moyen {rmse:.2f} m · biais {biais:+.2f} m · corrélation {r:.2f}")
