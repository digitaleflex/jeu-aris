import { G, PX_PAR_METRE } from '../config/constantes.js';
import { adherence } from '../meteo/conditions.js';

/**
 * Frottement de glissement : décélération constante μ·g, jusqu'à l'arrêt.
 * Utilisé pour les voitures qui glissent après un choc.
 *
 * @param {import('../etat/jeu.js').Meteo} meteo
 * @param {number} vitesse Vitesse (px/s), positive ou négative.
 * @param {number} dt      Durée du pas (s).
 * @returns {number} Nouvelle vitesse (px/s).
 */
export function ralentirParFrottement(meteo, vitesse, dt) {
  const deceleration = adherence(meteo) * G * PX_PAR_METRE * dt;
  if (Math.abs(vitesse) <= deceleration) return 0;
  return vitesse - Math.sign(vitesse) * deceleration;
}
