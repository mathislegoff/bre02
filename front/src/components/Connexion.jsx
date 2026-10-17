import { useEffect, useRef, useState } from 'react';

// Fenêtre de connexion / création de compte, ouverte à la demande (barre de navigation, ou clic droit pour un favori).
// Un seul formulaire, deux boutons : submitter.value dit lequel a été cliqué
export default function Connexion({ onCompte, onFermer }) {
  const ref = useRef(null);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    if (!ref.current.open) ref.current.showModal(); // modale : focus piégé, Échap ferme
  }, []);

  const submit = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setErreur('');
    onCompte(e.nativeEvent.submitter.value, f.get('nom'), f.get('mdp')).catch((err) => setErreur(err.message));
  };

  return (
    <dialog
      ref={ref}
      className="dialogue"
      aria-labelledby="connexion-titre"
      onClose={onFermer}
      onClick={(e) => e.target === ref.current && ref.current.close()} // clic sur le fond
    >
      <div className="dialogue-tete">
        <h2 id="connexion-titre">Compte facultatif</h2>
        <button className="close" onClick={() => ref.current.close()} aria-label="Fermer">×</button>
      </div>
      <p className="muted">Riklan s’utilise sans compte. Un compte sert seulement à garder tes favoris et à les partager.</p>
      <form className="compte" onSubmit={submit}>
        <input name="nom" placeholder="Nom" aria-label="Nom" autoComplete="username" required autoFocus />
        <input name="mdp" type="password" placeholder="Mot de passe" aria-label="Mot de passe" autoComplete="current-password" required />
        <div className="compte-actions">
          <button className="primaire" value="connexion">Se connecter</button>
          <button value="inscription">Créer un compte</button>
        </div>
        {erreur && <p className="erreur" role="alert">{erreur}</p>}
      </form>
    </dialog>
  );
}
