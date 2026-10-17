// Pied de page commun (maquette Figma « Pied de page »)
export default function Footer() {
  return (
    <footer className="pied">
      <div className="credits">
        <p>© 2026 Riklan · projet né à l’Ocean Hackathon de Brest</p>
        <p className="mini">Carte © SHOM · Vagues : MARC (Ifremer) · Bouées : CANDHIS (Cerema)</p>
      </div>
      <nav aria-label="Pied de page">
        <a href="#/ocean">Océan &amp; littoral</a>
        <a href="#/equipe">Équipe &amp; RGPD</a>
        <a href="#/equipe">Contact</a>
      </nav>
    </footer>
  );
}
