import { CONFIG } from '../config.js';
import Comparaison from './Comparaison.jsx';
import Footer from './Footer.jsx';
import vague from '../assets/vague.svg';
import phoque from '../assets/phoque.png';
import basHome from '../assets/bas-home.jpg';

// Présentation en haut de la page, sans barre de navigation : le titre et le logo, la comparaison avec / sans IA et la
// protection de l'environnement. « Voir la carte » ouvre la page de la carte.
export default function Accueil({ onVoirCarte }) {
  return (
    <div className="accueil">
      <section className="hero">
        <img className="logo-hero" src={CONFIG.logo} alt="" />
        <h1>{CONFIG.name}</h1>
        <p className="accroche">Des prévisions de vagues avec IA, pour surfer sans abîmer l’environnement.</p>
      
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
        <p className="intro">Ici, ce que mesure la bouée face aux prévisions du modèle physique et de Riklañ model : plus une courbe colle à celle de la bouée, meilleure est la prévision.</p>
        <div className="cadre-argile">
          <Comparaison />
        </div>
      </section>

      <section className="environnement" aria-labelledby="env-titre">
        <h2 id="env-titre">Le surf vit de la nature, alors on la protège</h2>
        <div className="env-haut">
          <div className="env-texte">
            <p className="env-intro">Autour du site, l’association fait vivre une communauté :</p>
            <ul className="env-points">
              <li>Le code du surfeur</li>
              <li>Les bons réflexes face aux espèces protégées</li>
              <li>Des solutions locales : réparer, revaloriser son matériel, covoiturer</li>
            </ul>
            <p><a className="btn btn-secondaire" href="#/ocean">Voir les bonnes pratiques du surfeur</a></p>
          </div>
          <img className="phoque" src={phoque} alt="Un phoque en pâte à modeler" />
        </div>
      </section>

      {/* Fin de page : une vague, puis les crédits sur fond mer (plus de grand blanc en bas) */}
      <img className="vague-fin" src={vague} alt="" />
      <div className="fin-accueil">
        <Footer />
      </div>
    </div>
  );
}
