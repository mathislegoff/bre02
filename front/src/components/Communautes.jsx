import { useState } from 'react';
import { api } from '../lib/api.js';

// Liste des communautés (réservée aux comptes connectés) : on rejoint (publique : un clic, privée : avec son code) ou on quitte
export function ListeCommunautes({ communautes, agir, filtre, onFiltre }) {
  const action = (corps) => agir(api('/communautes.php', corps));
  return (
    <ul className="communautes">
      {communautes.map((c) => (
        <li key={c.id} className={filtre === c.id ? 'actif' : ''}>
          <div>
            <strong>{c.nom}</strong> <span className="etat">{c.prive ? 'Privée' : 'Publique'}</span>
            <p className="muted">{[c.secteur, c.description].filter(Boolean).join(' · ')}</p>
            <p className="petit">
              {c.membres} membre{c.membres > 1 ? 's' : ''} · {c.sorties} trajet{c.sorties > 1 ? 's' : ''} à venir
              {c.code && <> · code d’invitation <b className="code">{c.code}</b></>}
            </p>
          </div>
          <div className="communaute-actions">
            <button className="btn btn-secondaire" aria-pressed={filtre === c.id} onClick={() => onFiltre(filtre === c.id ? null : c.id)}>
              {filtre === c.id ? 'Tous les trajets' : 'Ses trajets'}
            </button>
            {c.membre ? (
              <button className="btn btn-secondaire" onClick={() => action({ action: 'quitter', id: c.id })}>Quitter</button>
            ) : (
              <button className="btn" onClick={() => action({ action: 'rejoindre', id: c.id })}>Rejoindre</button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// Créer sa communauté (publique ou privée, avec un code à partager) ou en rejoindre une privée avec son code
export function FormulairesCommunaute({ agir }) {
  const [prive, setPrive] = useState(false);

  const creer = (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const formulaire = e.currentTarget;
    agir(api('/communautes.php', { action: 'creer', nom: f.get('nom'), secteur: f.get('secteur') || '', description: f.get('description') || '', prive }))
      .then((ok) => { if (ok) { formulaire.reset(); setPrive(false); } });
  };
  const avecCode = (e) => {
    e.preventDefault();
    const formulaire = e.currentTarget;
    agir(api('/communautes.php', { action: 'rejoindre', code: new FormData(formulaire).get('code') })).then((ok) => ok && formulaire.reset());
  };

  return (
    <div className="deux-formulaires">
      <form className="formulaire" onSubmit={creer}>
        <h3>Créer ta communauté</h3>
        <label>Nom<input name="nom" required minLength={3} maxLength={60} placeholder="Nom de la communauté" /></label>
        <label>Secteur<input name="secteur" maxLength={60} placeholder="Ville, presqu’île…" /></label>
        <label className="large">En deux mots<input name="description" maxLength={200} placeholder="Quelques mots" /></label>
        <label className="case"><input type="checkbox" checked={prive} onChange={(e) => setPrive(e.target.checked)} /> Privée : on y entre avec un code d’invitation</label>
        <button className="btn">Créer</button>
      </form>
      <form className="formulaire" onSubmit={avecCode}>
        <h3>Tu as un code d’invitation ?</h3>
        <label>Code<input name="code" required maxLength={6} placeholder="6 caractères" autoCapitalize="characters" /></label>
        <button className="btn btn-secondaire">Rejoindre le groupe privé</button>
      </form>
    </div>
  );
}
