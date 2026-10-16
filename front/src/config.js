// Réglages du front
export const CONFIG = {
  name: "BR02",
  logo: `${import.meta.env.BASE_URL}logo.png`,
  data: `${import.meta.env.BASE_URL}data/plages.geojson`,

  map: {
    center: [48.2, -4.4],
    zoom: 8,
    tiles: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© contributeurs OpenStreetMap · Plages : ARS / data.gouv.fr",
  },

  // Période couverte par le classement de qualité de l'eau
  // (couverture temporelle indiquée sur data.gouv.fr, à mettre à jour avec le fichier)
  qualitePeriode: "saisons 2021 à 2024",

  // Couleur des plages selon la qualité de l'eau
  qualite: {
    Excellent: "#1f6fd1",
    Bon: "#2bb3c9",
    Suffisant: "#f4d03f",
    Insuffisant: "#a23b8c",
    "Non classé": "#9aa5b4",
  },
};

export const couleur = (qualite) => CONFIG.qualite[qualite] ?? CONFIG.qualite["Non classé"];
