// Réglages du front
import cadre from './cadre.json';

const data = (f) => `${import.meta.env.BASE_URL}data/${f}`;

export const CONFIG = {
  name: "Riklan",
  logo: `${import.meta.env.BASE_URL}logo.png`,

  data: {
    plages: data("plages.geojson"),
    grille: data("grille-marc.json"),
    cote: data("trait-de-cote.json"),
    terre: data("terre.json"),
    comparaison: data("pierres-noires-2013.json"),
    // Champ affiché sur la carte : index.json + <param>.temps.bin + <param>.noeuds.bin (voir scripts/champs.py).
    // MARC pour l'instant (scripts/marc.py) ; passer à "champs/ia/" quand le modèle IA sera prêt
    champ: data("champs/marc/"),
  },

  // Emprise et période communes avec les scripts Python : src/cadre.json
  map: {
    bounds: [[cadre.sud, cadre.ouest], [cadre.nord, cadre.est]],
    attribution: "Trait de côte © Shom/IGN · Vagues : CANDHIS (Cerema), MARC (Ifremer/SHOM)",
  },
  periode: { debut: Date.parse(cadre.debut), heures: cadre.heures },

  // Courbes du graphique (hauteur des vagues). visible: false → pas affichée
  series: {
    mesure: { label: "Mesure bouée (CANDHIS)", color: "#1b1f3b", visible: true },
    marc: { label: "MARC (modèle classique)", color: "#1f6fd1", visible: true },
    ia: { label: "Notre modèle IA", color: "#9b3fa6", visible: false },
  },

  // Échelle de la hauteur des vagues sur la carte (m), du calme à la grosse mer
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

// Niveau des vagues selon leur hauteur (m) : repère indicatif, du plat à la très grosse mer. `jusqu` = borne haute
export const NIVEAUX = [
  { jusqu: 0.3, nom: "Plat" },
  { jusqu: 0.8, nom: "Petites vagues" },
  { jusqu: 1.5, nom: "Vagues moyennes" },
  { jusqu: 2.5, nom: "Belles vagues" },
  { jusqu: 4, nom: "Grosses vagues" },
  { jusqu: Infinity, nom: "Très grosses vagues" },
];
export const niveau = (hs) => NIVEAUX.find((n) => hs < n.jusqu);

// Images de la comparaison « sans IA / avec IA » de l'accueil (chemins dans public/ ; null = emplacement vide)
CONFIG.avantApres = { sans: null, avec: null };
