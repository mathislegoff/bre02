import { CONFIG } from '../config.js';
import vague from '../assets/vague-nav.svg';
import iconeConnexion from '../assets/icones/connexion.svg';
import iconeDeconnexion from '../assets/icones/deconnexion.svg';

const LIENS = [
  ['carte', 'Carte'],
  ['ocean', 'Océan & littoral'],
  ['communaute', 'Communauté'],
];

// Barre de navigation commune à toutes les pages (maquette Figma « Barre de navigation »), terminée par une vague
// children : boutons propres à la page (menu des favoris sur la carte), à gauche du compte
export default function Header({ page, utilisateur, onCompte, onConnexion, children }) {
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
      <BoutonsCompte utilisateur={utilisateur} onCompte={onCompte} onConnexion={onConnexion}>{children}</BoutonsCompte>
      <img className="vague-nav" src={vague} alt="" />
    </header>
  );
}

// Compte : une seule icône (la fenêtre propose connexion et création de compte), ou le nom + déconnexion.
// Icônes dans src/assets/icones/ (à remplacer par les versions en pâte à modeler) ; le texte reste pour les lecteurs d'écran
function BoutonsCompte({ utilisateur, onCompte, onConnexion, children }) {
  if (utilisateur) {
    return (
      <div className="compte-nav">
        {children}
        <span className="mini">{utilisateur.nom}</span>
        <button className="btn-icone" onClick={() => onCompte('deconnexion').catch(console.error)} title="Se déconnecter" aria-label="Se déconnecter">
          <img src={iconeDeconnexion} alt="" />
        </button>
      </div>
    );
  }
  return (
    <div className="compte-nav">
      {children}
      <button className="btn-icone" onClick={onConnexion} title="Se connecter ou créer un compte" aria-label="Se connecter ou créer un compte">
        <img src={iconeConnexion} alt="" />
      </button>
    </div>
  );
}
