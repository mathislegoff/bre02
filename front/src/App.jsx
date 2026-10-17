import { useCallback, useEffect, useMemo, useState } from 'react';
import { CONFIG } from './config.js';
import Header from './components/Header.jsx';
import Accueil from './components/Accueil.jsx';
import Ocean from './components/Ocean.jsx';
import Communaute from './components/Communaute.jsx';
import Connexion from './components/Connexion.jsx';
import Footer from './components/Footer.jsx';
import MapView from './components/MapView.jsx';
import SidePanel, { MenuFavoris } from './components/SidePanel.jsx';
import Timeline from './components/Timeline.jsx';
import Graphique from './components/Graphique.jsx';
import { useJSON } from './lib/donnees.js';
import { useChampHeure, useSerieNoeud, vaguesAuPoint } from './lib/champ.js';
import { api } from './lib/api.js';

// Page affichée, lue dans le # de l'adresse : #/ (accueil), #/carte, #/ocean, #/ocean/amp (ancre dans la page), #/communaute
function usePage() {
  const lire = () => {
    const [page = '', ancre] = location.hash.replace(/^#\/?/, '').split('/');
    return { page: page || 'accueil', ancre };
  };
  const [{ page, ancre }, setLieu] = useState(lire);
  useEffect(() => {
    const maj = () => setLieu(lire());
    window.addEventListener('hashchange', maj);
    return () => window.removeEventListener('hashchange', maj);
  }, []);
  // Après l'affichage : on va à l'ancre demandée, sinon en haut de la page (c'est .page qui défile, pas la fenêtre)
  useEffect(() => {
    const cible = ancre && document.getElementById(ancre);
    if (cible) cible.scrollIntoView();
    else document.querySelector('.page')?.scrollTo(0, 0);
  }, [page, ancre]);
  return page;
}

const coords = (lat, lon) => `${lat.toFixed(3)}°N ${Math.abs(lon).toFixed(3)}°O`;
const km = (a, b) => Math.hypot((a.lon - b.lon) * Math.cos((a.lat * Math.PI) / 180), a.lat - b.lat) * 111.2;

// Ce qui est sélectionné sur la carte → { type, cle, nom, sous, lat, lon, f?, pin? } (null si plus rien)
function resoudre(choix, pins, station) {
  if (!choix) return null;
  if (choix.type === 'spot') {
    const [lon, lat] = choix.f.geometry.coordinates;
    return { type: 'spot', cle: `s${lat},${lon}`, nom: choix.f.properties.nom, sous: choix.f.properties.commune, lat, lon, f: choix.f };
  }
  if (choix.type === 'mer') {
    const { lat, lon } = choix;
    return { type: 'mer', cle: `m${lat},${lon}`, nom: 'Point en mer', sous: coords(lat, lon), lat, lon };
  }
  if (choix.type === 'bouee') {
    return station && { type: 'bouee', cle: 'bouee', nom: station.nom, sous: 'Bouée CANDHIS (Cerema), mesures réelles', lat: station.lat, lon: station.lon };
  }
  const pin = pins.find((p) => p.id === choix.id); // favori supprimé → plus de sélection
  return pin && { type: 'favori', cle: `f${pin.id}`, nom: pin.nom, sous: pin.partage_par ? `Favori de ${pin.partage_par}` : 'Mon favori', lat: pin.lat, lon: pin.lon, pin };
}

export default function App() {
  const page = usePage();
  const grille = useJSON(CONFIG.data.grille);
  const comparaison = useJSON(CONFIG.data.comparaison);
  const index = useJSON(`${CONFIG.data.champ}index.json`);
  const champ = useMemo(() => index && { ...index, url: CONFIG.data.champ }, [index]);
  const station = comparaison?.station;

  const [heure, setHeure] = useState(0);
  const [choix, setChoix] = useState(null); // { type: spot | mer | bouee | favori, … }
  const [utilisateur, setUtilisateur] = useState(null);
  const [pins, setPins] = useState([]);
  const [connexion, setConnexion] = useState(false); // fenêtre de connexion ouverte ?
  const [intro, setIntro] = useState(false); // arrivée par « Voir la carte » : la carte se dézoome
  const [graph, setGraph] = useState(false); // courbe sous la carte, ouverte depuis la fiche (« Voir sur l'année »)

  const sel = useMemo(() => resoudre(choix, pins, station), [choix, pins, station]);
  // Autre point choisi pendant que la courbe est ouverte : elle reste ouverte ou se referme ?
  // TODO(human)
  const valeurs = useChampHeure(champ, heure);

  // Houle au point sélectionné (nœud MARC le plus proche), et sa courbe sur l'année
  const vagues = useMemo(() => sel && vaguesAuPoint(grille, champ, valeurs, sel.lat, sel.lon), [sel, grille, champ, valeurs]);
  const serie = useSerieNoeud(champ, sel && sel.type !== 'bouee' ? vagues?.noeud ?? null : null);

  // Bouée CANDHIS (Cerema) : mesure à l'heure choisie, et MARC au même point pour comparer
  const bouee = useMemo(() => {
    const m = comparaison?.series.mesure;
    if (!m || m.hs[heure] == null) return null;
    return { mesure: { hs: m.hs[heure], tp: m.tp?.[heure] ?? null, dir: m.dir?.[heure] ?? null, km: null }, marc: comparaison.series.marc?.hs[heure] ?? null };
  }, [comparaison, heure]);

  // Courbes { hs, dir } : le champ de la carte ; à la bouée, la mesure et MARC au point exact
  const brutes = sel?.type === 'bouee' ? { mesure: comparaison.series.mesure, marc: comparaison.series.marc } : { [champ?.source]: serie };
  const series = Object.entries(CONFIG.series)
    .filter(([k, s]) => s.visible && brutes[k]?.hs)
    .map(([k, s]) => ({ k, ...s, v: brutes[k].hs, dir: brutes[k].dir }));

  // Favori déjà posé à moins de 100 m du point sélectionné : pas de doublon
  const favoriProche = sel && !sel.pin ? pins.find((p) => !p.partage_par && km(p, sel) < 0.1) : null;

  const fermer = useCallback(() => setChoix(null), []);
  const fermerGraph = useCallback(() => setGraph(false), []);
  const selectFavori = useCallback((id) => setChoix({ type: 'favori', id }), []);

  const recharger = useCallback(() => api('/pins.php').then(setPins).catch(console.error), []);

  // Utilisateur connecté (ou null après déconnexion) → on charge ses favoris
  const entrer = useCallback(
    (u) => {
      setUtilisateur(u);
      setPins([]);
      if (u) recharger();
    },
    [recharger],
  );

  // Session déjà ouverte (cookie) au chargement de la page ?
  useEffect(() => {
    api('/auth.php').then((d) => entrer(d.utilisateur)).catch(console.error);
  }, [entrer]);

  // Rechargement régulier : notes et partages faits par les collègues apparaissent sans rafraîchir la page
  useEffect(() => {
    if (!utilisateur) return;
    const t = setInterval(recharger, 10_000);
    return () => clearInterval(t);
  }, [utilisateur, recharger]);

  const compte = (action, nom, mdp) => api('/auth.php', { action, nom, mdp }).then((d) => entrer(d.utilisateur));
  const ouvrirConnexion = useCallback(() => setConnexion(true), []);
  const fermerConnexion = useCallback(() => setConnexion(false), []);
  // Depuis la fenêtre de connexion : elle se referme dès que le compte est ouvert
  const compteDepuisFenetre = (...args) => compte(...args).then(fermerConnexion);

  // Actions sur les favoris. Ajout et partage renvoient la promesse : le formulaire affiche l'erreur du serveur
  const favoris = {
    utilisateur,
    pins,
    favoriProche,
    onSelectFavori: selectFavori,
    onConnexion: ouvrirConnexion,
    onAjouter: (nom) =>
      api('/pins.php', { nom, lat: sel.lat, lon: sel.lon }).then((pin) => {
        setPins((p) => [...p, pin]);
        selectFavori(pin.id);
      }),
    onPartager: (id, avec) => api('/partages.php', { pin_id: id, avec }).then(recharger),
    onRetirerPartage: (id, avec) =>
      api(`/partages.php?pin_id=${id}&avec=${encodeURIComponent(avec)}`, undefined, 'DELETE').then(recharger).catch((e) => alert(e.message)),
    onNoter: (id, etoiles, ressenti) =>
      api(`/pins.php?id=${id}`, { etoiles, ressenti }, 'PATCH')
        .then(({ note_le }) => setPins((p) => p.map((x) => (x.id === id ? { ...x, etoiles, ressenti, note_le } : x))))
        .catch((e) => alert(e.message)),
    // alerte : { eau, houle, vent }, ou null pour la retirer. Renvoie la promesse : le formulaire affiche l'erreur
    onAlerte: (id, alerte) =>
      api(`/pins.php?id=${id}`, { alerte }, 'PATCH').then(() => setPins((p) => p.map((x) => (x.id === id ? { ...x, alerte } : x)))),
    onSupprimer: (id) =>
      confirm('Supprimer ce favori, sa note et ses partages ?') &&
      api(`/pins.php?id=${id}`, undefined, 'DELETE')
        .then(() => setPins((p) => p.filter((x) => x.id !== id)))
        .catch((e) => alert(e.message)),
  };

  // « Voir la carte » : ouvre la page de la carte, qui se dézoome à l'arrivée (une seule fois)
  const voirCarte = () => {
    setIntro(true);
    location.hash = '#/carte';
  };
  const introJouee = useCallback(() => setIntro(false), []);

  const carte = (
    <div className={`app${sel ? ' avec-fiche' : ''}${sel && graph ? ' avec-graph' : ''}`}>
      <MapView
        grille={grille}
        champ={champ}
        valeurs={valeurs}
        station={station}
        pins={pins}
        sel={sel}
        onSelect={setChoix}
        intro={intro}
        onIntroJouee={introJouee}
      />
      <Timeline heure={heure} setHeure={setHeure} />
      {sel && graph && (
        <Graphique
          titre={`Hauteur de la houle · ${sel.nom}`}
          series={series}
          attente={sel.type !== 'bouee' && !!champ && !serie}
          heure={heure}
          setHeure={setHeure}
          onClose={fermerGraph}
        />
      )}
      {sel && <SidePanel sel={sel} vagues={vagues} bouee={bouee} serie={serie} heure={heure} graph={graph} onGraph={() => setGraph(true)} onClose={fermer} {...favoris} />}
    </div>
  );

  const nav = { utilisateur, onCompte: compte, onConnexion: ouvrirConnexion };
  return (
    <div className="site">
      {connexion && <Connexion onCompte={compteDepuisFenetre} onFermer={fermerConnexion} />}
      {page === 'accueil' ? (
        // Présentation, sans barre de navigation
        <div className="page">
          <Accueil onVoirCarte={voirCarte} comparaison={comparaison} />
        </div>
      ) : (
        <>
          <Header page={page} {...nav}>{page === 'carte' && <MenuFavoris sel={sel} {...favoris} />}</Header>
          {page === 'carte' && <main className="page-carte">{carte}</main>}
          {page === 'ocean' && <Ocean />}
          {page === 'communaute' && <Communaute utilisateur={utilisateur} onConnexion={ouvrirConnexion} />}
        </>
      )}
    </div>
  );
}
