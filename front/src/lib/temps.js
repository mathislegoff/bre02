// Temps de la timeline : indice horaire depuis CONFIG.periode.debut (UTC)
import { CONFIG } from '../config.js';

const { debut } = CONFIG.periode;
export const date = (h) => new Date(debut + h * 3600e3);
export const heureDe = (ms) => Math.round((ms - debut) / 3600e3);
export const ANNEE = new Date(debut).getUTCFullYear();

const fr = (o) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', ...o });
export const formatJour = fr({ day: 'numeric', month: 'short' });
export const formatHeure = fr({ day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const formatComplet = fr({ weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
