import { useEffect, useState } from 'react';
import { CONFIG } from '../config.js';
import { date, formatComplet } from '../lib/temps.js';

const { debut, heures } = CONFIG.fenetre;
const fin = debut + heures; // première heure hors de la frise

// Frise des prochaines 48 h : lecture, curseur et date affichée
export default function Timeline({ heure, setHeure }) {
  const [lecture, setLecture] = useState(false);
  const enLecture = lecture && heure < fin - 1; // s'arrête seule à la fin des 48 h

  // Lecture : 1 heure toutes les 120 ms (48 h ≈ 6 s)
  useEffect(() => {
    if (!enLecture) return;
    const id = setInterval(() => setHeure((h) => Math.min(h + 1, fin - 1)), 120);
    return () => clearInterval(id);
  }, [enLecture, setHeure]);

  const basculer = () => {
    if (!enLecture && heure >= fin - 1) setHeure(debut); // relance depuis le début
    setLecture(!enLecture);
  };

  const texte = formatComplet.format(date(heure));
  return (
    <div className="timeline">
      <button className="lecture" onClick={basculer} aria-label={enLecture ? 'Pause' : 'Lecture'}>
        {enLecture ? '❚❚' : '▶'}
      </button>
      <span className="timeline-fenetre">Prochaines {heures} h</span>
      <input
        type="range"
        min={debut}
        max={fin - 1}
        value={Math.min(Math.max(heure, debut), fin - 1)}
        onChange={(e) => { setLecture(false); setHeure(Number(e.target.value)); }}
        aria-label={`Heure affichée, sur les prochaines ${heures} heures`}
        aria-valuetext={texte}
      />
      <time dateTime={date(heure).toISOString()}>{texte} TU</time>
    </div>
  );
}
