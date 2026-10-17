// Données de comparaison : voir scripts/comparaison.py
// { station, debut, pas_heures, series: { mesure | marc | ia: { hs, tp, t02, dir: [...] } | null } }

export const temps = (data, i) =>
  new Date(Date.parse(data.debut) + i * data.pas_heures * 3600e3);

// Écart d'un modèle à la mesure, sur les heures où les deux existent
export function ecart(mesure, modele) {
  if (!mesure || !modele) return null;
  let n = 0, somme = 0, carres = 0;
  for (let i = 0; i < mesure.length; i++) {
    if (mesure[i] == null || modele[i] == null) continue;
    const e = modele[i] - mesure[i];
    n++;
    somme += e;
    carres += e * e;
  }
  return n ? { n, biais: somme / n, rmse: Math.sqrt(carres / n) } : null;
}
