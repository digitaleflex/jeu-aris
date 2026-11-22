import { PX_PAR_METRE } from '../config/constantes.js';
import { LONGUEUR_CYCLE_M } from '../config/gameplay.js';

/**
 * Cycle jour → coucher de soleil → nuit → aube, selon la distance parcourue.
 *
 *   0 %          25 %        40 %                75 %       90 %      100 %
 *   ├── jour ─────┼─ coucher ─┼──────── nuit ──────┼─ aube ──┼─ jour ──┤
 *
 * @typedef {object} Ambiance
 * @property {number} obscurite  0 = plein jour, 1 = nuit noire.
 * @property {number[]|null} teinte  [r, v, b, alpha] du ciel, ou null.
 */

/** Courbe douce (0 → 0, 1 → 1, pente nulle aux extrémités). */
function lisser(k) {
  return k * k * (3 - 2 * k);
}

/**
 * @param {number} defilement Distance parcourue (px).
 * @returns {Ambiance}
 */
export function ambiance(defilement) {
  const position = (defilement / PX_PAR_METRE / LONGUEUR_CYCLE_M) % 1;
  if (position < 0.25) return { obscurite: 0, teinte: null };
  if (position < 0.4) {
    const k = (position - 0.25) / 0.15; // coucher de soleil
    return { obscurite: lisser(k), teinte: [255, 110, 30, 0.28 * Math.sin(Math.PI * k)] };
  }
  if (position < 0.75) return { obscurite: 1, teinte: null };
  if (position < 0.9) {
    const k = (position - 0.75) / 0.15; // aube
    return { obscurite: 1 - lisser(k), teinte: [255, 120, 170, 0.22 * Math.sin(Math.PI * k)] };
  }
  return { obscurite: 0, teinte: null };
}
