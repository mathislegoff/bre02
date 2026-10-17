import { CONFIG } from '../config.js';
import vague from '../assets/vague-nav.svg';
import iconeConnexion from '../assets/icones/connexion.svg';
import iconeDeconnexion from '../assets/icones/deconnexion.svg';

const LIENS = [
  ['carte', 'Carte'],
  ['ocean', 'Océan & littoral'],
  ['equipe', 'Équipe'],
];

// Barre de navigation commune à toutes les pages (maquette Figma « Barre de navigation »), terminée par une vague
export default function Header({ page, utilisateur, onCompte, onConnexion }) {
  return (
    <header className="header">
      <div className="marque-menu">
        <a className="marque" href="#/" title="Retour à la présentation">
          <img className="logo" src={CONFIG.logo} alt="" />
          <span className="marque-nom">{CONFIG.name}</span>
        </a>
        <nav aria-label="Principal">
          {LIENS.map(([id, texte]) => (
            <a key={id} className="lien-nav" href={`#/${id}`} aria-current={id === page ? 'page' : undefined}>
              {texte}
            </a>
          ))}
        </nav>
      </div>
      <BoutonsCompte utilisateur={utilisateur} onCompte={onCompte} onConnexion={onConnexion} />
      <img className="vague-nav" src={vague} alt="" />
    </header>
  );
}

// Compte : une seule icône (la fenêtre propose connexion et création de compte), ou le nom + déconnexion.
// Icônes dans src/assets/icones/ (à remplacer par les versions en pâte à modeler) ; le texte reste pour les lecteurs d'écran
function BoutonsCompte({ utilisateur, onCompte, onConnexion }) {
  if (utilisateur) {
    return (
      <div className="compte-nav">
        <span className="mini">{utilisateur.nom}</span>
        <button className="btn-icone" onClick={() => onCompte('deconnexion').catch(console.error)} title="Se déconnecter" aria-label="Se déconnecter">
          <img src={iconeDeconnexion} alt="" />
        </button>
      </div>
    );
  }
  return (
    <div className="compte-nav">
      <button className="btn-icone" onClick={onConnexion} title="Se connecter ou créer un compte" aria-label="Se connecter ou créer un compte">
        <img src={iconeConnexion} alt="" />
      </button>
    </div>
  );
}
