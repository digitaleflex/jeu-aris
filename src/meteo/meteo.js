import { PX_PAR_METRE } from '../config/constantes.js';
import { DISTANCE_ENTRE_METEOS_M, DUREE_ANNONCE_METEO, METEOS } from '../config/meteo.js';
import { afficherMessage, PHASES } from '../etat/jeu.js';
import { limiter } from '../utilitaires/maths.js';
import { creerDangers, deplacerDangers, verifierDangersSousRoues } from './dangers.js';
import { creerEffetsMeteo } from './effets.js';

/**
 * Évolution de la météo : alternance sec → pluie ou verglas → sec, avec des
 * transitions douces (≈ 2 s). Les conséquences physiques sont lues dans
 * conditions.js.
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 * @param {number} dt
 */
export function mettreAJourMeteo(jeu, dt) {
  const { meteo, joueur } = jeu;

  // Transition douce vers le temps visé
  const viserPluie = meteo.actuelle === 'pluie' ? 1 : 0;
  const viserVerglas = meteo.actuelle === 'verglas' ? 1 : 0;
  const vitesseTransition = 0.5 * dt;
  meteo.intensitePluie += limiter(
    viserPluie - meteo.intensitePluie,
    -vitesseTransition,
    vitesseTransition,
  );
  meteo.intensiteVerglas += limiter(
    viserVerglas - meteo.intensiteVerglas,
    -vitesseTransition,
    vitesseTransition,
  );
  meteo.annonce = Math.max(0, meteo.annonce - dt);

  if (jeu.phase === PHASES.JEU) {
    meteo.distanceRestante -= (joueur.vitesse * dt) / PX_PAR_METRE;
    if (meteo.distanceRestante <= 0) changerMeteo(jeu);
    creerDangers(jeu, dt);
  }
  deplacerDangers(jeu, dt);
  if (jeu.phase === PHASES.JEU || jeu.phase === PHASES.COMPTE) verifierDangersSousRoues(jeu);
  creerEffetsMeteo(jeu);
}

/**
 * Après le sec : pluie ou verglas, selon la probabilité de verglas de la
 * difficulté (et seulement si le mode a de la météo).
 * Après la pluie ou le verglas : retour au sec.
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 */
export function changerMeteo(jeu) {
  const { meteo, alea } = jeu;
  let suivante = 'sec';
  if (meteo.actuelle === 'sec' && jeu.mode.meteo) {
    suivante = alea() < jeu.reglages.probabiliteVerglas ? 'verglas' : 'pluie';
  }
  meteo.actuelle = suivante;
  meteo.distanceRestante = DISTANCE_ENTRE_METEOS_M * (0.8 + alea() * 0.4);
  meteo.annonce = DUREE_ANNONCE_METEO;
  const { nom, conseil } = METEOS[suivante];
  afficherMessage(jeu, `${nom.charAt(0)}${nom.slice(1).toLowerCase()} — ${conseil}`);
  jeu.evenements.emettre('meteo', { type: suivante });
}
