import { useState } from 'react';
import { CONFIG } from '../config.js';
import { CONDITIONS, HORIZON, prochaineHeure } from '../lib/alerte.js';
import { date, formatComplet } from '../lib/temps.js';
import interrupteurActif from '../assets/icones/interrupteur-actif.svg';
import interrupteurInactif from '../assets/icones/interrupteur-inactif.svg';

const { max: MAX, pas } = CONFIG.echelle;
const VENT_MAX = 40; // nds, bout du curseur de vent
const DEFAUT = { houle: [1, 2.5], vent: 20, eau: [3, 5.5], actives: [] }; // niveaux de la maquette, alertes éteintes
const GRADUATIONS = Array.from({ length: MAX + 1 }, (_, m) => m);
const fmt = (x) => x.toFixed(1).replace('.', ',');
const pct = (m) => `${(Math.min(m, MAX) / MAX) * 100}%`;

// Libellé de chaque ligne (Figma « Ligne d'alerte ») et unité de la valeur prévue
const LIBELLE = {
  houle: (p) => `Houle entre ${fmt(p[0])} et ${fmt(p[1])} m`,
  vent: (v) => `Vent de moins de ${v} nds`,
  eau: (p) => `Hauteur d’eau entre ${fmt(p[0])} et ${fmt(p[1])} m`,
};
const UNITE = { houle: (x) => `${fmt(x)} m`, vent: (x) => `${Math.round(x)} nds`, eau: (x) => `${fmt(x)} m` };

// Heure prévue en clair : « demain 9 h TU »… La période commence à minuit TU
function moment(i, heure) {
  const jours = Math.floor(i / 24) - Math.floor(heure / 24);
  if (jours < 2) return `${jours ? 'demain' : 'aujourd’hui'} ${date(i).getUTCHours()} h TU`;
  return `le ${formatComplet.format(date(i))} TU`;
}

// Ce que prévoit le modèle pour une condition, à partir de l'heure de la frise
function prevision(valeurs, heure, ok, unite) {
  if (!valeurs) return 'En attente des données';
  const i = prochaineHeure(valeurs, heure, ok);
  if (i === heure) return `En ce moment : ${unite(valeurs[i])}, atteint`;
  if (i != null) return `Prévu ${moment(i, heure)} : ${unite(valeurs[i])}, atteint`;
  const maintenant = valeurs[heure] != null ? ` (en ce moment ${unite(valeurs[heure])})` : '';
  return `Pas atteint sur les ${HORIZON / 24} prochains jours${maintenant}`;
}

// Jauge « ta plage idéale » (Figma « Jauge hauteur d'eau », mode Privé) : deux curseurs natifs superposés sur la piste.
// Les curseurs débordent d'une demi-poignée de chaque côté : le centre de la poignée tombe pile sur la graduation
function Jauge({ titre, nom, plage: [a, b], maintenant, onChange }) {
  return (
    <div className="jauge-bloc">
      <div className="alerte-tete">
        <span>{titre}</span>
        <span>{fmt(a)} – {fmt(b)} m</span>
      </div>
      <div className="jauge-plage">
        <div className="piste" />
        <div className="zone" style={{ left: pct(a), width: pct(b - a) }} />
        {maintenant != null && (
          <>
            <i className="trait" style={{ left: pct(maintenant) }} />
            {/* étiquette gardée dans la jauge quand la valeur est tout au bord */}
            <span className="texte" style={{ left: pct(Math.min(Math.max(maintenant, 1), MAX - 1)) }}>maintenant {fmt(maintenant)} m</span>
          </>
        )}
        <input type="range" min={0} max={MAX} step={pas} value={a} aria-label={`${nom} minimum`} aria-valuetext={`${fmt(a)} m`}
          onChange={(e) => onChange([Math.min(+e.target.value, b - pas), b])} />
        <input type="range" min={0} max={MAX} step={pas} value={b} aria-label={`${nom} maximum`} aria-valuetext={`${fmt(b)} m`}
          onChange={(e) => onChange([a, Math.max(+e.target.value, a + pas)])} />
        <div className="bornes">{GRADUATIONS.map((m) => <span key={m}>{m} m</span>)}</div>
      </div>
    </div>
  );
}

