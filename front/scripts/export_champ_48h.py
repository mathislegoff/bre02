#!/usr/bin/env python3
# Export léger du champ de houle des 48 h de la fenêtre « prochaines 48 h » → public/data/champs/demo-48h/
#
# Les champs MARC de l'année (public/data/champs/marc/*.bin) pèsent ~80 Mo par fichier et restent hors de git. Pour que le site marche
# tel quel après un « git pull », on en extrait les 49 heures de la fenêtre (de 00 h à 48 h), dans le même format :
#   <param>.temps.bin   heure par heure  [49 heures × nœuds]  (la carte lit une journée d'un coup, requête Range)
#   <param>.noeuds.bin  nœud par nœud    [nœuds × 49 heures]  (le graphique d'un point)
#   index.json          comme celui de marc/, avec en plus `decalage` : indice (depuis le 1ᵉʳ janvier 2013 00 h TU) de la première heure
# soit ~1,9 Mo au total. La fenêtre est celle de CONFIG.fenetre (front/src/config.js).
#
# Entrée : public/data/champs/marc/ (scripts/marc.py). Usage : python3 scripts/export_champ_48h.py
import json, os
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
CHAMPS = os.path.join(HERE, "..", "public", "data", "champs")
DEBUT_FENETRE = datetime(2013, 12, 23, tzinfo=timezone.utc)  # = CONFIG.fenetre.debut dans config.js
HEURES = 48 + 1  # +1 : le point de 48 h ferme la fenêtre
PARAMS = ("hs", "dir")  # ce que la carte affiche

with open(os.path.join(CHAMPS, "marc", "index.json"), encoding="utf-8") as f:
    index = json.load(f)
n, T = index["noeuds"], index["heures"]
debut_annee = datetime.fromisoformat(index["debut"].replace("Z", "+00:00"))
h0 = round((DEBUT_FENETRE - debut_annee).total_seconds() / 3600)
sortie = os.path.join(CHAMPS, "demo-48h")
os.makedirs(sortie, exist_ok=True)

for p in PARAMS:
    with open(os.path.join(CHAMPS, "marc", f"{p}.temps.bin"), "rb") as f:
        f.seek(h0 * n)
        temps = f.read(HEURES * n)
    with open(os.path.join(CHAMPS, "marc", f"{p}.noeuds.bin"), "rb") as f:
        noeuds = bytearray()
        for k in range(n):
            f.seek(k * T + h0)
            noeuds += f.read(HEURES)
    assert len(temps) == HEURES * n and len(noeuds) == n * HEURES
    with open(os.path.join(sortie, f"{p}.temps.bin"), "wb") as f:
        f.write(temps)
    with open(os.path.join(sortie, f"{p}.noeuds.bin"), "wb") as f:
        f.write(noeuds)

index["heures"] = HEURES
index["decalage"] = h0
index["params"] = {p: index["params"][p] for p in PARAMS}
with open(os.path.join(sortie, "index.json"), "w", encoding="utf-8") as f:
    json.dump(index, f, ensure_ascii=False, indent=2)
print(f"{HEURES} h × {n} nœuds, à partir de l'heure {h0} → {os.path.normpath(sortie)}")
