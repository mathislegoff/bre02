import { useCallback, useState } from 'react';
import Header from './components/Header.jsx';
import MapView from './components/MapView.jsx';
import SidePanel from './components/SidePanel.jsx';
import Timeline from './components/Timeline.jsx';

export default function App() {
  const [plage, setPlage] = useState(null);
  const close = useCallback(() => setPlage(null), []);

  return (
    <div className="app">
      <Header />
      <MapView plage={plage} onSelectPlage={setPlage} />
      <SidePanel plage={plage} onClose={close} />
      <Timeline />
    </div>
  );
}