// Vent : un seul curseur natif, le maximum supporté
function Vent({ max, maintenant, onChange }) {
  return (
    <div className="jauge-bloc">
      <div className="alerte-tete">
        <span>Vent</span>
        <span>moins de {max} nds</span>
      </div>
      <input className="vent-max" type="range" min={5} max={VENT_MAX} step={1} value={max} aria-label="Vent maximum"
        aria-valuetext={`moins de ${max} nœuds`} onChange={(e) => onChange(+e.target.value)} />
      {maintenant != null && <span className="muted">maintenant {Math.round(maintenant)} nds</span>}
    </div>
  );
}

// « Mes alertes » d'un de mes favoris : houle, vent et hauteur d'eau, chacune avec son interrupteur (enregistré tout de suite).
// « Modifier mes niveaux » ouvre les jauges, enregistrées d'un coup. serie : séries du point (hs, vent, eau), heure : celle de la frise
export default function Alerte({ pin, serie, heure, onAlerte }) {
  const niveaux = pin.alerte ?? DEFAUT;
  const [edition, setEdition] = useState(null); // niveaux en cours de modification, null hors modification
  const [erreur, setErreur] = useState('');
  const envoyer = (alerte) => onAlerte(pin.id, alerte).then(() => { setErreur(''); return true; }, (e) => { setErreur(e.message); return false; });
  const basculer = (cle) => {
    const actives = niveaux.actives.includes(cle) ? niveaux.actives.filter((c) => c !== cle) : [...niveaux.actives, cle];
    envoyer({ ...niveaux, actives });
  };
  const regler = (cle) => (v) => setEdition((n) => ({ ...n, [cle]: v }));
  const maintenant = (p) => serie?.[p]?.[heure] ?? null;

  return (
    <section className="alertes" aria-labelledby="titre-alertes">
      <h3 id="titre-alertes">Mes alertes</h3>
      <ul className="lignes-alerte">
        {CONDITIONS.map(({ cle, param, ok }) => {
          const active = niveaux.actives.includes(cle);
          return (
            <li key={cle} className="ligne-alerte">
              <div>
                <strong>{LIBELLE[cle](niveaux[cle])}</strong>
                <span>{prevision(serie?.[param], heure, (x) => ok(x, niveaux[cle]), UNITE[cle])}</span>
              </div>
              <button className="interrupteur" role="switch" aria-checked={active} aria-label={`Alerte ${LIBELLE[cle](niveaux[cle]).toLowerCase()}`} onClick={() => basculer(cle)}>
                <img src={active ? interrupteurActif : interrupteurInactif} alt="" />
              </button>
            </li>
          );
        })}
      </ul>
      {edition ? (
        <div className="edition-niveaux">
          <Jauge titre="Houle" nom="Houle" plage={edition.houle} maintenant={maintenant('hs')} onChange={regler('houle')} />
          <Vent max={edition.vent} maintenant={maintenant('vent')} onChange={regler('vent')} />
          <Jauge titre="Hauteur d’eau · ta plage idéale" nom="Hauteur d’eau" plage={edition.eau} maintenant={maintenant('eau')} onChange={regler('eau')} />
          <p className="actions-favori">
            <button className="btn" onClick={() => envoyer({ ...niveaux, ...edition }).then((ok) => ok && setEdition(null))}>Enregistrer</button>
            <button className="lien" onClick={() => setEdition(null)}>Annuler</button>
          </p>
        </div>
      ) : (
        <button className="lien" onClick={() => setEdition({ houle: niveaux.houle, vent: niveaux.vent, eau: niveaux.eau })}>Modifier mes niveaux</button>
      )}
      {erreur && <p className="erreur" role="alert">{erreur}</p>}
    </section>
  );
}
