import { useCallback, useEffect, useState } from 'react';
import { CONFIG } from './config.js';
import Header from './components/Header.jsx';
import MapView from './components/MapView.jsx';
import SidePanel from './components/SidePanel.jsx';
import Comparaison from './components/Comparaison.jsx';

export default function App() {
  const [plage, setPlage] = useState(null);
  const [comparaison, setComparaison] = useState(null);
  const [boueeOuverte, setBoueeOuverte] = useState(false);
  const close = useCallback(() => setPlage(null), []);
  const ouvrirBouee = useCallback(() => setBoueeOuverte(true), []);
  const fermerBouee = useCallback(() => setBoueeOuverte(false), []);

  useEffect(() => {
    fetch(CONFIG.comparaison)
      .then((r) => r.json())
      .then(setComparaison)
      .catch((e) => console.error('Chargement de la comparaison impossible :', e));
  }, []);

  return (
    <div className={`app${boueeOuverte ? ' avec-comp' : ''}`}>
      <Header />
      <MapView plage={plage} onSelectPlage={setPlage} station={comparaison?.station} onSelectStation={ouvrirBouee} />
      <SidePanel plage={plage} onClose={close} comparaison={comparaison} />
      {boueeOuverte && <Comparaison data={comparaison} onClose={fermerBouee} />}
    </div>
  );
}
