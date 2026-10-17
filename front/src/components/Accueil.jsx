import { CONFIG } from '../config.js';
import AvantApres from './AvantApres.jsx';
import Associations, { LogosAssociations } from './Associations.jsx';

// Source de chaque courbe, avec la couleur utilisée dans les graphiques de la carte
const REGARDS = [
  ['mesure', 'Les mesures', 'Bouées CANDHIS (Cerema), au large.'],
  ['marc', 'Le modèle physique', 'MARC (Ifremer/SHOM), sur toute la mer d’Iroise.'],
  ['ia', 'Notre IA', 'Elle apprend des deux, pour mieux coller à la réalité.'],
];

// Ce qu'on veut ajouter ensuite (pitch du hackathon) : seul le partage de favoris entre comptes existe déjà
const A_VENIR = [
  ['Alertes', 'Bientôt', 'Une houle trop forte pour ton niveau, ou les conditions que tu attends : Riklan te prévient. Tu fixes tes seuils sur chacun de tes points.'],
  ['Communauté', 'En partie', 'Crée un groupe privé avec ta bande : vous y partagez vos points, vos sorties et vos notes, jamais en public. Le partage de favoris entre comptes fonctionne déjà.'],
  ['Covoiturage', 'Bientôt', 'Propose une place pour emmener ou ramener quelqu’un jusqu’au spot : moins de voitures sur la côte, plus de monde à l’eau.'],
];

// Présentation en haut de la page, sans barre de navigation : le titre et le logo, la comparaison avec / sans IA et la
// protection de l'océan. « Voir la carte » ouvre la page de la carte.
export default function Accueil({ onVoirCarte }) {
  return (
    <div className="accueil">
      <section className="hero">
        <img className="logo-hero" src={CONFIG.logo} alt="" />
        <h1>{CONFIG.name}</h1>
        <p className="accroche">Des prévisions de vagues par IA, pour surfer sans abîmer l’océan.</p>
      
        <button className="btn-carte" onClick={onVoirCarte}>
          Voir la carte
          <span className="btn-carte-fleche" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20"><path d="M5 12h14m0 0-6-6m6 6-6 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        </button>
        <div className="allies">
          <p className="petit">Pour surfer sans abîmer l’océan, on s’appuie sur elles et on renvoie vers elles :</p>
          <LogosAssociations />
        </div>
      </section>

      <section className="comparaison" aria-labelledby="ia-titre">
        <h2 id="ia-titre">Avec l’IA, la prévision colle mieux à la réalité</h2>
        <p className="intro">Fais glisser le curseur : à gauche la prévision du modèle physique seul, à droite celle de notre IA, sur la même carte.</p>
        <AvantApres />
        <ul className="regards">
          {REGARDS.map(([cle, titre, texte]) => (
            <li key={cle}>
              <i style={{ background: CONFIG.series[cle].color }} />
              <div>
                <strong>{titre}</strong>
                <span>{texte}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="a-venir" aria-labelledby="venir-titre">
        <h2 id="venir-titre">Prévenir, partager, bouger ensemble</h2>
        <p className="intro">Riklan est un prototype de hackathon : voici où on veut aller.</p>
        <dl className="lignes">
          {A_VENIR.map(([titre, etat, texte]) => (
            <div key={titre} className="ligne">
              <dt>{titre} <span className="etat">{etat}</span></dt>
              <dd>{texte}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="environnement" aria-labelledby="env-titre">
        <h2 id="env-titre">Le surf vit de l’océan, alors on le protège</h2>
        <div className="env-texte">
          <p>
            Les surfeurs sont aux premières loges : déchets sur la plage, eau qui se dégrade, dunes piétinées. Riklan montre sur chaque
            spot la qualité de l’eau et les zones protégées, pour surfer en connaissance de cause.
          </p>
          <p>
            Un déchet ramassé en sortant de l’eau, c’est déjà ça. Et si tu veux faire plus, des associations organisent des collectes
            et défendent le littoral : rejoins-les.
          </p>
          <p>
            Tu croises un dauphin, un phoque ou une autre espèce en mer ? Signale-le sur{' '}
            <a href="https://www.obsenmer.org/" target="_blank" rel="noopener noreferrer">OBSenMER<span className="sr-only"> (nouvel onglet)</span></a>,
            une application de science participative.
          </p>
          <p><a href="#/ocean">Voir les bonnes pratiques du surfeur</a></p>
        </div>
        <Associations />
      </section>
    </div>
  );
}
