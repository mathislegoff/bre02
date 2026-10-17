import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { CONFIG } from '../config.js';
import { chargeJSON } from '../lib/donnees.js';
import { aretes } from '../lib/grille.js';
import { CoucheChamp } from '../lib/CoucheChamp.js';

const icon = (selected) =>
  L.divIcon({
    className: `marker${selected ? ' selected' : ''}`,
    html: '<span></span>',
    iconSize: selected ? [16, 16] : [8, 8],
  });

const versLatLon = (anneaux) => anneaux.map(([lon, lat]) => [lat, lon]);

export default function MapView({ grille, champ, valeurs, plage, onSelectPlage, station, onSelectStation, noeud, onClickMer }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const selectedRef = useRef(null);
  const coucheRef = useRef(null);
  const maillageRef = useRef(null);
  // Derniers callbacks, pour ne pas recréer la carte quand ils changent
  const rappels = useRef({});
  useEffect(() => { rappels.current = { onSelectPlage, onClickMer }; });
  const [status, setStatus] = useState('loading');

  // Carte et fonds (terre, trait de côte, plages), chacun affiché dès qu'il arrive
  useEffect(() => {
    const { bounds, attribution } = CONFIG.map;
    const map = L.map(ref.current, { zoomSnap: 0, zoomDelta: 0.5, maxBounds: bounds, maxBoundsViscosity: 1, maxZoom: 14 });
    // Zoom minimum : la carte remplit toute la fenêtre, impossible d'en sortir
    const cadrer = () => {
      map.invalidateSize();
      const z = map.getBoundsZoom(bounds, true);
      map.setMinZoom(z);
      if (map.getZoom() < z) map.setZoom(z);
    };
    map.fitBounds(bounds);
    cadrer();
    const ro = new ResizeObserver(cadrer);
    ro.observe(ref.current);
    map.attributionControl.addAttribution(attribution);
    map.createPane('champ').style.zIndex = 350; // sous la terre (overlayPane = 400)
    map.on('click', (e) => rappels.current.onClickMer(e.latlng));
    mapRef.current = map;

    const markers = markersRef.current;
    const controller = new AbortController();
    const canvas = L.canvas();
    const charge = (url) => chargeJSON(url, controller.signal);

    const fonds = [
      charge(CONFIG.data.terre).then(({ polygones }) => {
        L.polygon(polygones.map((p) => p.map(versLatLon)), {
          renderer: canvas, stroke: false, fillColor: '#ece6d6', fillOpacity: 1, interactive: false,
        }).addTo(map);
      }),
      charge(CONFIG.data.cote).then(({ lignes }) => {
        L.polyline(lignes.map(versLatLon), { renderer: canvas, color: '#7f95a8', weight: 1, interactive: false }).addTo(map);
      }),
      charge(CONFIG.data.plages).then((plages) => {
        const cadre = L.latLngBounds(bounds);
        L.geoJSON(plages, {
          filter: (f) => cadre.contains([f.geometry.coordinates[1], f.geometry.coordinates[0]]),
          pointToLayer: (f, latlng) => {
            const m = L.marker(latlng, { icon: icon(false), title: f.properties.nom })
              .bindTooltip(document.createTextNode(f.properties.nom))
              .on('click', () => rappels.current.onSelectPlage(f));
            markers.set(f, m);
            return m;
          },
        }).addTo(map);
      }),
    ];
    Promise.all(fonds)
      .then(() => setStatus('ready'))
      .catch((e) => {
        if (e.name === 'AbortError') return;
        console.error('Chargement de la carte impossible :', e);
        setStatus('error');
      });

    return () => {
      ro.disconnect();
      controller.abort();
      markers.clear();
      map.remove();
    };
  }, []);

  // Maillage MARC : la couche de prévision, et les arêtes tant qu'il n'y a pas de prévision
  useEffect(() => {
    if (!grille) return;
    const map = mapRef.current;
    coucheRef.current = new CoucheChamp(grille, { pane: 'champ' }).addTo(map);
    maillageRef.current = L.polyline(aretes(grille), {
      renderer: L.canvas({ pane: 'champ' }), color: '#1f6fd1', weight: 0.5, opacity: 0.16, interactive: false,
    }).addTo(map);
    return () => {
      coucheRef.current.remove();
      maillageRef.current.remove();
    };
  }, [grille]);

  useEffect(() => {
    if (!coucheRef.current || !valeurs) return;
    coucheRef.current.setValeurs(champ, valeurs);
    maillageRef.current.remove();
  }, [champ, valeurs, grille]);

  // Bouée de comparaison (point MARC 62069)
  useEffect(() => {
    if (!station) return;
    const m = L.marker([station.lat, station.lon], {
      icon: L.divIcon({ className: 'bouee', html: '<span></span>', iconSize: [16, 16] }),
      zIndexOffset: 2000,
    })
      .bindTooltip(document.createTextNode(station.nom), { permanent: true, direction: 'right', offset: [10, 0] })
      .on('click', onSelectStation)
      .addTo(mapRef.current);
    return () => m.remove();
  }, [station, onSelectStation]);

  // Point de mer choisi
  useEffect(() => {
    if (noeud == null || !grille) return;
    const [lon, lat] = grille.noeuds[noeud];
    const m = L.circleMarker([lat, lon], {
      radius: 7, color: '#1b1f3b', weight: 2, fillColor: '#f5c400', fillOpacity: 1, interactive: false,
    }).addTo(mapRef.current);
    return () => m.remove();
  }, [noeud, grille]);

  // Plage sélectionnée : on la met en avant et on zoome dessus
  useEffect(() => {
    const markers = markersRef.current;
    const prev = selectedRef.current;
    if (prev && prev !== plage) {
      markers.get(prev)?.setIcon(icon(false)).setZIndexOffset(0);
    }
    if (plage) {
      markers.get(plage)?.setIcon(icon(true)).setZIndexOffset(1000);
      const [lon, lat] = plage.geometry.coordinates;
      mapRef.current.flyTo([lat, lon], 12, { duration: 1 });
    }
    selectedRef.current = plage;
  }, [plage]);

  return (
    <div className="map-wrap">
      <div className="map" ref={ref} />
      {status !== 'ready' && (
        <p className="map-status" role="status">
          {status === 'loading' ? 'Chargement de la carte…' : 'Impossible de charger la carte.'}
        </p>
      )}
      {champ && <Legende champ={champ} />}
    </div>
  );
}

function Legende({ champ }) {
  const { max, couleurs } = CONFIG.echelle;
  return (
    <div className="legende">
      <span>Hauteur des vagues</span>
      <div className="degrade" style={{ background: `linear-gradient(to right, ${couleurs.join(', ')})` }} />
      <div className="bornes"><span>0 m</span><span>{max / 2} m</span><span>{max} m</span></div>
      <p className="source">→ sens des vagues · {champ.label}</p>
    </div>
  );
}
