// Réglages du front
export const CONFIG = {
  name: "BR02",
  logo: `${import.meta.env.BASE_URL}logo.png`,
  data: `${import.meta.env.BASE_URL}data/plages.geojson`,
  comparaison: `${import.meta.env.BASE_URL}data/pierres-noires-2013.json`,

  map: {
    // Emprise de la carte [[sud, ouest], [nord, est]] : 5°20'W → 4°15'W, nord 48°45'N.
    // Limite sud PROVISOIRE (à confirmer).
    bounds: [[47.75, -5 - 20 / 60], [48 + 45 / 60, -4 - 15 / 60]],
    tiles: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      "© contributeurs OpenStreetMap · Plages : ARS / data.gouv.fr · Vagues : CANDHIS (Cerema), MARC (Ifremer/SHOM)",
  },

  // Courbes du graphique de comparaison (hauteur des vagues).
  // visible: false → pas affichée (passer à true pour montrer les modèles)
  series: {
    mesure: { label: "Mesure bouée (CANDHIS)", color: "#14213d", visible: true },
    marc: { label: "MARC (modèle classique)", color: "#e08a1e", visible: false },
    ia: { label: "Notre modèle IA", color: "#1f6fd1", visible: false },
  },
};
