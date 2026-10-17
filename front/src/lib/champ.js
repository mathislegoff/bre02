// Champs de houle sur le maillage MARC : voir scripts/champs.py pour le format
// (un fichier par paramètre : hs = hauteur en m, dir = direction d'où vient la houle en °)
import { useEffect, useState } from 'react';
import { CONFIG } from '../config.js';
import { chargeOctets } from './donnees.js';

// Octet → valeur réelle (null si manquant)
export const valeur = (champ, param, q) => (q === champ.manquant ? null : q * champ.params[param].echelle);

const params = (champ) => Object.keys(champ.params);
// La carte n'affiche que la houle : eau et vent (alertes) arrivent avec la série du point sélectionné
const paramsCarte = (champ) => params(champ).filter((p) => p === 'hs' || p === 'dir');

// La carte charge un jour entier (24 h × nœuds) à la fois ; on garde les derniers jours en mémoire
const jours = new Map();
function jour(champ, param, j) {
  const cle = `${champ.url}${param}|${j}`;
  if (!jours.has(cle)) {
    const n = champ.noeuds;
    const p = chargeOctets(`${champ.url}${param}.temps.bin`, j * 24 * n, Math.min(champ.heures, (j + 1) * 24) * n);
    p.catch(() => jours.delete(cle));
    jours.set(cle, p);
    if (jours.size > 16) jours.delete(jours.keys().next().value);
  }
  return jours.get(cle);
}

// Octets de tous les nœuds à une heure donnée : { hs, dir }. Garde l'heure précédente le temps du chargement
export function useChampHeure(champ, heure) {
  const [valeurs, setValeurs] = useState(null);
  useEffect(() => {
    if (!champ) return;
    let actif = true;
    const j = Math.floor(heure / 24);
    const h = heure - j * 24;
    const n = champ.noeuds;
    Promise.all(paramsCarte(champ).map((p) => jour(champ, p, j)))
      .then((blocs) => {
        if (!actif) return;
        setValeurs(Object.fromEntries(paramsCarte(champ).map((p, k) => [p, blocs[k].subarray(h * n, (h + 1) * n)])));
      })
      .catch((e) => console.error('Champ de houle :', e));
    if ((j + 1) * 24 < champ.heures) paramsCarte(champ).forEach((p) => jour(champ, p, j + 1).catch(() => {})); // pour la lecture
    return () => { actif = false; };
  }, [champ, heure]);
  return valeurs;
}

// Séries d'un nœud sur toute la période, une par paramètre du champ : { hs: [m | null], dir: [° | null], eau?, vent? }
export function useSerieNoeud(champ, noeud) {
  const [serie, setSerie] = useState(null);
  useEffect(() => {
    if (!champ || noeud == null) return;
    const controller = new AbortController();
    const T = champ.heures;
    Promise.all(params(champ).map((p) => chargeOctets(`${champ.url}${p}.noeuds.bin`, noeud * T, (noeud + 1) * T, controller.signal)))
      .then((blocs) => setSerie({
        noeud,
        v: Object.fromEntries(params(champ).map((p, k) => [p, Array.from(blocs[k], (q) => valeur(champ, p, q))])),
      }))
      .catch((e) => e.name !== 'AbortError' && console.error('Série du nœud :', e));
    return () => controller.abort();
  }, [champ, noeud]);
  return serie?.noeud === noeud ? serie.v : null;
}

// Échelle de couleur : une classe tous les `pas` mètres, de 0 à `max`
const { max, pas, couleurs: reperes } = CONFIG.echelle;
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
export const COULEURS = Array.from({ length: max / pas }, (_, k) => {
  const t = (k / (max / pas - 1)) * (reperes.length - 1);
  const i = Math.min(reperes.length - 2, Math.floor(t));
  const [a, b] = [hex(reperes[i]), hex(reperes[i + 1])];
  return `rgb(${a.map((x, c) => Math.round(x + (b[c] - x) * (t - i))).join(' ')})`;
});
export const classe = (m) => Math.min(COULEURS.length - 1, Math.floor(m / pas));

// Direction (d'où vient la houle) → flèche et point cardinal
const POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'];
export const cardinal = (deg) => POINTS[Math.round(deg / 45) % 8];

// Houle au plus proche nœud MARC ayant une valeur à l'heure affichée (≤ MAX_KM) :
// undefined tant que le champ charge, null s'il n'y a rien à proximité, sinon { hs (m), dir (° d'où vient la houle), km, noeud }
const MAX_KM = 15;
export function vaguesAuPoint(grille, champ, valeurs, lat, lon) {
  if (!grille || !champ || !valeurs) return undefined;
  const cos = Math.cos((lat * Math.PI) / 180);
  let k = -1, d = Infinity;
  grille.noeuds.forEach(([x, y], i) => {
    if (valeurs.hs[i] === champ.manquant) return;
    const e = ((x - lon) * cos) ** 2 + (y - lat) ** 2;
    if (e < d) { d = e; k = i; }
  });
  const km = Math.sqrt(d) * 111.2;
  if (k < 0 || km > MAX_KM) return null;
  return { hs: valeur(champ, 'hs', valeurs.hs[k]), dir: valeurs.dir ? valeur(champ, 'dir', valeurs.dir[k]) : null, km, noeud: k };
}
