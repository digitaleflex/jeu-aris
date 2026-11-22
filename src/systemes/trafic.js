import { HAUTEUR } from '../config/constantes.js';
import { ADHERENCE_SECHE } from '../config/meteo.js';
import { MODELES_TRAFIC } from '../config/vehicules.js';
import { GABARIT_VOITURE } from '../config/constantes.js';
import { adherence } from '../meteo/conditions.js';
import { ralentirParFrottement } from '../physique/frottement.js';
import { kmhVersPx } from '../utilitaires/maths.js';
import { creerGerbe } from './particules.js';

/**
 * Trafic : voitures qui roulent toutes à la même vitesse, dans le même sens.
 * À l'écran, elles descendent à la vitesse RELATIVE  v_joueur − v_trafic.
 */

/**
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 * @returns {number} Vitesse relative du trafic par rapport au joueur (px/s).
 */
export function vitesseRelativeTrafic(jeu) {
  return jeu.joueur.vitesse - kmhVersPx(jeu.reglages.vitesseTraficKmh);
}

/**
 * Crée une nouvelle vague de voitures quand la distance parcourue depuis la
 * précédente est suffisante.
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 * @param {number} dt
 */
export function creerVaguesDeTrafic(jeu, dt) {
  const vRel = vitesseRelativeTrafic(jeu);
  if (vRel <= 0) return;
  jeu.distanceDepuisVague += vRel * dt;

  // Écart entre deux vagues : au moins ≈ 0,85 s pour pouvoir changer de voie.
  // Sur route glissante, on laisse plus de temps.
  const tempsReaction = 0.85 + 0.7 * (1 - adherence(jeu.meteo) / ADHERENCE_SECHE);
  // La densité de la difficulté resserre (ou desserre) les vagues.
  const ecart =
    (GABARIT_VOITURE.hauteur + Math.max(160, vRel * tempsReaction)) / jeu.reglages.densiteTrafic;
  if (jeu.distanceDepuisVague >= ecart) {
    jeu.distanceDepuisVague = 0;
    creerVague(jeu);
  }
}

/**
 * Une ou deux voitures, réparties de façon qu'il reste toujours au moins
 * une voie libre, quel que soit le nombre de voies de la route.
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 */
export function creerVague(jeu) {
  const { alea, route } = jeu;
  const probaDeux = Math.min(0.55, 0.2 + jeu.voituresEvitees * 0.015);
  const nombre = alea() < probaDeux ? 2 : 1;
  const voieLibre = Math.floor(alea() * route.nbVoies);

  const voies = [];
  for (let v = 0; v < route.nbVoies; v++) {
    if (v !== voieLibre) voies.push(v);
  }
  const nbVoitures = Math.min(nombre, route.nbVoies - 1);
  while (voies.length > nbVoitures) {
    voies.splice(Math.floor(alea() * voies.length), 1);
  }

  for (const voie of voies) {
    creerObstacle(jeu, voie);
  }
}

/**
 * Place une voiture juste au-dessus du Canvas, sur la voie demandée.
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 * @param {number} voie
 * @returns {object} La voiture créée.
 */
export function creerObstacle(jeu, voie) {
  const { alea } = jeu;
  const obstacle = {
    voie,
    x: jeu.route.centreVoie(voie),
    y: -GABARIT_VOITURE.hauteur - 10 - alea() * 40, // juste au-dessus du Canvas
    largeur: GABARIT_VOITURE.largeur,
    hauteur: GABARIT_VOITURE.hauteur,
    vitesse: kmhVersPx(jeu.reglages.vitesseTraficKmh),
    vx: 0,
    angle: 0,
    rotation: 0,
    accidente: false,
    compte: false,
    ecartMin: Infinity, // plus petit écart latéral avec le joueur (frôlement)
    phase: alea() * 6.28, // pour le léger louvoiement sur le verglas
    ...MODELES_TRAFIC[Math.floor(alea() * MODELES_TRAFIC.length)],
  };
  jeu.obstacles.push(obstacle);
  return obstacle;
}

/**
 * Fait descendre les voitures (vitesse relative), fait glisser celles qui ont
 * eu un accident et supprime celles sorties de l'écran.
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 * @param {number} dt
 */
export function deplacerObstacles(jeu, dt) {
  const { joueur, meteo } = jeu;
  for (const o of jeu.obstacles) {
    o.y += (joueur.vitesse - o.vitesse) * dt;
    if (o.accidente) {
      // Glissade avec frottement après le choc
      o.vitesse = ralentirParFrottement(meteo, o.vitesse, dt);
      o.vx = ralentirParFrottement(meteo, o.vx, dt);
      o.x += o.vx * dt;
      o.angle += o.rotation * dt;
      o.rotation *= Math.exp(-2.5 * dt);
    } else {
      // Sur le verglas, les autres conducteurs louvoient un peu
      o.angle = meteo.intensiteVerglas * 0.07 * Math.sin(jeu.defilement * 0.004 + o.phase);
    }
    // Gerbe d'eau derrière les voitures sous la pluie
    if (meteo.intensitePluie > 0.3 && Math.random() < 0.25 * meteo.intensitePluie) {
      creerGerbe(jeu, o.x, o.y + o.hauteur, joueur.vitesse - o.vitesse);
    }
  }
  // On supprime les voitures sorties de l'écran (en bas, ou en haut si le joueur est arrêté)
  jeu.obstacles = jeu.obstacles.filter((o) => o.y < HAUTEUR + 20 && o.y > -HAUTEUR);
}
