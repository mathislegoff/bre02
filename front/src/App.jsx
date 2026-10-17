import { useCallback, useEffect, useMemo, useState } from 'react';
import { CONFIG } from './config.js';
import Header from './components/Header.jsx';
import MapView from './components/MapView.jsx';
import SidePanel from './components/SidePanel.jsx';
import Timeline from './components/Timeline.jsx';
import Graphique from './components/Graphique.jsx';
import { useJSON } from './lib/donnees.js';
import { useChampHeure, useSerieNoeud } from './lib/champ.js';
import { noeudProche } from './lib/grille.js';

// Appel au backend PHP ; une réponse d'erreur devient une exception avec le message du serveur
async function api(url, body, method = body ? 'POST' : 'GET') {
  const r = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({ erreur: 'Serveur injoignable' }));
  if (!r.ok) throw new Error(data.erreur);
  return data;
}

export default function App() {
  const grille = useJSON(CONFIG.data.grille);
  const comparaison = useJSON(CONFIG.data.comparaison);
  const index = useJSON(`${CONFIG.data.champ}index.json`);
  const champ = useMemo(() => index && { ...index, url: CONFIG.data.champ }, [index]);

  const [heure, setHeure] = useState(0);
  const [plage, setPlage] = useState(null);
  const [noeud, setNoeud] = useState(null); // point de mer dont on affiche la courbe
  const [utilisateur, setUtilisateur] = useState(null);
  const [pins, setPins] = useState([]);

  const valeurs = useChampHeure(champ, heure);
  const serie = useSerieNoeud(champ, noeud);
  const station = comparaison?.station;
  const noeudBouee = useMemo(() => grille && station && noeudProche(grille, station.lat, station.lon).noeud, [grille, station]);

  // Courbes { hs, dir } : le champ de la carte partout ; à la bouée, la mesure et MARC au point exact
  const aLaBouee = noeud != null && noeud === noeudBouee;
  const brutes = aLaBouee
    ? { mesure: comparaison.series.mesure, marc: comparaison.series.marc }
    : { [champ?.source]: serie };
  const series = Object.entries(CONFIG.series)
    .filter(([k, s]) => s.visible && brutes[k]?.hs)
    .map(([k, s]) => ({ k, ...s, v: brutes[k].hs, dir: brutes[k].dir }));

  let titre = 'Hauteur des vagues';
  if (aLaBouee) titre += ` · ${station.nom}`;
  else if (noeud != null && grille) {
    const [lon, lat] = grille.noeuds[noeud];
    titre += ` · ${lat.toFixed(3)}°N ${Math.abs(lon).toFixed(3)}°O`;
  }

  const fermerPlage = useCallback(() => setPlage(null), []);
  const fermerGraphique = useCallback(() => setNoeud(null), []);
  const choisirBouee = useCallback(() => setNoeud(noeudBouee), [noeudBouee]);
  const clicMer = useCallback((p) => grille && setNoeud(noeudProche(grille, p.lat, p.lng).noeud), [grille]);

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

  const ajouterPin = useCallback((latlng) => {
    const nom = prompt('Nom du favori ?')?.trim();
    if (!nom) return;
    api('/pins.php', { nom, lat: latlng.lat, lon: latlng.lng })
      .then((pin) => setPins((p) => [...p, pin]))
      .catch((e) => alert(e.message));
  }, []);

  const supprimerPin = (id) =>
    api(`/pins.php?id=${id}`, undefined, 'DELETE')
      .then(() => setPins((p) => p.filter((x) => x.id !== id)))
      .catch((e) => alert(e.message));

  // Partage : on recharge depuis le serveur, qui renvoie les noms exacts des collègues
  const partager = (id) => {
    const avec = prompt('Partager avec (nom du compte du collègue) :')?.trim();
    if (avec) api('/partages.php', { pin_id: id, avec }).then(recharger).catch((e) => alert(e.message));
  };

  const retirerPartage = (id, avec) =>
    api(`/partages.php?pin_id=${id}&avec=${encodeURIComponent(avec)}`, undefined, 'DELETE')
      .then(recharger)
      .catch((e) => alert(e.message));

  const noter = (id, etoiles, ressenti) =>
    api(`/pins.php?id=${id}`, { etoiles, ressenti }, 'PATCH')
      .then(({ note_le }) => setPins((p) => p.map((x) => (x.id === id ? { ...x, etoiles, ressenti, note_le } : x))))
      .catch((e) => alert(e.message));

  return (
    <div className={`app${noeud != null ? ' avec-graph' : ''}`}>
      <Header />
      <MapView
        grille={grille}
        champ={champ}
        valeurs={valeurs}
        plage={plage}
        onSelectPlage={setPlage}
        station={station}
        onSelectStation={choisirBouee}
        noeud={noeud}
        onClickMer={clicMer}
        pins={pins}
        onAddPin={utilisateur ? ajouterPin : null}
      />
      <Timeline heure={heure} setHeure={setHeure} />
      {noeud != null && (
        <Graphique
          titre={titre}
          series={series}
          attente={!aLaBouee && !!champ && !serie}
          heure={heure}
          setHeure={setHeure}
          onClose={fermerGraphique}
        />
      )}
      <SidePanel
        plage={plage}
        onClose={fermerPlage}
        utilisateur={utilisateur}
        pins={pins}
        onCompte={compte}
        onSupprimerPin={supprimerPin}
        onPartager={partager}
        onRetirerPartage={retirerPartage}
        onNoter={noter}
      />
    </div>
  );
}
