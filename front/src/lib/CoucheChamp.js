// Couche Leaflet : triangles du maillage MARC colorés selon la hauteur de la houle, et flèches de direction.
// Un seul <canvas>, une passe de remplissage par classe de couleur (≈ 18 000 triangles, quelques ms).
import L from 'leaflet';
import { COULEURS, classe, valeur } from './champ.js';

const ECART_FLECHES = 56; // px entre deux flèches

export const CoucheChamp = L.Layer.extend({
  initialize(grille, options) {
    L.setOptions(this, options);
    this._grille = grille;
    this._champ = null;
    this._valeurs = null;
  },

  onAdd(map) {
    this._canvas = L.DomUtil.create('canvas', 'leaflet-zoom-hide');
    this.getPane().appendChild(this._canvas);
    map.on('move zoom moveend zoomend resize', this._planifier, this); // move/zoom : suit aussi les flyTo (dézoom d'arrivée)
    this._dessine();
  },

  onRemove(map) {
    map.off('move zoom moveend zoomend resize', this._planifier, this);
    cancelAnimationFrame(this._image);
    this._canvas.remove();
  },

  // Au plus un dessin par image affichée
  _planifier() {
    cancelAnimationFrame(this._image);
    this._image = requestAnimationFrame(() => this._map && this._dessine());
  },

  // valeurs : { hs, dir } en octets, un par nœud
  setValeurs(champ, valeurs) {
    this._champ = champ;
    this._valeurs = valeurs;
    if (this._map) this._dessine();
  },

  _dessine() {
    const map = this._map;
    const canvas = this._canvas;
    const { x: w, y: h } = map.getSize();
    const dpr = window.devicePixelRatio || 1;
    L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]));
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!this._valeurs) return;
    const { hs, dir } = this._valeurs;
    const champ = this._champ;
    const vide = champ.manquant;
    const { noeuds, triangles } = this._grille;
    const px = new Float32Array(noeuds.length);
    const py = new Float32Array(noeuds.length);
    noeuds.forEach(([lon, lat], i) => {
      const p = map.latLngToContainerPoint([lat, lon]);
      px[i] = p.x;
      py[i] = p.y;
    });

    // Hauteur : triangles regroupés par classe de couleur
    const chemins = COULEURS.map(() => new Path2D());
    for (const [a, b, c] of triangles) {
      if (hs[a] === vide || hs[b] === vide || hs[c] === vide) continue;
      const p = chemins[classe(valeur(champ, 'hs', (hs[a] + hs[b] + hs[c]) / 3))];
      p.moveTo(px[a], py[a]);
      p.lineTo(px[b], py[b]);
      p.lineTo(px[c], py[c]);
      p.closePath();
    }
    ctx.lineWidth = 0.6; // recouvre les fins liserés entre triangles voisins
    chemins.forEach((p, k) => {
      ctx.fillStyle = ctx.strokeStyle = COULEURS[k];
      ctx.fill(p);
      ctx.stroke(p);
    });

    // Direction : une flèche par case de la grille d'écran, ancrée à la carte (pas de saut au déplacement)
    if (!dir) return;
    const origine = map.getPixelOrigin().add(map.containerPointToLayerPoint([0, 0]));
    const vues = new Set();
    const fleches = new Path2D();
    for (let i = 0; i < noeuds.length; i++) {
      if (dir[i] === vide || px[i] < 0 || py[i] < 0 || px[i] > w || py[i] > h) continue;
      const cle = `${Math.floor((px[i] + origine.x) / ECART_FLECHES)},${Math.floor((py[i] + origine.y) / ECART_FLECHES)}`;
      if (vues.has(cle)) continue;
      vues.add(cle);
      // La houle vient de `dir` : la flèche pointe vers où elle va
      const a = ((valeur(champ, 'dir', dir[i]) + 180) * Math.PI) / 180;
      const dx = Math.sin(a), dy = -Math.cos(a);
      const [x0, y0, x1, y1] = [px[i] - dx * 7, py[i] - dy * 7, px[i] + dx * 7, py[i] + dy * 7];
      fleches.moveTo(x0, y0);
      fleches.lineTo(x1, y1);
      fleches.moveTo(x1 - dx * 5 + dy * 3.5, y1 - dy * 5 - dx * 3.5);
      fleches.lineTo(x1, y1);
      fleches.lineTo(x1 - dx * 5 - dy * 3.5, y1 - dy * 5 + dx * 3.5);
    }
    ctx.lineWidth = 1.4;
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgb(27 31 59 / 0.55)';
    ctx.stroke(fleches);
  },
});
