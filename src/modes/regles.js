import { terminerPartie } from '../etat/phases.js';
import { declencherAccident, detecterCollision } from '../systemes/accident.js';
import { mesurerEcartsLateraux, verifierObstaclesEvites } from '../systemes/score.js';
import { creerVaguesDeTrafic } from '../systemes/trafic.js';

/**
 * Règles standard d'une partie, appelées à chaque pas pendant la phase « jeu ».
 * Le mode actif les configure par ses données (`trafic`, `collisionFatale`) et
 * les complète par ses crochets (`mettreAJour`, `verifierFin`).
 *
 * Ordre des étapes :
 *   1. mesure des écarts latéraux (pour détecter les frôlements) ;
 *   2. nouvelles voitures, si le mode a du trafic ;
 *   3. voitures évitées : points, combos, frôlements ;
 *   4. crochet `mettreAJour` du mode ;
 *   5. crochet `verifierFin` : un résultat termine la partie ;
 *   6. collision, si elle est fatale dans ce mode.
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 * @param {number} dt
 */
export function reglesDePartie(jeu, dt) {
  const { mode } = jeu;

  mesurerEcartsLateraux(jeu);
  if (mode.trafic) creerVaguesDeTrafic(jeu, dt);
  verifierObstaclesEvites(jeu);

  mode.mettreAJour?.(jeu, dt);

  const fin = mode.verifierFin?.(jeu) ?? null;
  if (fin) {
    jeu.finMode = fin;
    terminerPartie(jeu);
    return;
  }

  if (mode.collisionFatale) {
    const voitureTouchee = detecterCollision(jeu);
    if (voitureTouchee) declencherAccident(jeu, voitureTouchee);
  }
}
