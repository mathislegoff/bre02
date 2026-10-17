// Maillage MARC : { id, noeuds: [[lon, lat]], triangles: [[a, b, c]] } (voir scripts/grille.py)

// Indice du nœud le plus proche et distance en km
export function noeudProche(grille, lat, lon) {
  const cos = Math.cos((lat * Math.PI) / 180);
  let k = 0, d = Infinity;
  grille.noeuds.forEach(([x, y], i) => {
    const e = ((x - lon) * cos) ** 2 + (y - lat) ** 2;
    if (e < d) { d = e; k = i; }
  });
  return { noeud: k, km: Math.sqrt(d) * 111.2 };
}

// Arêtes du maillage, chacune une seule fois (partagée par 2 triangles), en [lat, lon]
export function aretes({ noeuds, triangles }) {
  const vues = new Set();
  const out = [];
  const ajoute = (a, b) => {
    const k = a < b ? a * 1e5 + b : b * 1e5 + a;
    if (vues.has(k)) return;
    vues.add(k);
    out.push([[noeuds[a][1], noeuds[a][0]], [noeuds[b][1], noeuds[b][0]]]);
  };
  for (const [a, b, c] of triangles) { ajoute(a, b); ajoute(b, c); ajoute(c, a); }
  return out;
}
