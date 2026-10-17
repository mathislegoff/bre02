import { useCallback, useMemo, useState } from 'react';
import { CONFIG } from './config.js';
import Header from './components/Header.jsx';
import MapView from './components/MapView.jsx';
import SidePanel from './components/SidePanel.jsx';
import Timeline from './components/Timeline.jsx';
import Graphique from './components/Graphique.jsx';
import { useJSON } from './lib/donnees.js';
import { useChampHeure, useSerieNoeud } from './lib/champ.js';
import { noeudProche } from './lib/grille.js';

export default function App() {
  const grille = useJSON(CONFIG.data.grille);
  const comparaison = useJSON(CONFIG.data.comparaison);
  const index = useJSON(`${CONFIG.data.champ}index.json`);
  const champ = useMemo(() => index && { ...index, url: CONFIG.data.champ }, [index]);

  const [heure, setHeure] = useState(0);
  const [plage, setPlage] = useState(null);
  const [noeud, setNoeud] = useState(null); // point de mer dont on affiche la courbe

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
      <SidePanel plage={plage} onClose={fermerPlage} />
    </div>
  );
}
