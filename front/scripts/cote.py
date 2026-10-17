#!/usr/bin/env python3
# Trait de côte (Shom/IGN, TCH_FRA_V2, Lambert 93) découpé sur le cadre de la carte
# → public/data/trait-de-cote.json  (lignes)
# → public/data/terre.json          (polygones de terre, pour le fond de carte)
#
# Le trait de côte ne dit pas de quel côté est la terre : on referme les lignes avec le cadre pour
# former des polygones, puis on regarde la couleur de la carte SHOM (scripts/sources/carte-shom-7066.png,
# voir shom.py) à l'intérieur de chacun : beige = terre.
#
# Source : https://diffusion.shom.fr (Trait de côte Histolitt), dézippé dans
# scripts/sources/TCH_FRA_V2/Shapefile/TCH.shp
#
# Usage : pip install pyogrio shapely pyproj && python3 scripts/cote.py
import json, os

import numpy as np
import pyogrio
import shapely
from pyproj import Transformer
from PIL import Image
from shapely.geometry import Point, box
from shapely.ops import polygonize, unary_union

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "sources", "TCH_FRA_V2", "Shapefile", "TCH.shp")
OUT = os.path.join(HERE, "..", "public", "data", "trait-de-cote.json")
OUT_TERRE = os.path.join(HERE, "..", "public", "data", "terre.json")
CARTE = os.path.join(HERE, "sources", "carte-shom-7066.png")

from cadre import EST, NORD, OUEST, SUD
# Cadre complet de la carte SHOM (emprise de l'image carte-shom-7066.png, voir shom.py)
CARTE_OUEST, CARTE_EST = -6.568105, -4.2180917
TOLERANCE = 0.00005  # ° (≈ 5 m) : invisible au zoom max de la carte

vers_l93 = Transformer.from_crs("EPSG:4326", "EPSG:2154", always_xy=True)
vers_wgs = Transformer.from_crs("EPSG:2154", "EPSG:4326", always_xy=True)

x0, y0 = vers_l93.transform(OUEST, SUD)
x1, y1 = vers_l93.transform(EST, NORD)
_, _, geoms, _ = pyogrio.raw.read(SRC, bbox=(min(x0, x1) - 5000, min(y0, y1) - 5000, max(x0, x1) + 5000, max(y0, y1) + 5000))
lignes = shapely.from_wkb(geoms)

cadre = box(OUEST, SUD, EST, NORD)
traces = []
geoms_l = []
for g in lignes:
    g = shapely.transform(g, lambda c: np.column_stack(vers_wgs.transform(c[:, 0], c[:, 1])))
    g = g.intersection(cadre).simplify(TOLERANCE)
    for p in getattr(g, "geoms", [g]):
        if p.geom_type == "LineString" and len(p.coords) > 1:
            geoms_l.append(p)
            traces.append([[round(x, 4), round(y, 4)] for x, y in p.coords])

with open(OUT, "w", encoding="utf-8") as f:
    json.dump({"lignes": traces}, f, separators=(",", ":"))
print(f"→ {os.path.normpath(OUT)}\n   {len(traces)} lignes, {sum(map(len, traces))} points, {os.path.getsize(OUT) // 1024} Ko")


# --- Terre : polygones formés par les lignes + le cadre, classés avec la couleur de la carte SHOM
img = Image.open(CARTE).convert("RGB")
W, H = img.size
vers_merc = Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=True)
mx0, my0 = vers_merc.transform(CARTE_OUEST, SUD)
mx1, my1 = vers_merc.transform(CARTE_EST, NORD)


def pixel(lon, lat):
    x, y = vers_merc.transform(lon, lat)
    return img.getpixel((min(W - 1, max(0, int((x - mx0) / (mx1 - mx0) * W))), min(H - 1, max(0, int((my1 - y) / (my1 - my0) * H)))))


def beige(c):  # fond « terre » de la carte : jaune clair
    r, g, b = c
    return r > 225 and g > 205 and b < g - 20


def est_terre(poly):
    pts = [poly.representative_point()]
    minx, miny, maxx, maxy = poly.bounds
    n = 6
    for i in range(1, n):
        for j in range(1, n):
            p = Point(minx + (maxx - minx) * i / n, miny + (maxy - miny) * j / n)
            if poly.contains(p):
                pts.append(p)
    return sum(beige(pixel(p.x, p.y)) for p in pts) / len(pts) > 0.5


polys = polygonize(unary_union(geoms_l + [cadre.boundary]))
terre = []
for p in polys:
    if p.area < 1e-9 or not est_terre(p):
        continue
    p = p.simplify(TOLERANCE)
    for q in getattr(p, "geoms", [p]):
        if q.geom_type != "Polygon" or q.is_empty:
            continue
        terre.append([[[round(x, 4), round(y, 4)] for x, y in r.coords] for r in [q.exterior, *q.interiors]])

with open(OUT_TERRE, "w", encoding="utf-8") as f:
    json.dump({"polygones": terre}, f, separators=(",", ":"))
print(f"→ {os.path.normpath(OUT_TERRE)}\n   {len(terre)} polygones de terre, {os.path.getsize(OUT_TERRE) // 1024} Ko")
