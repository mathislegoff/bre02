import { useState } from 'react';
import { CONFIG } from '../config.js';
import { useJSON } from '../lib/donnees.js';
import { date, formatJour } from '../lib/temps.js';

const formatJourLong = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });

const W = 800;
const H = 300;
const PAD = { l: 44, r: 16, t: 12, b: 50 };

// Ce qu'on compare : hauteur et période de la houle (les deux ont une mesure de la bouée, MARC et l'IA)
const GRANDEURS = {
  hs: { nom: 'Hauteur', unite: 'm', graduation: 1, decimales: 2 },
  tp: { nom: 'Période', unite: 's', graduation: 4, decimales: 1 },
};
// Modèles comparés à la mesure de la bouée (CANDHIS, Cerema)
const MODELES = ['marc', 'ia'];
const fmt = (x, d = 2) => x.toFixed(d).replace('.', ',');

// Fenêtre de comparaison : les prochaines 48 h, de 00 h à 24 h chaque jour. La bouée (mesure), MARC et Riklañ model, puis 3 chiffres par
// modèle sur toute l'année. Données : public/data/comparaison-48h.json (scripts/export_48h.py), versionné dans git
export default function Comparaison() {
  const donnees = useJSON(CONFIG.data.comparaison48);
  const [grandeur, setGrandeur] = useState('hs');
  if (!donnees) return <p className="muted">Chargement des mesures…</p>;

  const { series, ecarts } = donnees;
  const g = GRANDEURS[grandeur];
  const demo = donnees.demo?.includes('ia'); // série IA fictive (scripts/ia_demo.py) tant que l'équipe modèle n'a rien livré
  const cles = ['mesure', ...MODELES.filter((m) => series[m])]; // mesure, MARC, IA : l'IA est dessinée en dernier, donc au-dessus
  const n = series.mesure.hs.length; // points de 00 h à 48 h
  const base = Math.round((Date.parse(donnees.debut) - CONFIG.periode.debut) / 3600e3); // indice horaire du premier point
  const heureDu = (i) => date(base + i).getUTCHours();

  let max = g.graduation;
  cles.forEach((k) => series[k][grandeur].forEach((v) => { if (v > max) max = v; }));
  max = Math.ceil(max / g.graduation) * g.graduation;
  const graduations = Array.from({ length: max / g.graduation + 1 }, (_, k) => k * g.graduation);

  const x = (i) => PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r);
  const y = (v) => H - PAD.b - (v / max) * (H - PAD.t - PAD.b);
  const chemin = (v) => {
    let d = '', leve = true;
    v.forEach((val, i) => {
      if (val == null) { leve = true; return; }
      d += `${leve ? 'M' : 'L'}${x(i).toFixed(1)},${y(val).toFixed(1)}`;
      leve = false;
    });
    return d;
  };
  // Repères toutes les 6 h : 00 h, 06 h, 12 h, 18 h, et 24 h à droite ; le jour est écrit sous le repère de 12 h
  const reperes = Array.from({ length: n }, (_, i) => i).filter((i) => i % 6 === 0);
  const libelle = (i) => (i === n - 1 && heureDu(i) === 0 ? '24 h' : `${String(heureDu(i)).padStart(2, '0')} h`);
  const logo = (k) => (k === 'ia' ? <img className="legende-logo" src={CONFIG.logo} alt="" style={{ borderColor: CONFIG.series.ia.color }} /> : <i style={{ background: CONFIG.series[k].color }} />);

  return (
    <figure className="comparaison-fenetre">
      <div className="comparaison-entete">
        <div className="comparaison-legende">
          {cles.map((k) => (
            <span key={k}>
              {logo(k)}
              {CONFIG.series[k].label}
              {k === 'ia' && demo && <small> · données de démonstration</small>}
            </span>
          ))}
        </div>
        <div className="grandeurs" role="group" aria-label="Grandeur affichée">
          {Object.entries(GRANDEURS).map(([cle, { nom }]) => (
            <button key={cle} aria-pressed={grandeur === cle} onClick={() => setGrandeur(cle)}>{nom}</button>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${g.nom} de la houle à la bouée des Pierres Noires du ${formatJour.format(date(base))} au ${formatJour.format(date(base + n - 1))} 2013, sur 48 heures : mesure et prévisions`}>
        {graduations.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="grille" />
            <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end">{v} {g.unite}</text>
          </g>
        ))}
        {reperes.filter((i) => heureDu(i) === 0).map((i) => (
          <line key={`j${i}`} x1={x(i)} x2={x(i)} y1={PAD.t} y2={H - PAD.b} className="jour" />
        ))}
        {reperes.map((i) => (
          <g key={i}>
            <text x={x(i)} y={H - 28} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} className={heureDu(i) === 0 ? 'heure minuit' : 'heure'}>{libelle(i)}</text>
            {heureDu(i) === 12 && <text x={x(i)} y={H - 8} textAnchor="middle" className="date">{formatJourLong.format(date(base + i))}</text>}
          </g>
        ))}
        {cles.map((k) => (
          <path key={k} d={chemin(series[k][grandeur])} stroke={CONFIG.series[k].color} className={`courbe ${k}`} />
        ))}
      </svg>

      <figcaption>
        <p className="petit">
          {donnees.station.nom} · les prochaines 48 h, de 00 h à 24 h chaque jour (heure TU). Écarts de chaque modèle à la mesure sur toute l’année :
        </p>
        {demo && <p className="petit">La courbe de Riklañ model est une démonstration : de vraies prévisions la remplaceront dès qu’elles seront prêtes.</p>}
        <dl className="ecarts">
          {MODELES.filter((m) => ecarts[grandeur][m]).map((m) => {
            const e = ecarts[grandeur][m];
            return (
              <div key={m}>
                <dt>{logo(m)}{CONFIG.series[m].label}</dt>
                <dd>
                  <span><b>{fmt(e.rmse, g.decimales)} {g.unite}</b> écart moyen</span>
                  <span><b>{e.biais > 0 ? '+' : ''}{fmt(e.biais, g.decimales)} {g.unite}</b> biais</span>
                  <span><b>{fmt(e.r)}</b> corrélation</span>
                </dd>
              </div>
            );
          })}
        </dl>
      </figcaption>
    </figure>
  );
}
