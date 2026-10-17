import { useEffect, useRef, useState } from 'react';
import { quand } from '../lib/date.js';
import { AiresProtegees, MesuresBouee, QualiteEau, Vagues } from './InfosSpot.jsx';

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

// Petit formulaire d'une ligne (nom du favori, collègue avec qui partager) : remplace prompt()
function Saisie({ label, valeur = '', bouton, onValider, onAnnuler }) {
  const [erreur, setErreur] = useState('');
  const submit = (e) => {
    e.preventDefault();
    const texte = new FormData(e.currentTarget).get('texte').trim();
    if (texte) onValider(texte).catch((err) => setErreur(err.message));
  };
  return (
    <form className="saisie" onSubmit={submit}>
      <input name="texte" defaultValue={valeur} aria-label={label} placeholder={label} maxLength={100} required autoFocus />
      <button className="btn">{bouton}</button>
      {onAnnuler && <button type="button" className="lien" onClick={onAnnuler}>Annuler</button>}
      {erreur && <p className="erreur" role="alert">{erreur}</p>}
    </form>
  );
}

// Ajouter le point sélectionné aux favoris (ou dire qu'il y est déjà)
function BoutonFavori({ sel, utilisateur, favoriProche, onSelectFavori, onConnexion, onAjouter }) {
  const [saisie, setSaisie] = useState(false);
  if (favoriProche) {
    return <button className="lien" onClick={() => onSelectFavori(favoriProche.id)}>★ Dans tes favoris : {favoriProche.nom}</button>;
  }
  if (!utilisateur) return <button className="btn btn-secondaire" onClick={onConnexion}>☆ Ajouter aux favoris</button>;
  if (!saisie) return <button className="btn btn-secondaire" onClick={() => setSaisie(true)}>☆ Ajouter aux favoris</button>;
  return <Saisie label="Nom du favori" valeur={sel.nom} bouton="Enregistrer" onValider={onAjouter} onAnnuler={() => setSaisie(false)} />;
}

// Mon favori : note, ressenti, partages, suppression · Favori d'un collègue : lecture seule
function NotesFavori({ pin, onNoter, onPartager, onRetirerPartage, onSupprimer }) {
  const [partage, setPartage] = useState(false);
  if (pin.partage_par) {
    return (
      <div className="info-bloc">
        <span className="info-cle">Partagé par {pin.partage_par}</span>
        <div className="note-ligne">
          <Etoiles valeur={pin.etoiles} />
          {pin.note_le && <span className="muted">{quand(pin.note_le)}</span>}
        </div>
        {pin.ressenti && <p className="ressenti-lu">« {pin.ressenti} »</p>}
      </div>
    );
  }

  return (
    <div className="info-bloc">
      <span className="info-cle">Ma note</span>
      <div className="note-ligne">
        <Etoiles valeur={pin.etoiles} onChange={(n) => onNoter(pin.id, n, pin.ressenti ?? '')} />
        {pin.note_le && <span className="muted">notée le {quand(pin.note_le)}</span>}
      </div>
      {/* Enregistré quand on quitte le champ, seulement s'il a changé */}
      <textarea
        key={pin.id}
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
      {partage ? (
        <Saisie
          label="Nom du compte du collègue"
          bouton="Partager"
          onValider={(avec) => onPartager(pin.id, avec).then(() => setPartage(false))}
          onAnnuler={() => setPartage(false)}
        />
      ) : (
        <p className="actions-favori">
          <button className="lien" onClick={() => setPartage(true)}>Partager</button>
          <button className="lien danger" onClick={() => onSupprimer(pin.id)}>Supprimer le favori</button>
        </p>
      )}
    </div>
  );
}

// Fiche de ce qui est sélectionné sur la carte : spot, point en mer, bouée ou favori
function Fiche({ sel, vagues, bouee, heureTexte, onClose, ...favoris }) {
  const closeRef = useRef(null);

  // Focus sur « Fermer » à chaque nouvelle sélection, Échap pour fermer
  useEffect(() => {
    closeRef.current.focus();
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sel.cle, onClose]);

  const props = sel.f?.properties;
  return (
    <section className="plage" aria-labelledby="fiche-nom">
      <div className="plage-head">
        <div>
          <h2 id="fiche-nom" className="plage-nom">{sel.nom}</h2>
          <p className="muted">{sel.sous}</p>
        </div>
        <button ref={closeRef} className="close" onClick={onClose} aria-label="Fermer">×</button>
      </div>

      {sel.type === 'bouee' ? (
        <MesuresBouee mesure={bouee?.mesure ?? null} marc={bouee?.marc ?? null} quand={heureTexte} />
      ) : (
        <Vagues vagues={vagues} quand={heureTexte} />
      )}
      {props && (
        <>
          <QualiteEau qualite={props.qualite} />
          <AiresProtegees amp={props.amp} complet />
        </>
      )}
      {sel.pin ? <NotesFavori key={sel.pin.id} pin={sel.pin} {...favoris} /> : <BoutonFavori key={sel.cle} sel={sel} {...favoris} />}
      {props && <p className="note">Sources : houle MARC, qualité de l’eau ARS, zones protégées OFB.</p>}
    </section>
  );
}

// Liste des favoris : un clic sélectionne le favori (sa fiche s'ouvre au-dessus, la carte y va)
function Favoris({ utilisateur, pins, sel, onSelectFavori, onConnexion }) {
  if (!utilisateur) {
    return (
      <p className="muted">
        Garde tes spots préférés et partage-les avec tes amis. <button className="lien" onClick={onConnexion}>Se connecter</button>
      </p>
    );
  }
  if (!pins.length) return <p className="muted">Sélectionne un spot ou un point en mer, puis « Ajouter aux favoris ».</p>;
  return (
    <ul className="pins">
      {pins.map((p) => (
        <li key={p.id}>
          <button className="pin-ligne" aria-current={sel?.pin?.id === p.id || undefined} onClick={() => onSelectFavori(p.id)}>
            <span>{p.nom}</span>
            <span className="muted">
              {p.etoiles ? `${'★'.repeat(p.etoiles)} ` : ''}
              {p.partage_par && `par ${p.partage_par}`}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function SidePanel({ sel, vagues, bouee, heureTexte, onClose, ...favoris }) {
  return (
    <aside className="side">
      {sel && <Fiche sel={sel} vagues={vagues} bouee={bouee} heureTexte={heureTexte} onClose={onClose} {...favoris} />}
      <section>
        <h2>Mes favoris</h2>
        <Favoris sel={sel} {...favoris} />
      </section>
    </aside>
  );
}
