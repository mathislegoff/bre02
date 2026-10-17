import { useState } from 'react';
import { CONFIG } from '../config.js';

// Avant / après : même carte sans IA (modèle physique) et avec notre IA, séparées par un curseur.
// Les images se déclarent dans CONFIG.avantApres ; sans image, des emplacements indiquent ce qui viendra.
export default function AvantApres() {
  const [pos, setPos] = useState(50);
  const { sans, avec } = CONFIG.avantApres;
  return (
    <div className="cadre-argile">
      <div className="avant-apres">
        <div className="aa-vue aa-avec">
          {avec ? <img src={avec} alt="Prévision avec l’IA" /> : <p>Visuel avec l’IA à venir</p>}
        </div>
        <div className="aa-vue aa-sans" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
          {sans ? <img src={sans} alt="Prévision sans IA" /> : <p>Visuel sans IA à venir</p>}
        </div>
        <span className="aa-etiquette gauche">Sans IA · modèle physique</span>
        <span className="aa-etiquette droite">Avec IA · notre modèle</span>
        <span className="aa-poignee" style={{ left: `${pos}%` }} aria-hidden="true" />
        <input
          className="aa-curseur"
          type="range"
          min={0}
          max={100}
          value={pos}
          onChange={(e) => setPos(Number(e.target.value))}
          aria-label="Comparer sans IA (à gauche) et avec IA (à droite)"
        />
      </div>
    </div>
  );
}
