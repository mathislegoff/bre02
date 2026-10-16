import { useEffect, useRef } from 'react';
import { CONFIG, couleur } from '../config.js';

function Plage({ plage, onClose }) {
  const { nom, commune, qualite } = plage.properties;
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

      <p className="qualite">
        <i className="sq" style={{ background: couleur(qualite) }} />
        Qualité de l’eau : <strong>{qualite}</strong>
      </p>
      <p className="note">
        Classement ARS, {CONFIG.qualitePeriode} (juin à septembre), pour ce site de baignade uniquement.
      </p>
    </section>
  );
}

export default function SidePanel({ plage, onClose }) {
  return (
    <aside className="side">
      {plage && <Plage plage={plage} onClose={onClose} />}

      <section>
        <h2>Puis-je sortir ?</h2>
      </section>
      <section>
        <h2>Impact</h2>
      </section>

      <section className="legend">
        <h2>Qualité de l’eau</h2>
        <ul>
          {Object.entries(CONFIG.qualite).map(([label, color]) => (
            <li key={label}>
              <i className="sq" style={{ background: color }} />
              {label}
            </li>
          ))}
        </ul>
        <p className="note">Classement ARS, {CONFIG.qualitePeriode}. Touchez une plage sur la carte.</p>
      </section>
    </aside>
  );
}
