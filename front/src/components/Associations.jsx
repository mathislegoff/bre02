import { useState } from 'react';
import { ASSOCIATIONS } from '../associations.js';

// Logo d'une association : public/assos/<logo>, ou ses initiales si le fichier manque
function Logo({ asso }) {
  const [absent, setAbsent] = useState(false);
  return (
    <span className="asso-logo">
      {absent ? asso.sigle : <img src={`${import.meta.env.BASE_URL}assos/${asso.logo}`} alt={`Logo : ${asso.nom}`} onError={() => setAbsent(true)} />}
    </span>
  );
}

const Lien = ({ asso, children }) => (
  <a href={asso.url} target="_blank" rel="noopener noreferrer">
    {children}<span className="sr-only"> (nouvel onglet)</span>
  </a>
);

// Liste détaillée : logo, nom, ce qu'elle fait
export default function Associations() {
  return (
    <ul className="assos">
      {ASSOCIATIONS.map((a) => (
        <li key={a.id}>
          <Logo asso={a} />
          <Lien asso={a}>{a.nom}</Lien>
          <span>{a.texte}</span>
        </li>
      ))}
    </ul>
  );
}
