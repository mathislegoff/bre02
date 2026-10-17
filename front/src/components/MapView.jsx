import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { CONFIG } from '../config.js';
import { chargeJSON } from '../lib/donnees.js';
import { aretes } from '../lib/grille.js';
import { CoucheChamp } from '../lib/CoucheChamp.js';
import imgPublic from '../assets/spots/public.svg';
import imgPublicActif from '../assets/spots/public-actif.svg';
import imgPrive from '../assets/spots/prive.svg';
import imgPriveActif from '../assets/spots/prive-actif.svg';

// Spot sur carte (Figma « Spot sur carte ») : point + étiquette nom. Public = rond bleu, privé = losange ambre,
// sélectionné = jaune cerclé de foncé + étiquette foncée. Les images de la maquette portent leur ombre.
// Zooms comptés depuis la vue d'ensemble (zoom minimum, qui dépend de la taille de l'écran) :
// noms des spots publics à partir de +ZOOM_NOMS (sinon au survol), points réduits en dessous de +ZOOM_LOIN.
const ZOOM_NOMS = 1;
const ZOOM_LOIN = 0.75;
const spotIcon = (nom, prive, selected) => {
  const el = document.createElement('div');
  const img = document.createElement('img');
  img.alt = '';
  img.src = prive ? (selected ? imgPriveActif : imgPrive) : selected ? imgPublicActif : imgPublic;
  const label = document.createElement('b');
  label.className = 'spot-nom';
  label.textContent = nom; // le nom d'un favori est saisi par l'utilisateur : jamais interprété comme du HTML
  label.setAttribute('aria-hidden', 'true');
  el.append(img, label);
  return L.divIcon({
    className: `spot-marker${prive ? ' prive' : ''}${selected ? ' selected' : ''}`,
    html: el,
    iconSize: [0, 0],
  });
};

// Marqueur cliquable au clavier, nommé pour les lecteurs d'écran (sans `title` : il doublerait l'étiquette au survol)
const marqueur = (latlng, nom, prive, options) => {
  const m = L.marker(latlng, { icon: spotIcon(nom, prive, false), ...options });
  m.on('add', () => m.getElement()?.setAttribute('aria-label', nom));
  return m;
};

const versLatLon = (anneaux) => anneaux.map(([lon, lat]) => [lat, lon]);

