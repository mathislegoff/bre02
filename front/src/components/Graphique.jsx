import { useEffect, useMemo, useRef, useState } from 'react';
import { CONFIG } from '../config.js';
import { cardinal } from '../lib/champ.js';
import { ANNEE, date, formatHeure, formatJour, heureDe } from '../lib/temps.js';

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const PAD = { l: 36, r: 8, t: 8, b: 24 };
const { heures } = CONFIG.periode;
const FENETRE = 48; // heures affichées par défaut
const bornes = (d) => Math.max(0, Math.min(heures - FENETRE, d));
const debutMois = (m) => Math.max(0, Math.min(heures, heureDe(Date.UTC(ANNEE, m, 1))));

// series : [{ k, label, color, v: [m | null] × heures, dir?: [° | null] }], déjà filtrées (visibles et disponibles)
export default function Graphique({ titre, series, attente, heure, setHeure, onClose }) {
  const [mode, setMode] = useState('h48'); // 'h48' | 'mois' | 'annee'
  const [debut48, setDebut48] = useState(() => bornes(heure - FENETRE / 2));
  const [survol, setSurvol] = useState(null);
  const [{ W, H }, setTaille] = useState({ W: 600, H: 180 });
  const chartRef = useRef(null);

  // Le SVG suit la taille réelle du conteneur (texte non déformé)
  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setTaille({ W: Math.max(300, e.contentRect.width), H: Math.max(120, e.contentRect.height) }));
    ro.observe(chartRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // La fenêtre de 48 h suit l'heure de la frise (lecture) dès qu'elle en sort, sinon elle reste fixe
  const [heurePrec, setHeurePrec] = useState(heure);
  if (heure !== heurePrec) {
    setHeurePrec(heure);
    if (heure < debut48 || heure >= debut48 + FENETRE) setDebut48(bornes(heure - FENETRE / 2));
  }

  // Fenêtre affichée : 48 h, le mois de l'heure courante, ou l'année
  const mois = date(heure).getUTCMonth();
  const [debut, fin] = mode === 'annee' ? [0, heures] : mode === 'mois' ? [debutMois(mois), debutMois(mois + 1)] : [debut48, debut48 + FENETRE];

  const max = useMemo(() => {
    let m = 1;
    series.forEach((s) => { for (let i = debut; i < fin; i++) if (s.v[i] > m) m = s.v[i]; });
    return Math.ceil(m);
  }, [series, debut, fin]);

  const { x, y } = useMemo(() => ({
    x: (i) => PAD.l + ((i - debut) / Math.max(1, fin - debut - 1)) * (W - PAD.l - PAD.r),
    y: (v) => H - PAD.b - (v / max) * (H - PAD.t - PAD.b),
  }), [debut, fin, W, H, max]);

  // Tracés recalculés seulement si la fenêtre ou la taille change (pas au survol)
  const chemins = useMemo(() => series.map((s) => {
    let d = '';
    let leve = true;
    for (let i = debut; i < fin; i++) {
      if (s.v[i] == null) { leve = true; continue; }
      d += `${leve ? 'M' : 'L'}${x(i).toFixed(1)},${y(s.v[i]).toFixed(1)}`;
      leve = false;
    }
    return d;
  }), [series, debut, fin, x, y]);

  const indice = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(debut + ((e.clientX - r.left - PAD.l) / (W - PAD.l - PAD.r)) * (fin - debut - 1));
    return i >= debut && i < fin ? i : null;
  };

  // Graduations : toutes les 6 h (le jour à minuit) sur 48 h, chaque semaine pour un mois, chaque mois pour l'année
  const ticks = [];
  if (mode === 'annee') for (let m = 0; m < 12; m++) ticks.push({ i: debutMois(m), t: MOIS[m] });
  else if (mode === 'mois') for (let i = debut; i < fin; i += 7 * 24) ticks.push({ i, t: formatJour.format(date(i)) });
  else for (let i = debut; i < fin; i++) if (date(i).getUTCHours() % 6 === 0) ticks.push({ i, t: date(i).getUTCHours() === 0 ? formatJour.format(date(i)) : `${date(i).getUTCHours()} h` });

  return (
    <section className="graphique" aria-label={titre}>
      <div className="graph-head">
        <h2>{titre}</h2>
        <button className="close" onClick={onClose} aria-label="Fermer le graphique">×</button>
      </div>
      <div className="mois">
        <button aria-pressed={mode === 'h48'} onClick={() => { setMode('h48'); setDebut48(bornes(heure - FENETRE / 2)); }}>48 h</button>
        {mode === 'h48' && (
          <>
            <button onClick={() => setDebut48((d) => bornes(d - 24))} aria-label="24 h plus tôt" disabled={debut48 <= 0}>‹</button>
            <button onClick={() => setDebut48((d) => bornes(d + 24))} aria-label="24 h plus tard" disabled={debut48 >= heures - FENETRE}>›</button>
          </>
        )}
        <button aria-pressed={mode === 'annee'} onClick={() => setMode('annee')}>Année</button>
        {MOIS.map((m, i) => (
          <button
            key={m}
            aria-pressed={mode === 'mois' && mois === i}
            onClick={() => { setMode('mois'); setHeure(debutMois(i)); }}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="graph-legende">
        {series.map((s) => (
          <span key={s.k}><i style={{ background: s.color }} /> {s.label}</span>
        ))}
        {attente && <span className="muted">Chargement…</span>}
      </div>

      <div className="chart" ref={chartRef}>
        <svg
          width={W}
          height={H}
          onPointerMove={(e) => setSurvol(indice(e))}
          onPointerLeave={() => setSurvol(null)}
          onClick={(e) => { const i = indice(e); if (i != null) setHeure(i); }}
        >
          {Array.from({ length: max + 1 }, (_, v) => (
            <g key={v}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="grid" />
              <text x={PAD.l - 6} y={y(v) + 4} textAnchor="end">{v} m</text>
            </g>
          ))}
          {ticks.map((t) => (
            <text key={t.i} x={x(t.i)} y={H - 7}>{t.t}</text>
          ))}
          {heure >= debut && heure < fin && (
            <line x1={x(heure)} x2={x(heure)} y1={PAD.t} y2={H - PAD.b} className="maintenant" />
          )}
          {series.map((s, k) => (
            <path key={s.k} d={chemins[k]} stroke={s.color} className="serie" />
          ))}
          {survol != null && <line x1={x(survol)} x2={x(survol)} y1={PAD.t} y2={H - PAD.b} className="curseur" />}
        </svg>

        {survol != null && (
          <div className={`tip${x(survol) > W * 0.7 ? ' gauche' : ''}`} style={{ left: x(survol) }}>
            <strong>{formatHeure.format(date(survol))} TU</strong>
            {series.map((s) => (
              <div key={s.k}>
                <i style={{ background: s.color }} /> {s.v[survol] != null ? `${s.v[survol].toFixed(2)} m` : '—'}
                {s.dir?.[survol] != null && ` · de ${cardinal(s.dir[survol])} (${Math.round(s.dir[survol])}°)`}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
