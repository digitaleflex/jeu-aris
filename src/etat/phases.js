import { DUREE_COMPTE_A_REBOURS } from '../config/constantes.js';
import { PHASES, reinitialiserPartie } from './jeu.js';

/**
 * Affiche un message au joueur (le HUD le lit à chaque image).
 *
 * @param {import('./jeu.js').EtatJeu} jeu
 * @param {string} texte
 */
export function afficherMessage(jeu, texte) {
  jeu.message.texte = texte;
}

/**
 * Prépare une nouvelle partie : remise à zéro puis compte à rebours.
 * La boucle d'animation est gérée à part (voir boucle.js).
 *
 * @param {import('./jeu.js').EtatJeu} jeu
 */
export function preparerPartie(jeu) {
  reinitialiserPartie(jeu);
  jeu.phase = PHASES.COMPTE;
  jeu.compteARebours = DUREE_COMPTE_A_REBOURS;
  jeu.aDejaJoue = true;
  jeu.reservoirTemps = 0;
  jeu.evenements.emettre('compteARebours', { valeur: DUREE_COMPTE_A_REBOURS });
  afficherMessage(jeu, 'Préparez-vous…');
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
 * Termine la partie : enregistre le résultat (record) et prévient l'interface.
 *
 * @param {import('./jeu.js').EtatJeu} jeu
 */
export function terminerPartie(jeu) {
  jeu.phase = PHASES.FIN;
  const { nouveauRecord } = jeu.mode.enregistrerResultat(jeu);
  afficherMessage(
    jeu,
    nouveauRecord
      ? `Partie terminée — nouveau record : ${jeu.score} !`
      : `Partie terminée — score : ${jeu.score}. Appuyez sur Recommencer.`,
  );
  jeu.evenements.emettre('fin', { score: jeu.score, record: jeu.record, nouveauRecord });
}
