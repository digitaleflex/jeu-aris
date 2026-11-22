import { G } from '../config/constantes.js';
import { METEOS, ADHERENCE_FLAQUE, ADHERENCE_PLAQUE, ADHERENCE_MINIMALE } from '../config/meteo.js';
import { PX_PAR_METRE } from '../config/constantes.js';

/**
 * Conditions météo vues par la physique, le son et le rendu.
 * Fonctions pures : elles lisent l'état de la météo sans le modifier.
 */

/**
 * Valeur d'une propriété de METEOS, mélangée selon l'intensité de la pluie
 * et du verglas (les transitions entre deux temps sont progressives).
 *
 * @param {import('../etat/jeu.js').Meteo} meteo
 * @param {'adherence'|'vitesseMax'|'crissement'|'traces'} propriete
 * @returns {number}
 */
export function facteurMeteo(meteo, propriete) {
  const sec = METEOS.sec[propriete];
  return (
    sec +
    (METEOS.pluie[propriete] - sec) * meteo.intensitePluie +
    (METEOS.verglas[propriete] - sec) * meteo.intensiteVerglas
  );
}

/**
 * Coefficient d'adhérence μ réellement disponible sous les roues : celui de la
 * météo, limité par une flaque (aquaplaning) ou une plaque de verglas.
 *
 * @param {import('../etat/jeu.js').Meteo} meteo
 * @returns {number}
 */
export function adherence(meteo) {
  let mu = facteurMeteo(meteo, 'adherence');
  if (meteo.surDanger === 'flaque') mu = Math.min(mu, ADHERENCE_FLAQUE);
  if (meteo.surDanger === 'verglas') mu = Math.min(mu, ADHERENCE_PLAQUE);
  return Math.max(mu, ADHERENCE_MINIMALE);
}

/**
 * Force maximale qu'un pneu peut transmettre à la route : μ·m·g (N).
 *
 * @param {import('../etat/jeu.js').Meteo} meteo
 * @param {import('../config/vehicules.js').Caracteristiques} caracteristiques
 * @returns {number}
 */
export function forceAdherence(meteo, caracteristiques) {
  return adherence(meteo) * caracteristiques.masse * G;
}

/**
 * Petite force latérale irrégulière sur la glace (somme de deux sinus de
 * périodes différentes) : de petites irrégularités font dériver la voiture.
 *
 * @param {import('../etat/jeu.js').Meteo} meteo
 * @param {number} defilement Distance parcourue (px).
 * @returns {number} Accélération latérale (px/s²).
 */
export function deriveVerglas(meteo, defilement) {
  const t = defilement / PX_PAR_METRE;
  return meteo.intensiteVerglas * 160 * (Math.sin(t * 0.21) + 0.6 * Math.sin(t * 0.53 + 1.7));
}
