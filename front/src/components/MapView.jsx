import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { CONFIG } from '../config.js';

const icon = (selected) =>
  L.divIcon({
    className: `marker${selected ? ' selected' : ''}`,
    html: '<span></span>',
    iconSize: selected ? [18, 18] : [10, 10],
  });

export default function MapView({ plage, onSelectPlage }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef(new Map());
  const selectedRef = useRef(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const { center, zoom, tiles, attribution } = CONFIG.map;
    const map = L.map(ref.current).setView(center, zoom);
    L.tileLayer(tiles, { attribution, maxZoom: 18 }).addTo(map);
    mapRef.current = map;

    const markers = markersRef.current;
    const controller = new AbortController();

    fetch(CONFIG.data, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((geojson) => {
        L.geoJSON(geojson, {
          pointToLayer: (f, latlng) => {
            const m = L.marker(latlng, { icon: icon(false), title: f.properties.nom })
              .bindTooltip(document.createTextNode(f.properties.nom))
              .on('click', () => onSelectPlage(f));
            markers.set(f, m);
            return m;
          },
        }).addTo(map);
        setStatus('ready');
      })
      .catch((e) => {
        if (e.name === 'AbortError') return;
        console.error('Chargement des plages impossible :', e);
        setStatus('error');
      });

    return () => {
      controller.abort();
      markers.clear();
      map.remove();
    };
  }, [onSelectPlage]);

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
      mapRef.current.flyTo([lat, lon], 14, { duration: 1 });
    }
    selectedRef.current = plage;
  }, [plage]);

  return (
    <div className="map-wrap">
      <div className="map" ref={ref} />
      {status !== 'ready' && (
        <p className="map-status" role="status">
          {status === 'loading' ? 'Chargement des plages…' : 'Impossible de charger les plages.'}
        </p>
      )}
    </div>
  );
}
