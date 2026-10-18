#!/usr/bin/env python3
# Export léger des 48 h de la fenêtre « prochaines 48 h » → public/data/comparaison-48h.json
#
# Le graphique de l'accueil n'a besoin que de 49 points par courbe (de 00 h à 48 h), pour la hauteur et la période, et de 3 chiffres par modèle : ce petit fichier
# (quelques Ko) se versionne dans git et marche sur n'importe quelle machine, sans refaire tourner les scripts de données
# (MARC pèse plusieurs Go, la prévision de la carte ~80 Mo par paramètre, tous deux hors git).
#
# Entrée : public/data/pierres-noires-2013.json (mesure CANDHIS, MARC, et la série `ia` : scripts/ia_demo.py ou la vraie, via comparaison.py)
# Sortie : mesure, marc, ia (hs : hauteur significative en m, tp : période au pic en s) sur la fenêtre, + écart moyen, biais et
#          corrélation de chaque modèle à la mesure sur toute l'année. La fenêtre est celle de CONFIG.fenetre (front/src/config.js).
# Usage : python3 scripts/export_48h.py   (après scripts/comparaison.py et scripts/ia_demo.py si les données ont changé)
import json, math, os
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "public", "data")
DEBUT_FENETRE = datetime(2013, 12, 23, tzinfo=timezone.utc)  # = CONFIG.fenetre.debut dans config.js
HEURES = 48

with open(os.path.join(DATA, "pierres-noires-2013.json"), encoding="utf-8") as f:
    d = json.load(f)
debut_annee = datetime.fromisoformat(d["debut"].replace("Z", "+00:00"))
i0 = round((DEBUT_FENETRE - debut_annee).total_seconds() / 3600)
series = d["series"]


def ecarts(ref, sim):
    """Écart moyen (RMSE), biais et corrélation de `sim` à `ref`, sur les heures où les deux existent."""
    paires = [(r, s) for r, s in zip(ref, sim) if r is not None and s is not None]
    n = len(paires)
    mr, ms = sum(r for r, _ in paires) / n, sum(s for _, s in paires) / n
    cov = sum((r - mr) * (s - ms) for r, s in paires)
    vr, vs = sum((r - mr) ** 2 for r, _ in paires), sum((s - ms) ** 2 for _, s in paires)
    return {"n": n, "rmse": round(math.sqrt(sum((s - r) ** 2 for r, s in paires) / n), 3), "biais": round(ms - mr, 3), "r": round(cov / math.sqrt(vr * vs), 3)}


sortie = {
    "station": d["station"],
    "debut": DEBUT_FENETRE.strftime("%Y-%m-%dT%H:%M:%SZ"),
    "heures": HEURES,
    "pas_heures": 1,
    # +1 : le point de 48 h ferme le graphique
    "series": {k: {p: series[k][p][i0:i0 + HEURES + 1] for p in ("hs", "tp")} for k in ("mesure", "marc", "ia") if k in series},
    "ecarts": {p: {k: ecarts(series["mesure"][p], series[k][p]) for k in ("marc", "ia") if k in series} for p in ("hs", "tp")},
}
if "demo" in d:
    sortie["demo"] = d["demo"]  # séries fictives (scripts/ia_demo.py) : le site l'indique à côté de la courbe
with open(os.path.join(DATA, "comparaison-48h.json"), "w", encoding="utf-8") as f:
    json.dump(sortie, f, ensure_ascii=False, indent=1)
print(f"{HEURES + 1} points par courbe, du {sortie['debut']} → public/data/comparaison-48h.json")
for p, par_modele in sortie["ecarts"].items():
    for k, e in par_modele.items():
        print(f"  {p} {k:5s} écart moyen {e['rmse']:.2f} · biais {e['biais']:+.2f} · corrélation {e['r']:.2f}")
