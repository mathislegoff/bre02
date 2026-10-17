#!/usr/bin/env python3
# Carte marine SHOM 7066 (« De l'Île Vierge à la pointe de Penmarc'h ») recadrée en Web Mercator
# → scripts/sources/carte-shom-7066.png (n'est plus publiée : sert à cote.py pour distinguer terre et mer)
#
# La carte est un GeoTIFF en Mercator WGS84 (EPSG:3395) avec marges papier. On découpe le cadre
# de la carte (emprise des métadonnées SHOM), on le reprojette en Web Mercator (EPSG:3857, la
# projection de Leaflet) et on réduit à LARGEUR px pour le web.
#
# Source à télécharger sur https://diffusion.shom.fr (carte 7066, GeoTIFF) et à déposer dans
# scripts/sources/7066_pal300.tif. Données soumises aux CGU des produits numériques du Shom.
#
# Usage : pip install rasterio pillow && python3 scripts/shom.py
import os

import numpy as np
import rasterio
from PIL import Image
from rasterio.enums import Resampling
from rasterio.transform import from_bounds
from rasterio.warp import reproject, transform_bounds
from rasterio.windows import from_bounds as fenetre

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "sources", "7066_pal300.tif")
OUT = os.path.join(HERE, "sources", "carte-shom-7066.png")

from cadre import NORD, SUD

# Cadre complet de la carte (métadonnées SHOM), plus large que l'emprise du site en longitude
OUEST, EST = -6.5681050, -4.2180917
LARGEUR = 5000

with rasterio.open(SRC) as r:
    b = transform_bounds("EPSG:4326", r.crs, OUEST, SUD, EST, NORD)
    win = fenetre(*b, transform=r.transform).round_offsets().round_lengths()
    idx = r.read(1, window=win)
    palette = np.array([r.colormap(1)[i][:3] for i in range(256)], dtype=np.uint8)
    rgb = palette[idx].transpose(2, 0, 1)  # indices → RGB avant tout rééchantillonnage
    src_tr = r.window_transform(win)
    src_crs = r.crs

dst_b = transform_bounds("EPSG:4326", "EPSG:3857", OUEST, SUD, EST, NORD)
haut = round(LARGEUR * (dst_b[3] - dst_b[1]) / (dst_b[2] - dst_b[0]))
dst_tr = from_bounds(*dst_b, LARGEUR, haut)
out = np.zeros((3, haut, LARGEUR), dtype=np.uint8)
for k in range(3):
    reproject(rgb[k], out[k], src_transform=src_tr, src_crs=src_crs, dst_transform=dst_tr,
              dst_crs="EPSG:3857", resampling=Resampling.average)

img = Image.fromarray(out.transpose(1, 2, 0)).quantize(colors=256, method=Image.Quantize.MEDIANCUT)
img.save(OUT, optimize=True)
print(f"→ {os.path.normpath(OUT)}\n   {LARGEUR}×{haut} px, {os.path.getsize(OUT) // 1024} Ko")
