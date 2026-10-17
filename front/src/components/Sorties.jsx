import { useState } from 'react';
import { api } from '../lib/api.js';

export const NIVEAUX = { tous: 'Tous niveaux', debutant: 'Débutant', intermediaire: 'Intermédiaire', confirme: 'Confirmé' };

const quand = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
export const formatQuand = (iso) => quand.format(new Date(iso)).replace(',', ' ·');

// Une sortie proposée dans une communauté. Pas de messagerie : on répond « je viens », avec ou sans besoin d'une place en voiture.
// `agir(promesse)` exécute l'appel puis recharge la liste ; `connecte` / `onConnexion` : sans compte, les boutons ouvrent la connexion.
export function Sortie({ s, connecte, onConnexion, agir, compact }) {
  const reste = s.places - s.places_prises;
  const appel = (corps) => (connecte ? agir(api('/annonces.php', corps)) : onConnexion());
  const rejoindre = () => (connecte ? agir(api('/communautes.php', { action: 'rejoindre', id: s.communaute_id })) : onConnexion());

  return (
    <li className="sortie">
      <div className="sortie-quand">
        <strong>{formatQuand(s.debut)}</strong>
        <span>{s.spot}</span>
      </div>
      <div className="sortie-infos">
        <p>
          <span className="etat">{NIVEAUX[s.niveau]}</span> {s.communaute} · proposé par {s.auteur}
        </p>
        <p className="muted">
          {s.places > 0
            ? `Voiture depuis ${s.depart} : ${reste > 0 ? `${reste} place${reste > 1 ? 's' : ''} libre${reste > 1 ? 's' : ''} sur ${s.places}` : 'complète'}`
            : 'Chacun va au spot de son côté'}
          {' · '}{s.venus} {s.venus > 1 ? 'y vont' : 'y va'}
        </p>
        {!compact && s.note && <p className="muted">{s.note}</p>}
        {!compact && s.participants?.length > 0 && <p className="petit">Avec : {s.participants.join(', ')}</p>}
      </div>
      {!compact && (
        <div className="sortie-actions">
          {s.mienne ? (
            <button className="btn btn-secondaire" onClick={() => agir(api(`/annonces.php?id=${s.id}`, undefined, 'DELETE'))}>Supprimer</button>
          ) : s.moi ? (
            <>
              <span className="etat">{s.ma_place ? 'Place réservée' : 'Tu y vas'}</span>
              <button className="btn btn-secondaire" onClick={() => appel({ action: 'annuler', id: s.id })}>Annuler</button>
            </>
          ) : !s.membre && connecte ? (
            <button className="btn btn-secondaire" onClick={rejoindre}>Rejoindre pour répondre</button>
          ) : (
            <>
              <button className="btn" onClick={() => appel({ action: 'venir', id: s.id, place: false })}>Je viens</button>
              {reste > 0 && <button className="btn btn-secondaire" onClick={() => appel({ action: 'venir', id: s.id, place: true })}>Je viens, il me faut une place</button>}
            </>
          )}
        </div>
      )}
    </li>
  );
}

// Proposer une sortie : dans une communauté dont on est membre ; une voiture si on a des places
export function FormulaireSortie({ communautes, spots, connecte, onConnexion, agir }) {
  const [places, setPlaces] = useState(0);
  const mes = communautes.filter((c) => c.membre);

  const envoyer = (e) => {
    e.preventDefault();
    if (!connecte) return onConnexion();
    const f = new FormData(e.currentTarget);
    const formulaire = e.currentTarget;
    const debut = new Date(f.get('debut')).toISOString().replace(/\.\d{3}Z$/, 'Z'); // l'heure saisie est celle de l'appareil
    agir(api('/annonces.php', {
      action: 'creer', communaute_id: Number(f.get('communaute')), spot: f.get('spot'), debut, niveau: f.get('niveau'),
      places: Number(f.get('places') || 0), depart: f.get('depart') || '', note: f.get('note') || '',
    })).then((ok) => { if (ok) { formulaire.reset(); setPlaces(0); } });
  };

  if (connecte && mes.length === 0) return <p className="muted">Rejoins une communauté ci-dessous pour proposer une sortie.</p>;
  return (
    <form className="formulaire" onSubmit={envoyer}>
      <label>Communauté
        <select name="communaute" required disabled={!connecte && mes.length === 0}>
          {mes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
      </label>
      <label>Spot
        <input name="spot" list="spots" required maxLength={80} placeholder="Torche, Blancs Sablons…" />
        <datalist id="spots">{spots.map((n) => <option key={n} value={n} />)}</datalist>
      </label>
      <label>Jour et heure
        <input name="debut" type="datetime-local" required />
      </label>
      <label>Niveau
        <select name="niveau" defaultValue="tous">{Object.entries(NIVEAUX).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      </label>
      <label>Places en voiture (0 si tu n’en proposes pas)
        <input name="places" type="number" min={0} max={8} value={places} onChange={(e) => setPlaces(Number(e.target.value))} />
      </label>
      {places > 0 && <label>Départ de la voiture<input name="depart" required maxLength={60} placeholder="Brest, Quimper…" /></label>}
      <label className="large">Un mot (facultatif)
        <input name="note" maxLength={140} placeholder="Point de rendez-vous, équipement…" />
      </label>
      <button className="btn">Proposer la sortie</button>
    </form>
  );
}
