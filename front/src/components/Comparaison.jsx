import { useEffect, useMemo, useRef, useState } from 'react';
import { CONFIG } from '../config.js';
import { temps } from '../lib/comparaison.js';

const MOIS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
const H = 200;
const PAD = { l: 36, r: 8, t: 8, b: 20 };

const jour = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const heure = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
});

export default function Comparaison({ data, onClose }) {
  const [mois, setMois] = useState(0); // 0..11, ou -1 pour l'année
  const [survol, setSurvol] = useState(null);
  const chartRef = useRef(null);
  const [W, setW] = useState(1000);

  // Le SVG suit la largeur réelle du conteneur (texte non déformé)
  useEffect(() => {
    if (!chartRef.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, e.contentRect.width)));
    ro.observe(chartRef.current);
    return () => ro.disconnect();
  }, [data]);

  // Plage d'indices horaires affichée
  const [debut, fin] = useMemo(() => {
    if (!data) return [0, 0];
    const n = data.series.marc.hs.length;
    if (mois < 0) return [0, n];
    const t0 = Date.parse(data.debut);
    const idx = (m) => Math.min(n, Math.round((Date.UTC(2013, m, 1) - t0) / 3600e3 / data.pas_heures));
    return [idx(mois), idx(mois + 1)];
  }, [data, mois]);

  const series = useMemo(
    () => (data ? Object.entries(CONFIG.series).filter(([k, s]) => s.visible && data.series[k]).map(([k, s]) => ({ k, ...s, v: data.series[k].hs })) : []),
    [data],
  );

  const max = useMemo(() => {
    let m = 1;
    series.forEach((s) => { for (let i = debut; i < fin; i++) if (s.v[i] > m) m = s.v[i]; });
    return Math.ceil(m);
  }, [series, debut, fin]);

  const x = (i) => PAD.l + ((i - debut) / Math.max(1, fin - debut - 1)) * (W - PAD.l - PAD.r);
  const y = (v) => H - PAD.b - (v / max) * (H - PAD.t - PAD.b);

  const chemin = (v) => {
    let d = '';
    let leve = true;
    for (let i = debut; i < fin; i++) {
      if (v[i] == null) { leve = true; continue; }
      d += `${leve ? 'M' : 'L'}${x(i).toFixed(1)},${y(v[i]).toFixed(1)}`;
      leve = false;
    }
    return d;
  };

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const i = Math.round(debut + ((px - PAD.l) / (W - PAD.l - PAD.r)) * (fin - debut - 1));
    setSurvol(i >= debut && i < fin ? i : null);
  };

  // Graduations : chaque semaine pour un mois, chaque mois pour l'année
  const ticks = [];
  if (data) {
    if (mois < 0) for (let m = 0; m < 12; m++) ticks.push({ i: Math.round((Date.UTC(2013, m, 1) - Date.parse(data.debut)) / 3600e3), t: MOIS[m] });
    else for (let i = debut; i < fin; i += 7 * 24) ticks.push({ i, t: jour.format(temps(data, i)) });
  }

  return (
    <footer className="comparaison">
      <div className="comp-head">
        <h2>Hauteur des vagues · {data?.station.nom ?? 'Pierres Noires'} · 2013</h2>
        <button className="fermer" onClick={onClose} aria-label="Fermer le graphique">×</button>
        <div className="mois">
          <button className={mois < 0 ? 'on' : ''} onClick={() => setMois(-1)}>Année</button>
          {MOIS.map((m, i) => (
            <button key={m} className={mois === i ? 'on' : ''} onClick={() => setMois(i)}>{m}</button>
          ))}
        </div>
      </div>

      <div className="comp-legend">
        {Object.entries(CONFIG.series).filter(([, s]) => s.visible).map(([k, s]) => (
          <span key={k} className={data?.series[k] ? '' : 'absent'}>
            <i style={{ background: s.color }} /> {s.label}
            {data && !data.series[k] && ' (à venir)'}
          </span>
        ))}
      </div>

      {!data ? (
        <p className="note">Chargement…</p>
      ) : (
        <div className="chart" ref={chartRef}>
          <svg viewBox={`0 0 ${W} ${H}`} onMouseMove={onMove} onMouseLeave={() => setSurvol(null)}>
            {Array.from({ length: max + 1 }, (_, v) => (
              <g key={v}>
                <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="grid" />
                <text x={PAD.l - 6} y={y(v) + 4} textAnchor="end">{v} m</text>
              </g>
            ))}
            {ticks.map((t) => (
              <text key={t.i} x={x(t.i)} y={H - 4} textAnchor="start">{t.t}</text>
            ))}
            {series.map((s) => (
              <path key={s.k} d={chemin(s.v)} stroke={s.color} className="serie" />
            ))}
            {survol != null && <line x1={x(survol)} x2={x(survol)} y1={PAD.t} y2={H - PAD.b} className="curseur" />}
          </svg>

          {survol != null && (
            <div className="tip" style={{ left: `${(x(survol) / W) * 100}%` }}>
              <strong>{heure.format(temps(data, survol))} TU</strong>
              {series.map((s) => (
                <div key={s.k}>
                  <i style={{ background: s.color }} /> {s.v[survol] != null ? `${s.v[survol].toFixed(2)} m` : '—'}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </footer>
  );
}
