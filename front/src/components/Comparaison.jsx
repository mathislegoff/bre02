import { useMemo } from 'react';
import { CONFIG } from '../config.js';
import { date, formatJour } from '../lib/temps.js';

const W = 800;
const H = 300;
const PAD = { l: 44, r: 12, t: 12, b: 34 };
const DEMI_FENETRE = 36; // heures de part et d'autre du pic : 3 jours

// Modèles comparés à la mesure de la bouée (CANDHIS, Cerema). `ia` est vide tant que l'équipe modèle n'a pas livré
// scripts/sources/ia_2013.csv (puis python3 scripts/comparaison.py) : la fenêtre se remplit alors toute seule.
const MODELES = ['marc', 'ia'];

const fmt = (x, d = 2) => x.toFixed(d).replace('.', ',');

// Écart d'un modèle à la mesure sur les heures où les deux existent : biais moyen, écart quadratique moyen (RMSE) et corrélation
function stats(ref, sim) {
  if (!sim) return null;
  let n = 0, sr = 0, ss = 0, d = 0, d2 = 0;
  for (let i = 0; i < ref.length; i++) {
    if (ref[i] == null || sim[i] == null) continue;
    n++; sr += ref[i]; ss += sim[i]; d += sim[i] - ref[i]; d2 += (sim[i] - ref[i]) ** 2;
  }
  if (n < 2) return null;
  const mr = sr / n, ms = ss / n;
  let cov = 0, vr = 0, vs = 0;
  for (let i = 0; i < ref.length; i++) {
    if (ref[i] == null || sim[i] == null) continue;
    cov += (ref[i] - mr) * (sim[i] - ms); vr += (ref[i] - mr) ** 2; vs += (sim[i] - ms) ** 2;
  }
  return { n, biais: d / n, rmse: Math.sqrt(d2 / n), r: cov / Math.sqrt(vr * vs) };
}

// Fenêtre de comparaison : la bouée (mesure), MARC et, à terme, notre IA, sur la plus forte houle mesurée de l'année,
// puis 2-3 chiffres sur toute l'année
export default function Comparaison({ comparaison }) {
  const series = comparaison?.series;
  const demo = comparaison?.demo?.includes('ia'); // prévision IA fictive (scripts/ia_demo.py) tant que l'équipe modèle n'a rien livré
  const mesure = series?.mesure?.hs;

  const { debut, fin } = useMemo(() => {
    if (!mesure) return {};
    let pic = 0;
    mesure.forEach((v, i) => { if (v != null && v > (mesure[pic] ?? -1)) pic = i; });
    const debut = Math.max(0, pic - DEMI_FENETRE);
    return { debut, fin: Math.min(mesure.length, pic + DEMI_FENETRE) };
  }, [mesure]);

  const chiffres = useMemo(() => Object.fromEntries(MODELES.map((m) => [m, mesure && stats(mesure, series[m]?.hs)])), [mesure, series]);

  if (!mesure) return <p className="muted">Chargement des mesures…</p>;

  const courbes = [
    { cle: 'mesure', v: mesure },
    ...MODELES.filter((m) => series[m]?.hs).map((m) => ({ cle: m, v: series[m].hs })),
  ];
  let max = 1;
  courbes.forEach((c) => { for (let i = debut; i < fin; i++) if (c.v[i] > max) max = c.v[i]; });
  max = Math.ceil(max);

  const x = (i) => PAD.l + ((i - debut) / (fin - debut - 1)) * (W - PAD.l - PAD.r);
  const y = (v) => H - PAD.b - (v / max) * (H - PAD.t - PAD.b);
  const chemin = (v) => {
    let d = '', leve = true;
    for (let i = debut; i < fin; i++) {
      if (v[i] == null) { leve = true; continue; }
      d += `${leve ? 'M' : 'L'}${x(i).toFixed(1)},${y(v[i]).toFixed(1)}`;
      leve = false;
    }
    return d;
  };
  const reperes = [];
  for (let i = debut; i < fin; i++) if (date(i).getUTCHours() === 0 || date(i).getUTCHours() === 12) reperes.push(i);

  return (
    <figure className="comparaison-fenetre">
      <div className="comparaison-legende">
        {['mesure', ...MODELES].map((cle) => (
          <span key={cle}>
            <i style={{ background: CONFIG.series[cle].color }} />
            {CONFIG.series[cle].label}
            {cle === 'ia' && !series.ia?.hs && <small> · à venir</small>}
            {cle === 'ia' && demo && <small> · données de démonstration</small>}
          </span>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Hauteur de la houle à la bouée des Pierres Noires du ${formatJour.format(date(debut))} au ${formatJour.format(date(fin - 1))} 2013 : mesure et prévisions`}>
        {Array.from({ length: max + 1 }, (_, v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="grille" />
            <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end">{v} m</text>
          </g>
        ))}
        {reperes.map((i) => (
          <text key={i} x={x(i)} y={H - 10} textAnchor="middle">
            {date(i).getUTCHours() === 0 ? formatJour.format(date(i)) : '12 h'}
          </text>
        ))}
        {courbes.map((c) => (
          <path key={c.cle} d={chemin(c.v)} stroke={CONFIG.series[c.cle].color} className={`courbe${c.cle === 'mesure' ? ' mesure' : ''}`} />
        ))}
      </svg>

      <figcaption>
        <p className="petit">
          {comparaison.station.nom} · la plus forte houle mesurée en 2013, sur 3 jours. Écarts de chaque modèle à la mesure sur toute l’année :
        </p>
        {demo && <p className="petit">La courbe de l’IA est une démonstration : de vraies prévisions la remplaceront dès qu’elles seront prêtes.</p>}
        <dl className="ecarts">
          {MODELES.map((m) => (
            <div key={m}>
              <dt><i style={{ background: CONFIG.series[m].color }} />{CONFIG.series[m].label}</dt>
              {chiffres[m] ? (
                <dd>
                  <span><b>{fmt(chiffres[m].rmse)} m</b> écart moyen</span>
                  <span><b>{chiffres[m].biais > 0 ? '+' : ''}{fmt(chiffres[m].biais)} m</b> biais</span>
                  <span><b>{fmt(chiffres[m].r)}</b> corrélation</span>
                </dd>
              ) : (
                <dd className="muted">En attente des prévisions de l’équipe modèle.</dd>
              )}
            </div>
          ))}
        </dl>
      </figcaption>
    </figure>
  );
}
