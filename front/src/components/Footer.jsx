// Pied de page commun (maquette Figma « Pied de page »)
export default function Footer() {
  return (
    <footer className="pied">
      <div className="credits">
        <p>© 2026 Riklañ · projet né à l’Ocean Hackathon de Brest</p>
        <p className="mini">Carte © SHOM · Houle : MARC (Ifremer) · Bouées : CANDHIS (Cerema)</p>
      </div>
      <nav aria-label="Pied de page">
        <a href="#/ocean">Environnement</a>
        <a href="#/communaute">Communauté &amp; RGPD</a>
        <a href="#/communaute">Contact</a>
      </nav>
    </footer>
  );
}
