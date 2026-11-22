/**
 * Outils communs aux tests : état de jeu déterministe, avance du temps.
 */
import { PAS_PHYSIQUE } from '../src/config/constantes.js';
import { creerEtatJeu, PHASES } from '../src/etat/jeu.js';
import { preparerPartie } from '../src/etat/phases.js';
import { modeEsquive } from '../src/modes/esquive.js';
import { mettreAJour } from '../src/simulation.js';
import { creerAleaAvecGraine } from '../src/utilitaires/alea.js';

/**
 * État de jeu avec un hasard à graine : deux appels avec la même graine
 * produisent exactement la même partie.
 */
export function nouveauJeu(options = {}) {
  return creerEtatJeu({ mode: modeEsquive, alea: creerAleaAvecGraine(42), ...options });
}

/** Fait avancer la simulation d'un nombre de secondes de jeu (pas fixes). */
export function avancer(jeu, secondes) {
  const pas = Math.round(secondes / PAS_PHYSIQUE);
  for (let i = 0; i < pas; i++) mettreAJour(jeu, PAS_PHYSIQUE);
}

/** Lance une partie et passe le compte à rebours : la phase « jeu » commence. */
export function demarrerPartie(jeu) {
  preparerPartie(jeu);
  avancer(jeu, 3.1);
  if (jeu.phase !== PHASES.JEU) throw new Error(`phase inattendue : ${jeu.phase}`);
}

/** Enregistre les événements émis par le jeu : [{ nom, donnees }, …]. */
export function espionner(jeu, noms) {
  const recus = [];
  for (const nom of noms) {
    jeu.evenements.sur(nom, (donnees) => recus.push({ nom, donnees }));
  }
  return recus;
}

/**
 * Exécute `fonction` avec un Math.random à graine (les effets visuels
 * l'utilisent), puis restaure le vrai Math.random.
 */
export function avecHasardGraine(graine, fonction) {
  const original = Math.random;
  Math.random = creerAleaAvecGraine(graine);
  try {
    return fonction();
  } finally {
    Math.random = original;
  }
}
