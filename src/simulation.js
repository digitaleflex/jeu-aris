import { PAS_PHYSIQUE } from './config/constantes.js';
import { FROLEMENT } from './config/gameplay.js';
import { PHASES } from './etat/jeu.js';
import { mettreAJourCompteARebours } from './etat/phases.js';
import { mettreAJourMeteo } from './meteo/meteo.js';
import { mettreAJourDirection, purgerTraces } from './physique/direction.js';
import { mettreAJourMoteur } from './physique/moteur.js';
import { mettreAJourAccident } from './systemes/accident.js';
import { mettreAJourNitro } from './systemes/nitro.js';
import { mettreAJourParticules, mettreAJourTextesFlottants } from './systemes/particules.js';
import { deplacerObstacles } from './systemes/trafic.js';

/**
 * Un pas de simulation de durée fixe `dt` (PAS_PHYSIQUE).
 *
 * L'ordre des étapes est important :
 *   1. physique du joueur (moteur, direction) ou de l'accident ;
 *   2. défilement de la route et déplacement du trafic ;
 *   3. systèmes communs (nitro, météo, particules, textes) ;
 *   4. règles propres à la phase : compte à rebours, ou règles du mode.
 *
 * Cette fonction ne touche ni au DOM, ni au son : elle peut tourner hors
 * navigateur (tests).
 *
 * @param {import('./etat/jeu.js').EtatJeu} jeu
 * @param {number} dt
 */
export function mettreAJour(jeu, dt) {
  if (jeu.phase === PHASES.COMPTE || jeu.phase === PHASES.JEU) {
    mettreAJourMoteur(jeu, dt);
    mettreAJourDirection(jeu, dt);
  } else if (jeu.phase === PHASES.ACCIDENT) {
    mettreAJourAccident(jeu, dt);
  }

  jeu.defilement += jeu.joueur.vitesse * dt;
  deplacerObstacles(jeu, dt);
  mettreAJourNitro(jeu, dt);
  mettreAJourMeteo(jeu, dt);
  mettreAJourParticules(jeu, dt);
  mettreAJourTextesFlottants(jeu, dt);
  purgerTraces(jeu);
  jeu.animationCombo *= Math.exp(-5 * dt);
  jeu.tremblement *= Math.exp(-6 * dt);

  if (jeu.phase === PHASES.COMPTE) {
    mettreAJourCompteARebours(jeu, dt);
  } else if (jeu.phase === PHASES.JEU) {
    jeu.mode.mettreAJourPartie(jeu, dt);
  }
}

/**
 * Fait avancer la simulation du temps réel écoulé, par pas fixes.
 *
 * - le temps est limité à 0,1 s (onglet resté en arrière-plan) ;
 * - pendant un ralenti (frôlement, accident), le temps du jeu s'écoule moins vite ;
 * - la physique tourne par pas de PAS_PHYSIQUE : comportement identique à
 *   60, 120 ou 144 Hz.
 *
 * @param {import('./etat/jeu.js').EtatJeu} jeu
 * @param {number} dureeReelle Temps réel écoulé depuis l'image précédente (s).
 */
export function avancerSimulation(jeu, dureeReelle) {
  let dt = Math.min(dureeReelle, 0.1);

  if (jeu.ralentiRestant > 0) {
    jeu.ralentiRestant -= dt;
    dt *= FROLEMENT.echelleRalenti;
  }

  jeu.reservoirTemps += dt;
  while (jeu.reservoirTemps >= PAS_PHYSIQUE) {
    mettreAJour(jeu, PAS_PHYSIQUE);
    jeu.reservoirTemps -= PAS_PHYSIQUE;
  }
}
