import { useEffect, useRef } from 'react';

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

export default function SidePanel({ plage, onClose }) {
  return (
    <aside className="side">
      {plage && <Plage plage={plage} onClose={onClose} />}
    </aside>
  );
}
