import { useCallback, useEffect, useMemo, useState } from 'react';
import vague from '../assets/vague.svg';
import voiture from '../assets/voiture.png';
import { CONFIG } from '../config.js';
import { api } from '../lib/api.js';
import { useJSON } from '../lib/donnees.js';
import Footer from './Footer.jsx';
import { ListeCommunautes, FormulairesCommunaute } from './Communautes.jsx';
import { Trajet, FormulaireTrajet } from './Trajets.jsx';

// Données personnelles : ce que fait réellement le back-end (mot de passe haché, cookie de session HttpOnly / SameSite)
const DONNEES = [
  ['Ce qu’on garde', 'Ton nom d’utilisateur, ton mot de passe haché, tes points, tes notes, tes partages, tes communautés et tes trajets.'],
  ['Visible par', 'Ton nom apparaît aux membres de tes communautés, sur tes trajets. Rien n’est visible sans compte, et une communauté privée n’est visible que de ses membres.'],
  ['Pourquoi', 'Faire marcher ton compte, tes partages et tes trajets. Ni revente, ni publicité.'],
  ['Cookie', 'Un seul : celui de la session. Il expire à la fermeture du navigateur.'],
  ['Durée', 'Tant que ton compte existe ; suppression après [durée] d’inactivité.'],
  ['Tes droits', `Accès, rectification, effacement, portabilité, opposition : ${CONFIG.contact || '[contact]'}, ou la CNIL.`],
  ['Hébergement', '[Hébergeur à définir]. Mots de passe hachés, cookie HttpOnly et SameSite.'],
];

// Page « Communauté » : du covoiturage entre surfeurs dans des communautés locales (publiques ou privées), sans messagerie.
// Rien n'est visible sans compte : les surfeurs gardent leurs spots pour eux
// (Figma « Page — Équipe & RGPD » pour la partie données personnelles)
export default function Communaute({ utilisateur, onConnexion }) {
  const connecte = !!utilisateur;
  const [donnees, setDonnees] = useState(null); // { communautes, sorties } | 'erreur'
  const [filtre, setFiltre] = useState(null);
  const [message, setMessage] = useState('');
  const plages = useJSON(CONFIG.data.plages);

  // Noms des spots de la carte : suggestions pour proposer un trajet
  const spots = useMemo(() => {
    if (!plages) return [];
    const [[sud, ouest], [nord, est]] = CONFIG.map.bounds;
    const noms = plages.features
      .filter((f) => { const [lon, lat] = f.geometry.coordinates; return lat >= sud && lat <= nord && lon >= ouest && lon <= est; })
      .map((f) => f.properties.nom);
    return [...new Set(noms)].sort((a, b) => a.localeCompare(b, 'fr'));
  }, [plages]);

  const charger = useCallback(
    () => Promise.all([api('/communautes.php'), api('/annonces.php')]).then(([communautes, sorties]) => setDonnees({ communautes, sorties })).catch(() => setDonnees('erreur')),
    [],
  );
  useEffect(() => { if (utilisateur) charger(); }, [charger, utilisateur]); // à l'arrivée connecté, ou dès qu'on se connecte

  // Exécute un appel puis recharge ; renvoie true si ça a marché (les formulaires se vident alors), sinon affiche l'erreur
  const agir = useCallback((appel) => appel.then(() => { setMessage(''); return charger().then(() => true); }).catch((e) => { setMessage(e.message); return false; }), [charger]);

  const { communautes = [], sorties = [] } = donnees && donnees !== 'erreur' ? donnees : {};
  const visibles = sorties.filter((t) => !filtre || t.communaute_id === filtre);
  const commun = { agir };

  return (
    <div className="page ocean communaute">
      <header className="ocean-tete communaute-tete">
        <div>
          <p className="surtitre">Communauté</p>
          <h1>Covoiturer entre surfeurs, tout près de chez toi.</h1>
          <p>
            Entre gens du coin : on partage la voiture jusqu’au spot, sans le crier sur tous les toits. Rejoins la communauté de ton coin ou
            crée la tienne, ouverte ou privée. Pas de chat : tu réserves une place.
          </p>
          <p className="discretion">
            <strong>Discrétion.</strong> Ce qui se passe au spot reste au spot : rien n’est public, les trajets ne sont visibles que des membres
            connectés d’une communauté. Une communauté publique accepte tout compte connecté ; pour un spot secret, crée un groupe privé et ne
            partage que son code. Et on respecte le line-up et ceux qui y étaient avant nous.
          </p>
        </div>
        <img className="voiture" src={voiture} alt="Une voiture en pâte à modeler, deux planches de surf sur le toit" />
      </header>

      {!connecte ? (
        <section className="ocean-bloc" aria-labelledby="connexion-titre">
          <h2 id="connexion-titre">Connecte-toi pour voir les communautés</h2>
          <p className="intro">Un compte est facultatif sur Riklañ, mais il faut en avoir un pour covoiturer : c’est ce qui garde les trajets entre membres.</p>
          <button className="btn" onClick={onConnexion}>Se connecter ou créer un compte</button>
        </section>
      ) : (
        <>
          {donnees === 'erreur' && <p className="erreur communaute-erreur" role="alert">Les communautés ne sont pas disponibles pour le moment.</p>}
          {message && <p className="erreur communaute-erreur" role="alert">{message}</p>}

          <section className="ocean-bloc" id="trajets" aria-labelledby="trajets-titre">
            <h2 id="trajets-titre">Trajets à venir</h2>
            {!donnees ? <p className="muted">Chargement…</p> : visibles.length === 0 ? (
              <p className="muted">Aucun trajet pour l’instant{filtre ? ' dans cette communauté' : ''}. Propose le premier.</p>
            ) : (
              <ul className="trajets">{visibles.map((t) => <Trajet key={t.id} t={t} {...commun} />)}</ul>
            )}
            <h3 className="sous-titre">Proposer un trajet</h3>
            <FormulaireTrajet communautes={communautes} spots={spots} {...commun} />
          </section>

          <section className="ocean-bloc" id="communautes" aria-labelledby="communautes-titre">
            <h2 id="communautes-titre">Les communautés</h2>
            {!donnees ? <p className="muted">Chargement…</p> : <ListeCommunautes communautes={communautes} filtre={filtre} onFiltre={setFiltre} {...commun} />}
            <FormulairesCommunaute {...commun} />
          </section>
        </>
      )}

      <section className="ocean-bloc" id="contribuer" aria-labelledby="contribuer-titre">
        <h2 id="contribuer-titre">Une question, une idée ?</h2>
        <p className="intro">Une idée pour la suite, un problème, une communauté à signaler : écris-nous.</p>
        {CONFIG.contact ? (
          <a className="btn" href={`mailto:${CONFIG.contact}?subject=${encodeURIComponent('Communauté Riklañ')}`}>Nous écrire</a>
        ) : (
          <p className="petit">[adresse de contact à renseigner]</p>
        )}
      </section>

      <img className="vague" src={vague} alt="" />

      <section className="rgpd" id="rgpd" aria-labelledby="rgpd-titre">
        <div className="rgpd-bref">
          <p className="surtitre">RGPD</p>
          <h2 id="rgpd-titre">Tes données, en bref</h2>
          <p>Sans compte, rien n’est enregistré. Avec un compte, seulement le nécessaire.</p>
        </div>
        <dl className="rgpd-detail">
          {DONNEES.map(([cle, valeur]) => (
            <div key={cle}>
              <dt>{cle}</dt>
              <dd>{valeur}</dd>
            </div>
          ))}
        </dl>
      </section>

      <Footer />
    </div>
  );
}
