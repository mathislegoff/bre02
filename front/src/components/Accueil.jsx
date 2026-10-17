import { CONFIG } from '../config.js';
import Comparaison from './Comparaison.jsx';
import Associations from './Associations.jsx';
import Footer from './Footer.jsx';
import vague from '../assets/vague.svg';
import phoque from '../assets/phoque.png';
import basHome from '../assets/bas-home.jpg';

// Présentation en haut de la page, sans barre de navigation : le titre et le logo, la comparaison avec / sans IA et la
// protection de l'océan. « Voir la carte » ouvre la page de la carte.
export default function Accueil({ onVoirCarte, comparaison }) {
  return (
    <div className="accueil">
      <section className="hero">
        <img className="logo-hero" src={CONFIG.logo} alt="" />
        <h1>{CONFIG.name}</h1>
        <p className="accroche">Des prévisions de vagues par IA, pour surfer sans abîmer l'océan</p>
      
        <button className="btn-carte" onClick={onVoirCarte}>
          Voir la carte
          <span className="btn-carte-fleche" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20"><path d="M5 12h14m0 0-6-6m6 6-6 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </span>
        </button>
      </section>

      {/* Transition sous « Voir la carte » : de la plage vers la mer, en pâte à modeler */}
      <img className="bas-home" src={basHome} alt="Une plage de sable et de galets qui descend vers la mer, en pâte à modeler" />

      <section className="comparaison" aria-labelledby="ia-titre">
        <h2 id="ia-titre">La houle, mesurée et prévue</h2>
        <p className="intro">Riklañ prédit la houle : hauteur, période et direction, spot par spot. Ici, ce que mesure la bouée face à ce que prévoit le modèle physique et, à terme, notre IA : plus une courbe colle à celle de la bouée, meilleure est la prévision.</p>
        <div className="cadre-argile">
          <Comparaison comparaison={comparaison} />
        </div>
      </section>

      <section className="environnement" aria-labelledby="env-titre">
        <h2 id="env-titre">Le surf vit de l’océan, alors on le protège</h2>
        <div className="env-haut">
        <div className="env-texte">
          <p>
            Les surfeurs sont aux premières loges : déchets sur la plage, eau qui se dégrade, dunes piétinées. Riklañ montre sur chaque
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
        <img className="phoque" src={phoque} alt="Un phoque en pâte à modeler" />
        </div>
        <Associations />
      </section>

      {/* Fin de page : une vague, puis les crédits sur fond mer (plus de grand blanc en bas) */}
      <img className="vague-fin" src={vague} alt="" />
      <div className="fin-accueil">
        <Footer />
      </div>
    </div>
  );
}
