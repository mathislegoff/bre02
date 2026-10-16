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
};
