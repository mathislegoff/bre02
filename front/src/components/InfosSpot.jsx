import { CONFIG, niveau, qualiteCouleur } from '../config.js';

const MAX_AIRES = 3;

// Statuts officiels → libellé court et lisible (les doublons disparaissent : Natura 2000 « oiseaux » et « habitats » restent distincts)
const STATUTS = [
  [/Parc naturel marin/, 'Parc naturel marin'],
  [/OSPAR/, 'Protection OSPAR (Atlantique Nord-Est)'],
  [/\(N2000, DO\)/, 'Natura 2000 · oiseaux'],
  [/\(N2000, DHFF\)/, 'Natura 2000 · habitats'],
  [/Réserve de biosphère/, 'Réserve de biosphère'],
  [/Ramsar/, 'Zone humide Ramsar'],
];
const statutCourt = (s) => STATUTS.find(([re]) => re.test(s))?.[1] ?? s;
const statuts = (liste) => [...new Set(liste.map(statutCourt))];

// Qualité de l'eau du site de baignade (classement ARS)
export function QualiteEau({ qualite }) {
  return (
    <p className="info-ligne">
      <span className="info-cle">Qualité de l’eau <small>(classement ARS)</small></span>
      <span className="qualite">
        <i style={{ background: qualiteCouleur(qualite) }} />
        {qualite || 'Non classé'}
      </span>
    </p>
  );
}

// Zones protégées : le spot est dedans ou à moins de 300 m (périmètres OFB). complet = toutes, sinon les premières
export function AiresProtegees({ amp = [], complet }) {
  const vues = complet ? amp : amp.slice(0, MAX_AIRES);
  return (
    <div className="info-bloc">
      <span className="info-cle">Zone protégée <a href="#/ocean/amp">C’est quoi ?</a></span>
      {amp.length === 0 ? (
        <p className="muted">Ce spot n’est dans aucune aire marine protégée, ni à moins de 300 m.</p>
      ) : (
        <>
          <p className="muted">Dans une aire marine protégée, ou à moins de 300 m :</p>
          <ul className="aires">
            {vues.map((a) => (
              <li key={a.nom}>
                <strong>{a.nom}</strong>
                <span>{statuts(a.statuts).join(' · ')}</span>
              </li>
            ))}
            {vues.length < amp.length && <li className="muted">+ {amp.length - vues.length} autres dans la fiche</li>}
          </ul>
        </>
      )}
    </div>
  );
}

const fmt = (x) => x.toFixed(1).replace('.', ',');
const SENS = ['du nord', 'du nord-est', 'de l’est', 'du sud-est', 'du sud', 'du sud-ouest', 'de l’ouest', 'du nord-ouest'];
const maj = (t) => t[0].toUpperCase() + t.slice(1);
const sens = (deg) => SENS[Math.round(deg / 45) % 8];

// Rose de direction (Figma « Rose de direction ») : graduations tous les 30°, flèche = vers où va la houle
function Rose({ dir, taille = 72 }) {
  return (
    <svg className="rose" width={taille} height={taille} viewBox="-50 -50 100 100" role="img" aria-label={`Houle venant de ${Math.round(dir)}°`}>
      <circle r="47" fill="none" stroke="var(--line)" strokeWidth="2" />
      {Array.from({ length: 12 }, (_, i) => (
        <line key={i} y1="-47" y2={i % 3 ? -41 : -38} stroke="var(--muted)" strokeWidth="1.5" transform={`rotate(${i * 30})`} />
      ))}
      {[['N', 0, -26], ['E', 28, 4], ['S', 0, 34], ['O', -28, 4]].map(([t, x, y]) => (
        <text key={t} x={x} y={y} textAnchor="middle" fontSize="13" fill="var(--muted)">{t}</text>
      ))}
      <g transform={`rotate(${(dir + 180) % 360})`} fill="var(--ocean)" stroke="var(--ocean)">
        <line y1="20" y2="-14" strokeWidth="5" strokeLinecap="round" />
        <path d="M0 -26 L10 -12 L-10 -12 Z" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

// Houle à l'heure choisie sur la timeline : hauteur, niveau (jauge 0 à max m) et direction (MARC)
export function Vagues({ vagues, quand, source = 'MARC', compact }) {
  const { max, couleurs } = CONFIG.echelle;
  if (vagues === undefined) return <p className="muted">Chargement de la houle…</p>;
  if (vagues === null) return <p className="muted">{source === 'CANDHIS' ? 'Pas de mesure à cette heure.' : 'Pas de donnée de houle à moins de 15 km de ce spot.'}</p>;
  const { hs, dir } = vagues;
  const n = niveau(hs);
  return (
    <div className="vagues">
      <div className="info-ligne">
        <span className="info-cle">Houle · {source}{quand && ` · ${quand}`}</span>
      </div>
      <div className="vagues-haut">
        <strong className="hs">{fmt(hs)} <small>m</small></strong>
        <span className="niveau">{n.nom}</span>
      </div>
      <div className="jauge" role="img" aria-label={`${fmt(hs)} m sur ${max} m : ${n.nom}`}>
        <div className="jauge-barre" style={{ background: `linear-gradient(to right, ${couleurs.join(', ')})` }}>
          <i style={{ left: `${Math.min(100, (hs / max) * 100)}%` }} />
        </div>
        <div className="bornes"><span>0 m</span><span>{max / 2} m</span><span>{max} m</span></div>
      </div>
      {dir != null && (
        <div className="houle">
          <Rose dir={dir} taille={compact ? 64 : 88} />
          <div>
            <strong>{maj(sens(dir))} · {Math.round(dir)}°</strong>
            {vagues.tp != null && <p>Période pic : {fmt(vagues.tp)} s</p>}
            <p className="muted">Direction d’où vient la houle (la flèche montre où elle va).{vagues.km != null && ` Point MARC à ${Math.round(vagues.km)} km.`}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Bouée CANDHIS (Cerema) : mesures à l'heure choisie, comparées au modèle MARC au même point
export function MesuresBouee({ mesure, marc, quand }) {
  return (
    <>
      <Vagues vagues={mesure} quand={quand} source="CANDHIS" />
      {marc != null && mesure && (
        <p className="info-ligne">
          <span className="info-cle">Modèle MARC au même point</span>
          <strong>{fmt(marc)} m</strong>
        </p>
      )}
    </>
  );
}
