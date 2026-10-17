# Cadre commun (emprise + période), partagé avec le front : src/cadre.json
import json, os
from datetime import datetime, timedelta

_c = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "src", "cadre.json"), encoding="utf-8"))
SUD, OUEST, NORD, EST = _c["sud"], _c["ouest"], _c["nord"], _c["est"]
DEBUT = datetime.fromisoformat(_c["debut"].replace("Z", "+00:00"))
HEURES = _c["heures"]
TEMPS = [DEBUT + timedelta(hours=h) for h in range(HEURES)]
INDEX = {t: i for i, t in enumerate(TEMPS)}
