import { DUREE_ACCIDENT_MAX } from '../config/constantes.js';
import { RALENTI_ACCIDENT } from '../config/gameplay.js';
import { afficherMessage, PHASES } from '../etat/jeu.js';
import { terminerPartie } from '../etat/phases.js';
import { rectangle, seChevauchent } from '../physique/collisions.js';
import { lisserGlisse, laisserTraces } from '../physique/direction.js';
import { ralentirParFrottement } from '../physique/frottement.js';
import { kmhVersPx, limiter } from '../utilitaires/maths.js';
import { creerEtincelles, creerFumee } from './particules.js';

/**
 * Collisions et accident : choc entre le joueur et une voiture du trafic.
 */

/**
 * Cherche une voiture du trafic qui touche celle du joueur.
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 * @returns {object|null}
 */
export function detecterCollision(jeu) {
  const rectJoueur = rectangle(jeu.joueur);
  for (const o of jeu.obstacles) {
    if (seChevauchent(rectJoueur, rectangle(o))) return o;
  }
  return null;
}

/**
 * Choc : conservation de la quantité de mouvement (masses égales) avec un
 * coefficient de restitution e (choc partiellement élastique). Un choc
 * décentré fait tourner les deux voitures (moment de la force).
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 * @param {object} obstacle Voiture percutée.
 */
export function declencherAccident(jeu, obstacle) {
  const { joueur, alea } = jeu;
  const e = 0.3;
  const v1 = joueur.vitesse;
  const v2 = obstacle.vitesse;
  const vitesseImpact = v1 - v2;

  joueur.vitesse = (v1 + v2 - e * vitesseImpact) / 2;
  obstacle.vitesse = (v1 + v2 + e * vitesseImpact) / 2;

  const decalage = (joueur.x - obstacle.x) / joueur.largeur; // entre -1 et 1
  const sens = decalage === 0 ? (alea() < 0.5 ? -1 : 1) : Math.sign(decalage);
  const force = vitesseImpact / 200;
  joueur.rotation = sens * (1.5 + Math.abs(decalage) * 3) * force;
  obstacle.rotation = -joueur.rotation * 0.8;
  joueur.vx = joueur.vx * 0.5 + sens * 60 * force;
  obstacle.vx = -sens * 50 * force;
  obstacle.accidente = true;

  jeu.tremblement = 10;
  jeu.nitro.actif = false;
  jeu.ralentiRestant = RALENTI_ACCIDENT;
  creerEtincelles(jeu, joueur.x - decalage * 10, obstacle.y + obstacle.hauteur - 4, 40);

  jeu.phase = PHASES.ACCIDENT;
  jeu.dureeAccident = 0;
  jeu.message.perdu = true;
  afficherMessage(jeu, 'Partie terminée !');

  jeu.evenements.emettre('vibration', { motif: [60, 40, 120] });
  jeu.evenements.emettre('accident', { intensite: vitesseImpact / 500 });
}

/**
 * Pendant l'accident, toute la voiture glisse jusqu'à l'arrêt (frottement
 * μ·g), rebondit sur les bords de la route, puis la partie se termine.
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 * @param {number} dt
 */
export function mettreAJourAccident(jeu, dt) {
  const { joueur, meteo, route } = jeu;
  jeu.dureeAccident += dt;

  // Toute la voiture glisse : le crissement suit la vitesse de glissement
  const vitesseGlissement = Math.hypot(joueur.vitesse, joueur.vx) + Math.abs(joueur.rotation) * 40;
  lisserGlisse(joueur, limiter(vitesseGlissement / kmhVersPx(45), 0, 1), dt);
  if (joueur.vitesse > 1 || Math.abs(joueur.rotation) > 0.2) laisserTraces(jeu);
  joueur.vitesse = ralentirParFrottement(meteo, joueur.vitesse, dt);
  joueur.vx = ralentirParFrottement(meteo, joueur.vx, dt);
  joueur.x += joueur.vx * dt;
  joueur.angle += joueur.rotation * dt;
  joueur.rotation *= Math.exp(-2.5 * dt);

  // Rebond sur les bords de la route
  const minX = route.gauche + joueur.largeur / 2;
  const maxX = route.gauche + route.largeur - joueur.largeur / 2;
  if (joueur.x < minX || joueur.x > maxX) {
    joueur.x = limiter(joueur.x, minX, maxX);
    joueur.vx = -joueur.vx * 0.3;
  }

  if (Math.random() < 0.5) creerFumee(jeu, joueur.x, joueur.y + joueur.hauteur * 0.3);

  const arrete = joueur.vitesse < 5 && Math.abs(joueur.rotation) < 0.3;
  if ((arrete && jeu.dureeAccident > 1.2) || jeu.dureeAccident > DUREE_ACCIDENT_MAX) {
    terminerPartie(jeu);
  }
}
