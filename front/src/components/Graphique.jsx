import { useEffect, useMemo, useRef, useState } from 'react';
import { CONFIG } from '../config.js';
import { cardinal } from '../lib/champ.js';
import { ANNEE, date, formatHeure, formatJour, heureDe } from '../lib/temps.js';

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const PAD = { l: 36, r: 8, t: 8, b: 24 };
const { heures } = CONFIG.periode;
const debutMois = (m) => Math.max(0, Math.min(heures, heureDe(Date.UTC(ANNEE, m, 1))));

// series : [{ k, label, color, v: [m | null] × heures, dir?: [° | null] }], déjà filtrées (visibles et disponibles)
export default function Graphique({ titre, series, attente, heure, setHeure, onClose }) {
  const [annee, setAnnee] = useState(false);
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

  // Fenêtre affichée : l'année, ou le mois de l'heure courante
  const mois = date(heure).getUTCMonth();
  const [debut, fin] = annee ? [0, heures] : [debutMois(mois), debutMois(mois + 1)];

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

  // Graduations : chaque semaine pour un mois, chaque mois pour l'année
  const ticks = [];
  if (annee) for (let m = 0; m < 12; m++) ticks.push({ i: debutMois(m), t: MOIS[m] });
  else for (let i = debut; i < fin; i += 7 * 24) ticks.push({ i, t: formatJour.format(date(i)) });

  return (
    <section className="graphique" aria-label={titre}>
      <div className="graph-head">
        <h2>{titre}</h2>
        <button className="close" onClick={onClose} aria-label="Fermer le graphique">×</button>
      </div>
      <div className="mois">
        <button aria-pressed={annee} onClick={() => setAnnee(true)}>Année</button>
        {MOIS.map((m, i) => (
          <button
            key={m}
            aria-pressed={!annee && mois === i}
            onClick={() => { setAnnee(false); setHeure(debutMois(i)); }}
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
