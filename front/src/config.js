// Réglages du front
import cadre from './cadre.json';

const data = (f) => `${import.meta.env.BASE_URL}data/${f}`;

export const CONFIG = {
  name: "Riklañ",
  // Adresse de contact (mailto de la page Communauté et droits RGPD). À renseigner : tant qu'elle est vide, « [contact] » s'affiche
  contact: "",
  logo: `${import.meta.env.BASE_URL}logo.png`,

  data: {
    plages: data("plages.geojson"),
    grille: data("grille-marc.json"),
    cote: data("trait-de-cote.json"),
    terre: data("terre.json"),
    comparaison: data("pierres-noires-2013.json"),
    // Les 48 h du graphique de l'accueil, versionnées dans git (scripts/export_48h.py) : marche sans refaire tourner les scripts de données
    comparaison48: data("comparaison-48h.json"),
    // Champ affiché sur la carte : index.json + <param>.temps.bin + <param>.noeuds.bin (voir scripts/champs.py).
    // Les 48 h de la démo, versionnées dans git (scripts/export_champ_48h.py) : le site marche après un git pull.
    // Toute l'année MARC : "champs/marc/" (scripts/marc.py, ~80 Mo par fichier, hors git) ; "champs/ia/" quand le modèle IA sera prêt
    champ: data("champs/demo-48h/"),
  },

  // Emprise et période communes avec les scripts Python : src/cadre.json
  map: {
    bounds: [[cadre.sud, cadre.ouest], [cadre.nord, cadre.est]],
    attribution: "Trait de côte © Shom/IGN · Houle : CANDHIS (Cerema), MARC (Ifremer/SHOM)",
  },
  periode: { debut: Date.parse(cadre.debut), heures: cadre.heures },
  // Frise du temps : « les prochaines 48 h ». Les données sont celles de 2013, donc « maintenant » est un instant de démonstration :
  // le 23 déc. 2013 à 00 h TU, veille de la plus forte houle mesurée de l'année
  fenetre: { debut: Math.round((Date.UTC(2013, 11, 23) - Date.parse(cadre.debut)) / 3600e3), heures: 48 },

  // Courbes du graphique (hauteur de la houle). visible: false → pas affichée
  series: {
    mesure: { label: "Mesure bouée (CANDHIS)", color: "#1b1f3b", visible: true },
    marc: { label: "MARC (modèle classique)", color: "#1f6fd1", visible: true },
    ia: { label: "Riklañ model", color: "#d62828", visible: false }, // rouge, bien visible sur les graphiques (MARC en bleu)
  },

  // Échelle de la hauteur de la houle sur la carte (m), du calme à la grosse mer
  // (clair et aéré : le plus foncé reste le bleu de la charte)
  echelle: { max: 8, pas: 0.5, couleurs: ["#f3f9fe", "#d2e8f8", "#9ccbef", "#5ca6e4", "#1f6fd1"] },
};

// Classement ARS de la qualité de l'eau de baignade (plages.geojson) : couleur + libellé affiché (la couleur ne suffit pas)
export const QUALITE = {
  Excellent: "#0c4d7f",
  Bon: "#2a8fb5",
  Suffisant: "#dcbf05",
  Insuffisant: "#98367c",
};
export const qualiteCouleur = (q) => QUALITE[q] ?? "#9aa5b4";

// Niveau de la houle selon sa hauteur (m) : repère indicatif, du plat à la très grosse mer. `jusqu` = borne haute
export const NIVEAUX = [
  { jusqu: 0.3, nom: "Plat" },
  { jusqu: 0.8, nom: "Petite houle" },
  { jusqu: 1.5, nom: "Houle moyenne" },
  { jusqu: 2.5, nom: "Belle houle" },
  { jusqu: 4, nom: "Grosse houle" },
  { jusqu: Infinity, nom: "Très grosse houle" },
];
export const niveau = (hs) => NIVEAUX.find((n) => hs < n.jusqu);