export default function MapView({ grille, champ, valeurs, station, pins, sel, onSelect, intro, onIntroJouee }) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const pinsRef = useRef(null);
  const boueeRef = useRef(null);
  const markersRef = useRef(new Map());
  const spotRef = useRef(null);
  const coucheRef = useRef(null);
  const maillageRef = useRef(null);
  // Dernier callback, pour ne pas recréer la carte quand il change
  const rappel = useRef(onSelect);
  useEffect(() => { rappel.current = onSelect; });
  const [status, setStatus] = useState('loading');

  // Carte et fonds (terre, trait de côte, plages), chacun affiché dès qu'il arrive
  useEffect(() => {
    const { bounds, attribution } = CONFIG.map;
    const map = L.map(ref.current, { zoomSnap: 0, zoomDelta: 0.5, maxBounds: bounds, maxBoundsViscosity: 1, maxZoom: 14 });
    // Classes selon le zoom (relatif à la vue d'ensemble) : noms des spots, points réduits
    const zoom = () => {
      const z = map.getZoom() - map.getMinZoom();
      map.getContainer().classList.toggle('avec-noms', z >= ZOOM_NOMS);
      map.getContainer().classList.toggle('loin', z < ZOOM_LOIN);
    };
    // Zoom minimum : la carte remplit toute la fenêtre, impossible d'en sortir
    const cadrer = () => {
      map.invalidateSize();
      const z = map.getBoundsZoom(bounds, true);
      map.setMinZoom(z);
      if (map.getZoom() < z) map.setZoom(z);
      zoom(); // le zoom minimum dépend de la taille de la carte
    };
    map.fitBounds(bounds);
    cadrer();
    const ro = new ResizeObserver(cadrer);
    ro.observe(ref.current);
    map.attributionControl.addAttribution(attribution);
    map.createPane('champ').style.zIndex = 350; // sous la terre (overlayPane = 400)
    map.on('click', (e) => rappel.current({ type: 'mer', lat: e.latlng.lat, lon: e.latlng.lng }));
    map.on('zoomend', zoom);
    zoom();
    mapRef.current = map;
    pinsRef.current = L.layerGroup().addTo(map);
    boueeRef.current = L.layerGroup().addTo(map);
    const spots = L.featureGroup().addTo(map);
    // Cases à cocher par couche, qui servent aussi de légende des symboles (libellés fixes, pas de saisie utilisateur)
    L.control.layers(null, {
      [`<img src="${imgPublic}" alt=""> Spots`]: spots,
      [`<img src="${imgPrive}" alt=""> Mes favoris`]: pinsRef.current,
      '<i class="bouee"><span></span></i> Bouée': boueeRef.current,
    }, { collapsed: false }).addTo(map);

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
            const m = marqueur(latlng, f.properties.nom, false).on('click', () => rappel.current({ type: 'spot', f }));
            markers.set(f, m);
            return m;
          },
        }).addTo(spots);
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

  // Arrivée par « Voir la carte » : au ras de l'eau devant Brest, puis la carte se dézoome jusqu'à toute la mer d'Iroise
  useEffect(() => {
    if (!intro) return;
    onIntroJouee();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const map = mapRef.current;
    map.setView([48.33, -4.6], map.getMinZoom() + 3, { animate: false });
    map.flyToBounds(CONFIG.map.bounds, { duration: 2.2, easeLinearity: 0.15 });
  }, [intro, onIntroJouee]);

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

  // Bouée CANDHIS (Cerema, point MARC 62069) : point léger mais visible
  useEffect(() => {
    if (!station) return;
    const m = L.marker([station.lat, station.lon], {
      icon: L.divIcon({ className: 'bouee', html: '<span></span>', iconSize: [16, 16] }),
      zIndexOffset: 2000,
    })
      .bindTooltip(document.createTextNode(`${station.nom} · CANDHIS (Cerema)`), { direction: 'right', offset: [10, 0] })
      .on('click', () => rappel.current({ type: 'bouee' }))
      .on('add', (e) => e.target.getElement()?.setAttribute('aria-label', station.nom)) // à chaque réaffichage de la couche
      .addTo(boueeRef.current);
    return () => m.remove();
  }, [station]);

  // Favoris : losanges ambre, celui sélectionné en jaune
  const selPin = sel?.pin?.id;
  useEffect(() => {
    const layer = pinsRef.current;
    layer.clearLayers();
    for (const p of pins) {
      const m = marqueur([p.lat, p.lon], p.nom, true, { zIndexOffset: 500 }).on('click', () => rappel.current({ type: 'favori', id: p.id }));
      if (p.id === selPin) m.setIcon(spotIcon(p.nom, true, true)).setZIndexOffset(1000);
      m.addTo(layer);
    }
  }, [pins, selPin]);

  // Spot sélectionné : mis en avant
  const selSpot = sel?.f ?? null;
  useEffect(() => {
    const markers = markersRef.current;
    const prev = spotRef.current;
    if (prev && prev !== selSpot) markers.get(prev)?.setIcon(spotIcon(prev.properties.nom, false, false)).setZIndexOffset(0);
    if (selSpot) markers.get(selSpot)?.setIcon(spotIcon(selSpot.properties.nom, false, true)).setZIndexOffset(1000);
    spotRef.current = selSpot;
  }, [selSpot]);

  // Point en mer ou bouée sélectionnés : repère jaune
  const repere = sel && (sel.type === 'mer' || sel.type === 'bouee') ? [sel.type, sel.lat, sel.lon] : null;
  const [typeRepere, latRepere, lonRepere] = repere ?? [];
  useEffect(() => {
    if (!typeRepere) return;
    const bouee = typeRepere === 'bouee';
    const m = L.circleMarker([latRepere, lonRepere], {
      radius: bouee ? 14 : 7, color: '#1b1f3b', weight: 2, fillColor: '#f5c400', fillOpacity: bouee ? 0 : 1, interactive: false,
    }).addTo(mapRef.current);
    return () => m.remove();
  }, [typeRepere, latRepere, lonRepere]);

  // Spot ou favori choisi (ex. dans la liste) : la carte y va s'il est hors de vue ou trop loin
  const [latCible, lonCible] = sel && (sel.type === 'spot' || sel.type === 'favori') ? [sel.lat, sel.lon] : [];
  useEffect(() => {
    if (latCible == null) return;
    const map = mapRef.current;
    const p = [latCible, lonCible];
    if (map.getZoom() - map.getMinZoom() < ZOOM_NOMS || !map.getBounds().pad(-0.1).contains(p)) map.flyTo(p, 12, { duration: 1 });
  }, [latCible, lonCible]);

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
      <span>Hauteur de la houle</span>
      <div className="degrade" style={{ background: `linear-gradient(to right, ${couleurs.join(', ')})` }} />
      <div className="bornes"><span>0 m</span><span>{max / 2} m</span><span>{max} m</span></div>
      <p className="source">→ sens de la houle · {champ.label}</p>
    </div>
  );
}
