import { PHASES } from '../etat/jeu.js';
import { verifierChangementUtile } from './score.js';

/**
 * Change de voie d'un cran. Sans effet hors partie ou au bord de la route.
 *
 * Clavier, boutons et gestes tactiles appellent TOUS cette fonction : il n'y
 * a qu'un seul système de déplacement.
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 * @param {-1|1} sens -1 vers la gauche, +1 vers la droite.
 */
export function changerDeVoie(jeu, sens) {
  if (jeu.phase !== PHASES.JEU && jeu.phase !== PHASES.COMPTE) return;
  const cible = jeu.joueur.voie + sens;
  if (cible < 0 || cible > jeu.route.nbVoies - 1) return;
  verifierChangementUtile(jeu);
  jeu.joueur.voie = cible;
  jeu.evenements.emettre('changementVoie', { sens });
}
