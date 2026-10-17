// Alertes d'un favori (Figma « Panneau spot », point privé) : une ligne par condition, chacune avec son interrupteur
// et ce que prévoit le modèle. Niveaux : { houle: [min, max] m, vent: max nds, eau: [min, max] m, actives: [clé…] }
// Sans import : vérifiable avec node (alerte.test.js)
export const HORIZON = 7 * 24; // heures de prévision regardées

const entre = (x, [min, max]) => x >= min && x <= max;

// Ordre de la maquette · param : série du champ comparée au niveau
export const CONDITIONS = [
  { cle: 'houle', param: 'hs', ok: entre },
  { cle: 'vent', param: 'vent', ok: (x, max) => x < max },
  { cle: 'eau', param: 'eau', ok: entre },
];

// Première heure, de `heure` à heure + HORIZON, où la valeur remplit la condition ; null sinon
export function prochaineHeure(valeurs, heure, ok) {
  const fin = Math.min(valeurs.length, heure + HORIZON);
  for (let i = heure; i < fin; i++) if (valeurs[i] != null && ok(valeurs[i])) return i;
  return null;
}
