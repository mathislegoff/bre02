import { useEffect, useState } from 'react';
import { CONFIG } from '../config.js';
import { date, formatComplet } from '../lib/temps.js';

const { heures } = CONFIG.periode;

export default function Timeline({ heure, setHeure }) {
  const [lecture, setLecture] = useState(false);
  const enLecture = lecture && heure < heures - 1; // s'arrête seule à la fin

  // Lecture : 1 heure toutes les 120 ms (une journée ≈ 3 s)
  useEffect(() => {
    if (!enLecture) return;
    const id = setInterval(() => setHeure((h) => Math.min(h + 1, heures - 1)), 120);
    return () => clearInterval(id);
  }, [enLecture, setHeure]);

  const basculer = () => {
    if (!enLecture && heure >= heures - 1) setHeure(0); // relance depuis le début
    setLecture(!enLecture);
  };

  const texte = formatComplet.format(date(heure));
  return (
    <div className="timeline">
      <button className="lecture" onClick={basculer} aria-label={enLecture ? 'Pause' : 'Lecture'}>
        {enLecture ? '❚❚' : '▶'}
      </button>
      <input
        type="range"
        min={0}
        max={heures - 1}
        value={heure}
        onChange={(e) => { setLecture(false); setHeure(Number(e.target.value)); }}
        aria-label="Heure affichée"
        aria-valuetext={texte}
      />
      <time dateTime={date(heure).toISOString()}>{texte} TU</time>
    </div>
  );
}
