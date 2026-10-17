import vague from '../assets/vague.svg';
import Associations from './Associations.jsx';
import Footer from './Footer.jsx';

const REFLEXES = [
  ['01', 'Lire les conditions', 'Houle, vent, marée et coefficient avant de partir. Renoncer fait partie du jeu.'],
  ['02', 'Connaître les dangers', 'Courant d’arrachement : nager parallèlement au bord. Marée montante : accès coupés.'],
  ['03', 'Laisser la plage intacte', 'Rapporter ses déchets, épargner les dunes, garder ses distances avec phoques et oiseaux.'],
];

const AMP = [
  ['Une zone délimitée', 'Un espace de mer ou de littoral dont les limites sont fixées, avec un objectif : protéger durablement la vie qu’il abrite (poissons, oiseaux, phoques, herbiers, dunes).'],
  ['Plusieurs statuts', 'Parc naturel marin, réserve naturelle, site Natura 2000 en mer, arrêté de protection de biotope… Sur la carte, le statut est écrit sous le nom de chaque aire.'],
  ['Des règles locales', 'Elles changent d’une aire à l’autre : zones de quiétude, périodes de nidification, accès aux dunes. Avant d’y aller, renseigne-toi auprès du gestionnaire de l’aire.'],
];

const PRATIQUES = [
  ['Respecter les priorités', 'Le surfeur le plus proche du point où la vague déferle a la priorité. On ne double pas et on ne coupe pas la trajectoire d’un autre.'],
  ['Garder sa planche sous contrôle', 'Une planche lâchée est un projectile. Garde ton leash en bon état et ne t’engage pas dans une vague que tu ne maîtrises pas.'],
  ['Choisir un spot à son niveau', 'Lis les conditions sur la carte. En cas de doute, ne va pas à l’eau seul·e et préviens quelqu’un de ta sortie.'],
  ['Ne laisser aucune trace', 'Rapporte tes déchets, ta wax et ceux que tu croises. Reste sur les sentiers pour épargner les dunes.'],
  ['Respecter les locaux', 'Salue, attends ton tour au line-up, et ne montre pas à tout le monde un spot qui n’est pas le tien. Un bon spot se garde grâce à ceux qui le respectent.'],
  ['Respecter la faune', 'Garde tes distances avec les phoques et les oiseaux, surtout en période de nidification, et ne franchis pas les zones de quiétude. Si tu en croises, signale-le sur OBSenMER.'],
  ['Partager la plage', 'Baigneurs, kayakistes, pêcheurs : l’eau est à tous. Respecte les zones de baignade surveillées.'],
];

const CHIFFRES = [
  ['1', 'fichier vectoriel pour toute la côte, au lieu de milliers de tuiles'],
  ['< 10 Ko', 'par heure de houle sur toute la mer d’Iroise'],
  ['0', 'traceur, 0 publicité'],
  ['AA', 'contrastes WCAG 2.2, navigation au clavier'],
];

// Page « Océan & littoral » (Figma « Page — Océan & littoral ») + encart sur les aires marines protégées et bonnes pratiques
export default function Ocean() {
  return (
    <div className="page ocean">
      <header className="ocean-tete">
        <p className="surtitre">Océan &amp; littoral</p>
        <h1>Profiter de l’océan, sans rien lui prendre.</h1>
        <p>Trois réflexes avant d’aller à l’eau, et ce que Riklañ rend au littoral.</p>
      </header>
      <img className="vague" src={vague} alt="" />

      <section className="reflexes" aria-label="Trois réflexes">
        {REFLEXES.map(([n, titre, texte]) => (
          <article key={n}>
            <span className="numero">{n}</span>
            <h2>{titre}</h2>
            <p>{texte}</p>
          </article>
        ))}
      </section>

      <section className="ocean-bloc" id="amp" aria-labelledby="amp-titre">
        <h2 id="amp-titre">Une aire marine protégée, c’est quoi ?</h2>
        <p className="intro">
          Sur la carte, chaque spot indique les aires marines protégées (AMP) à moins de 300 m. Voici ce que ça veut dire.
        </p>
        <dl className="lignes">
          {AMP.map(([titre, texte]) => (
            <div key={titre} className="ligne">
              <dt>{titre}</dt>
              <dd>{texte}</dd>
            </div>
          ))}
        </dl>
        <p className="petit">Source des périmètres : Office français de la biodiversité (OFB), données ouvertes.</p>
      </section>

      <section className="ocean-bloc" id="pratiques" aria-labelledby="pratiques-titre">
        <h2 id="pratiques-titre">Les bonnes pratiques du surfeur</h2>
        <p className="intro">Le surf s’est construit sur le respect de l’océan et des autres. Sept habitudes à garder.</p>
        <dl className="lignes">
          {PRATIQUES.map(([titre, texte]) => (
            <div key={titre} className="ligne">
              <dt>{titre}</dt>
              <dd>{texte}</dd>
            </div>
          ))}
        </dl>
        <h3 className="sous-titre">Agir avec celles et ceux qui protègent l’océan</h3>
        <Associations />
      </section>

      <section className="urgence" aria-label="Urgence en mer">
        <p className="urgence-titre">En cas d’urgence en mer</p>
        <div className="numero-urgence"><b>196</b><span>Sauvetage en mer (CROSS), gratuit depuis un portable</span></div>
        <div className="numero-urgence"><b>112</b><span>Numéro d’urgence européen</span></div>
      </section>

      <section className="sobre" aria-labelledby="sobre-titre">
        <h2 id="sobre-titre">Un site sobre, lui aussi</h2>
        <div className="chiffres">
          {CHIFFRES.map(([valeur, libelle]) => (
            <div key={valeur}>
              <b>{valeur}</b>
              <p>{libelle}</p>
            </div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
