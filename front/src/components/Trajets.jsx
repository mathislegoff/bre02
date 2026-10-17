import { api } from '../lib/api.js';

const quand = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' });
export const formatQuand = (iso) => quand.format(new Date(iso)).replace(',', ' ·');

// Un covoiturage vers un spot, proposé dans une communauté. Pas de messagerie : on réserve une place.
// `agir(promesse)` exécute l'appel puis recharge la liste.
export function Trajet({ t, agir }) {
  const reste = t.places - t.places_prises;
  const appel = (corps) => agir(api('/annonces.php', corps));
  return (
    <li className="trajet">
      <div className="trajet-quand">
        <strong>{formatQuand(t.debut)}</strong>
        <span>{t.depart} → {t.spot}</span>
      </div>
      <div className="trajet-infos">
        <p>
          {reste > 0 ? `${reste} place${reste > 1 ? 's' : ''} libre${reste > 1 ? 's' : ''} sur ${t.places}` : 'Voiture complète'}
          {' · '}{t.communaute} · conducteur : {t.auteur}
        </p>
        {t.note && <p className="muted">{t.note}</p>}
        {t.participants?.length > 0 && <p className="petit">Passagers : {t.participants.join(', ')}</p>}
      </div>
      <div className="trajet-actions">
        {t.mienne ? (
          <button className="btn btn-secondaire" onClick={() => agir(api(`/annonces.php?id=${t.id}`, undefined, 'DELETE'))}>Supprimer mon trajet</button>
        ) : t.moi ? (
          <>
            <span className="etat">Place réservée</span>
            <button className="btn btn-secondaire" onClick={() => appel({ action: 'annuler', id: t.id })}>Libérer ma place</button>
          </>
        ) : reste > 0 ? (
          <button className="btn" onClick={() => appel({ action: 'venir', id: t.id })}>Réserver une place</button>
        ) : (
          <span className="etat">Complet</span>
        )}
      </div>
    </li>
  );
}

// Proposer un trajet : dans une communauté dont on est membre, avec des places en voiture
export function FormulaireTrajet({ communautes, spots, agir }) {
  const mes = communautes.filter((c) => c.membre);

  const envoyer = (e) => {
    e.preventDefault();
    const formulaire = e.currentTarget;
    const f = new FormData(formulaire);
    const debut = new Date(f.get('debut')).toISOString().replace(/\.\d{3}Z$/, 'Z'); // l'heure saisie est celle de l'appareil
    agir(api('/annonces.php', {
      action: 'creer', communaute_id: Number(f.get('communaute')), depart: f.get('depart'), spot: f.get('spot'), debut,
      places: Number(f.get('places')), note: f.get('note') || '',
    })).then((ok) => ok && formulaire.reset());
  };

  if (mes.length === 0) return <p className="muted">Rejoins une communauté ci-dessous pour proposer un trajet.</p>;
  return (
    <form className="formulaire" onSubmit={envoyer}>
      <label>Communauté
        <select name="communaute" required>{mes.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}</select>
      </label>
      <label>Départ<input name="depart" required maxLength={60} placeholder="Ville de départ" /></label>
      <label>Spot
        <input name="spot" list="spots" required maxLength={80} placeholder="Nom du spot" />
        <datalist id="spots">{spots.map((n) => <option key={n} value={n} />)}</datalist>
      </label>
      <label>Jour et heure<input name="debut" type="datetime-local" required /></label>
      <label>Places libres dans la voiture<input name="places" type="number" min={1} max={8} defaultValue={2} required /></label>
      <label className="large">Un mot (facultatif)<input name="note" maxLength={140} placeholder="Point de rendez-vous, équipement…" /></label>
      <button className="btn">Proposer le trajet</button>
    </form>
  );
}
