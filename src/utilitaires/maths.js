import { PX_PAR_METRE } from '../config/constantes.js';

/**
 * Limite une valeur à l'intervalle [min, max].
 * @param {number} valeur
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function limiter(valeur, min, max) {
  return Math.max(min, Math.min(max, valeur));
}

/**
 * Convertit des km/h en pixels par seconde (échelle du jeu).
 * @param {number} kmh
 * @returns {number}
 */
export function kmhVersPx(kmh) {
  return (kmh / 3.6) * PX_PAR_METRE;
}

/**
 * Convertit des pixels par seconde en km/h.
 * @param {number} px
 * @returns {number}
 */
export function pxVersKmh(px) {
  return (px / PX_PAR_METRE) * 3.6;
}
