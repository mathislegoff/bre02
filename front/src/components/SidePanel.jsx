import { useEffect, useRef } from 'react';
import { CONFIG } from '../config.js';
import { ecart } from '../lib/comparaison.js';

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

// Écart de chaque modèle à la mesure de la bouée, sur 2013
function Ecarts({ data }) {
  const mesure = data?.series.mesure?.hs;
  const modeles = ['marc', 'ia'].filter((k) => CONFIG.series[k].visible);
  if (!modeles.length) return null;

  return (
    <section>
      <h2>Écart au réel · 2013</h2>
      <table className="ecarts">
        <thead>
          <tr>
            <th />
            <th>Erreur moyenne</th>
            <th>Biais</th>
          </tr>
        </thead>
        <tbody>
          {modeles.map((k) => {
            const e = ecart(mesure, data?.series[k]?.hs);
            return (
              <tr key={k}>
                <th>
                  <i className="sq" style={{ background: CONFIG.series[k].color }} />
                  {CONFIG.series[k].label}
                </th>
                <td>{e ? `${e.rmse.toFixed(2)} m` : '—'}</td>
                <td>{e ? `${e.biais > 0 ? '+' : ''}${e.biais.toFixed(2)} m` : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="note">
        {mesure
          ? 'Erreur quadratique moyenne (RMSE) de la hauteur des vagues, comparée à la bouée.'
          : 'En attente des mesures CANDHIS de la bouée pour calculer les écarts.'}
      </p>
    </section>
  );
}

export default function SidePanel({ plage, onClose, comparaison }) {
  return (
    <aside className="side">
      {plage && <Plage plage={plage} onClose={onClose} />}

      <section>
        <h2>Puis-je sortir ?</h2>
      </section>
      <Ecarts data={comparaison} />
    </aside>
  );
}
