import { HAUTEUR, LARGEUR } from '../config/constantes.js';
import { COMBO, FROLEMENT } from '../config/gameplay.js';
import { PHASES } from '../etat/jeu.js';
import { ajouterTexteFlottant, creerEtincelles } from './particules.js';

/**
 * Points, combos et frôlements.
 *
 * - Chaque voiture évitée rapporte 1 point × le multiplicateur de combo
 *   (doublé pendant le nitro).
 * - Toutes les `COMBO.voituresParNiveau` voitures évitées d'affilée, le
 *   multiplicateur monte (jusqu'à `COMBO.multiplicateurMax`).
 * - Un changement de voie « inutile » (aucune voiture n'arrive dans la voie
 *   quittée) interrompt la série.
 * - Un frôlement (dépasser de très près) rapporte des points en plus.
 */

/**
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 * @param {number} points
 * @param {number} x Position du texte « +n ».
 * @param {number} y
 */
export function ajouterPoints(jeu, points, x, y) {
  jeu.score += points;
  ajouterTexteFlottant(jeu, `+${points}`, x, y, '#ffffff', 20);
}

/**
 * Multiplicateur de combo courant.
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 * @returns {number}
 */
export function multiplicateur(jeu) {
  return Math.min(COMBO.multiplicateurMax, 1 + Math.floor(jeu.serie / COMBO.voituresParNiveau));
}

/**
 * Allonge la série d'une voiture ; annonce un éventuel nouveau palier.
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 */
export function augmenterSerie(jeu) {
  const avant = multiplicateur(jeu);
  jeu.serie++;
  const apres = multiplicateur(jeu);
  if (apres > avant) {
    jeu.animationCombo = 1;
    jeu.multiplicateurMax = Math.max(jeu.multiplicateurMax, apres);
    ajouterTexteFlottant(jeu, `COMBO ×${apres}`, LARGEUR / 2, HAUTEUR * 0.35, '#ffd23f', 34);
    jeu.evenements.emettre('combo', { niveau: apres });
  }
}

/**
 * Un changement de voie est « inutile » si aucune voiture n'arrive dans la
 * voie quittée : il interrompt alors la série.
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 */
export function verifierChangementUtile(jeu) {
  if (jeu.phase !== PHASES.JEU || jeu.serie === 0) return;
  const { joueur } = jeu;
  for (const o of jeu.obstacles) {
    const arrive = o.y + o.hauteur > joueur.y - COMBO.zoneDanger && o.y < joueur.y + joueur.hauteur;
    if (!o.compte && o.voie === joueur.voie && arrive) return; // utile
  }
  if (multiplicateur(jeu) > 1) {
    ajouterTexteFlottant(jeu, 'Combo perdu', joueur.x, joueur.y - 30, '#ff7a7a', 18);
    jeu.evenements.emettre('comboPerdu');
  }
  jeu.serie = 0;
}

/**
 * Écart latéral entre les carrosseries tant que les deux voitures sont côte à
 * côte. On garde le minimum : s'il est très petit quand la voiture est
 * dépassée, c'est un frôlement.
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 */
export function mesurerEcartsLateraux(jeu) {
  if (jeu.phase !== PHASES.JEU) return;
  const { joueur } = jeu;
  for (const o of jeu.obstacles) {
    const coteACote = o.y < joueur.y + joueur.hauteur && o.y + o.hauteur > joueur.y;
    if (!o.compte && coteACote) {
      const ecart = Math.abs(o.x - joueur.x) - joueur.largeur;
      o.ecartMin = Math.min(o.ecartMin, ecart);
    }
  }
}

/**
 * Frôlement : points bonus, jauge de nitro, ralenti, étincelles.
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 * @param {object} voiture Voiture frôlée.
 */
export function declencherFrolement(jeu, voiture) {
  const { joueur, nitro } = jeu;
  jeu.nbFrolements++;
  jeu.serie++; // un frôlement compte double dans la série
  nitro.jauge = Math.min(1, nitro.jauge + FROLEMENT.gainJauge);
  jeu.ralentiRestant = FROLEMENT.dureeRalenti;
  jeu.tremblement = Math.max(jeu.tremblement, 3);
  ajouterTexteFlottant(jeu, 'FRÔLÉ !', (joueur.x + voiture.x) / 2, joueur.y - 40, '#5ee7ff', 30);
  creerEtincelles(jeu, (joueur.x + voiture.x) / 2, joueur.y + joueur.hauteur / 2, 10);
  jeu.evenements.emettre('frolement', { voiture });
  jeu.evenements.emettre('vibration', { motif: 25 });
}

/**
 * Une voiture est évitée quand elle est entièrement passée sous la voiture du
 * joueur : un seul passage est compté par voiture.
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 */
export function verifierObstaclesEvites(jeu) {
  const { joueur, nitro } = jeu;
  for (const o of jeu.obstacles) {
    if (!o.compte && !o.accidente && o.y > joueur.y + joueur.hauteur) {
      o.compte = true;
      jeu.voituresEvitees++;
      augmenterSerie(jeu);
      // Points = 1 × multiplicateur de combo, doublés pendant le nitro
      const facteurNitro = nitro.actif ? 2 : 1;
      let points = multiplicateur(jeu) * facteurNitro;
      if (o.ecartMin < FROLEMENT.seuil) {
        points += FROLEMENT.points * facteurNitro;
        declencherFrolement(jeu, o);
      } else {
        jeu.evenements.emettre('depassement', { voiture: o });
      }
      ajouterPoints(jeu, points, joueur.x, joueur.y - 10);
    }
  }
}
