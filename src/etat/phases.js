import { DUREE_COMPTE_A_REBOURS } from '../config/constantes.js';
import { afficherMessage, PHASES, reinitialiserPartie } from './jeu.js';
import { ecrireRecord, lireRecord } from './preferences.js';

/**
 * Prépare une nouvelle partie : remise à zéro puis compte à rebours.
 * Le joueur doit avoir un nom (voir navigation.js). La boucle d'animation est
 * gérée à part (voir boucle.js).
 *
 * @param {import('./jeu.js').EtatJeu} jeu
 */
export function preparerPartie(jeu) {
  reinitialiserPartie(jeu);
  jeu.phase = PHASES.COMPTE;
  jeu.compteARebours = DUREE_COMPTE_A_REBOURS;
  jeu.aDejaJoue = true;
  jeu.reservoirTemps = 0;
  afficherMessage(jeu, 'Préparez-vous…');
  jeu.evenements.emettre('navigation', { phase: jeu.phase });
  jeu.evenements.emettre('compteARebours', { valeur: DUREE_COMPTE_A_REBOURS });
}

/**
 * Fait avancer le compte à rebours ; passe en phase « jeu » à zéro.
 *
 * @param {import('./jeu.js').EtatJeu} jeu
 * @param {number} dt Durée du pas (s).
 */
export function mettreAJourCompteARebours(jeu, dt) {
  const avant = Math.ceil(jeu.compteARebours);
  jeu.compteARebours -= dt;
  const apres = Math.ceil(jeu.compteARebours);
  if (apres === avant) return;
  if (apres > 0) {
    jeu.evenements.emettre('compteARebours', { valeur: apres });
  } else {
    jeu.evenements.emettre('depart');
    jeu.phase = PHASES.JEU;
    afficherMessage(jeu, jeu.mode.messageDepart);
  }
}

/**
 * Termine la partie : arrondit le score, met à jour le record du joueur dans
 * ce mode AVANT l'affichage de l'écran de fin, puis prévient l'interface.
 *
 * @param {import('./jeu.js').EtatJeu} jeu
 */
export function terminerPartie(jeu) {
  jeu.phase = PHASES.FIN;
  jeu.score = Math.round(jeu.score);

  const ancienRecord = lireRecord(jeu.mode.id, jeu.nomJoueur);
  const nouveauRecord = jeu.score > ancienRecord;
  jeu.ancienRecord = ancienRecord;
  if (nouveauRecord) {
    jeu.record = jeu.score;
    ecrireRecord(jeu.mode.id, jeu.nomJoueur, jeu.record);
    afficherMessage(jeu, `Partie terminée — nouveau record : ${jeu.score} !`);
  } else {
    jeu.record = ancienRecord;
    afficherMessage(jeu, `Partie terminée — score : ${jeu.score}.`);
  }

  jeu.evenements.emettre('fin', {
    score: jeu.score,
    record: jeu.record,
    ancienRecord,
    nouveauRecord,
  });
  jeu.evenements.emettre('navigation', { phase: jeu.phase });
}
