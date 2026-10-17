// Vérification : node src/lib/alerte.test.js
import assert from 'node:assert/strict';
import { CONDITIONS, HORIZON, prochaineHeure } from './alerte.js';

const ok = Object.fromEntries(CONDITIONS.map((c) => [c.cle, c.ok]));
const houle = (x) => ok.houle(x, [1, 2.5]);
const vent = (x) => ok.vent(x, 20);

const hs = [3, null, 1.2, 2.5, 0.4];
assert.equal(prochaineHeure(hs, 0, houle), 2); // valeur manquante sautée
assert.equal(prochaineHeure(hs, 3, houle), 3); // borne comprise, et déjà atteint : maintenant
assert.equal(prochaineHeure(hs, 4, houle), null); // plus rien jusqu'à la fin de la série
assert.equal(prochaineHeure([20, 25, 19.5], 0, vent), 2); // « moins de 20 nds » : 20 ne suffit pas

const loin = Array(HORIZON + 10).fill(0);
loin[HORIZON] = 2;
assert.equal(prochaineHeure(loin, 0, houle), null); // juste après l'horizon
assert.equal(prochaineHeure(loin, 1, houle), HORIZON); // dernière heure de l'horizon
console.log('OK');
