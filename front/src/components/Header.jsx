import { CONFIG } from '../config.js';

export default function Header() {
  return (
    <header className="header">
      <img className="logo" src={CONFIG.logo} alt="" />
      <h1>{CONFIG.name}</h1>
    </header>
  );
}
