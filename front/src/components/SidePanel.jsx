import { useEffect, useRef, useState } from 'react';
import { quand } from '../lib/date.js';

function Plage({ plage, onClose }) {
  const { nom, commune } = plage.properties;
  const closeRef = useRef(null);

  // Focus sur « Fermer » à l'ouverture, Échap pour fermer
  useEffect(() => {
    closeRef.current.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [plage, onClose]);

  return (
    <section className="plage" aria-labelledby="plage-nom">
      <div className="plage-head">
        <div>
          <h2 id="plage-nom" className="plage-nom">{nom}</h2>
          <p className="muted">{commune}</p>
        </div>
        <button ref={closeRef} className="close" onClick={onClose} aria-label="Fermer">×</button>
      </div>
    </section>
  );
}

// Un seul formulaire, deux boutons : submitter.value dit lequel a été cliqué
function Connexion({ onCompte }) {
  const [erreur, setErreur] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setErreur('');
    onCompte(e.nativeEvent.submitter.value, f.get('nom'), f.get('mdp')).catch((err) => setErreur(err.message));
  };

  return (
    <form className="compte" onSubmit={submit}>
      <input name="nom" placeholder="Nom" aria-label="Nom" autoComplete="username" required />
      <input name="mdp" type="password" placeholder="Mot de passe" aria-label="Mot de passe" autoComplete="current-password" required />
      <div className="compte-actions">
        <button className="primaire" value="connexion">Se connecter</button>
        <button value="inscription">Créer un compte</button>
      </div>
      {erreur && <p className="erreur" role="alert">{erreur}</p>}
    </form>
  );
}

// Note de 1 à 5 : boutons si onChange (mon favori), simple affichage sinon (favori d'un collègue)
// Pleine ★ / vide ☆ : la forme change, pas seulement la couleur
function Etoiles({ valeur, onChange }) {
  if (!onChange) {
    if (!valeur) return null;
    return (
      <span className="etoiles" role="img" aria-label={`${valeur} étoile${valeur > 1 ? 's' : ''} sur 5`}>
        {'★'.repeat(valeur)}
        <span className="vide">{'☆'.repeat(5 - valeur)}</span>
      </span>
    );
  }

  return (
    <span className="etoiles">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          className={n <= valeur ? '' : 'vide'}
          onClick={() => onChange(n === valeur ? null : n)} // re-cliquer la même étoile efface la note
          aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
          aria-pressed={n === valeur}
        >
          {n <= valeur ? '★' : '☆'}
        </button>
      ))}
    </span>
  );
}

// Mon favori : noter, partager, retirer un partage, supprimer · Favori d'un collègue : lecture seule
function Pin({ pin, onSupprimerPin, onPartager, onRetirerPartage, onNoter }) {
  if (pin.partage_par) {
    return (
      <li>
        <div className="pin-ligne">
          {pin.nom}
          <span className="muted">par {pin.partage_par}</span>
        </div>
        <div className="note-ligne">
          <Etoiles valeur={pin.etoiles} />
          {pin.note_le && <span className="muted">{quand(pin.note_le)}</span>}
        </div>
        {pin.ressenti && <p className="ressenti-lu">« {pin.ressenti} »</p>}
      </li>
    );
  }

  return (
    <li>
      <div className="pin-ligne">
        {pin.nom}
        <span>
          <button className="lien" onClick={() => onPartager(pin.id)}>Partager</button>
          <button className="close" onClick={() => onSupprimerPin(pin.id)} aria-label={`Supprimer ${pin.nom}`}>×</button>
        </span>
      </div>
      <div className="note-ligne">
        <Etoiles valeur={pin.etoiles} onChange={(n) => onNoter(pin.id, n, pin.ressenti ?? '')} />
        {pin.note_le && <span className="muted">noté le {quand(pin.note_le)}</span>}
      </div>
      {/* Enregistré quand on quitte le champ, seulement s'il a changé */}
      <textarea
        className="ressenti"
        defaultValue={pin.ressenti ?? ''}
        placeholder="Ton ressenti…"
        aria-label={`Ressenti pour ${pin.nom}`}
        maxLength={500}
        rows={2}
        onBlur={(e) => e.target.value.trim() !== (pin.ressenti ?? '') && onNoter(pin.id, pin.etoiles, e.target.value.trim())}
      />
      {pin.partage_avec.length > 0 && (
        <p className="muted">
          Partagé avec{' '}
          {pin.partage_avec.map((nom) => (
            <button key={nom} className="tag" onClick={() => onRetirerPartage(pin.id, nom)} aria-label={`Ne plus partager avec ${nom}`}>
              {nom} ×
            </button>
          ))}
        </p>
      )}
    </li>
  );
}

function Favoris({ utilisateur, pins, onCompte, ...actions }) {
  if (!utilisateur) return <Connexion onCompte={onCompte} />;

  return (
    <>
      <p className="muted">
        {utilisateur.nom} · <button className="lien" onClick={() => onCompte('deconnexion').catch(console.error)}>Se déconnecter</button>
      </p>
      <ul className="pins">
        {pins.map((p) => (
          <Pin key={p.id} pin={p} {...actions} />
        ))}
      </ul>
      <p className="note">Clic droit sur la carte (appui long sur mobile) pour ajouter un favori.</p>
    </>
  );
}

export default function SidePanel({ plage, onClose, ...favoris }) {
  return (
    <aside className="side">
      {plage && <Plage plage={plage} onClose={onClose} />}
      <section>
        <h2>Mes favoris</h2>
        <Favoris {...favoris} />
      </section>
    </aside>
  );
}
