import { HAUTEUR } from '../config/constantes.js';
import { creerGerbe, ajouterTexteFlottant } from '../systemes/particules.js';
import { rectangle, seChevauchent } from '../physique/collisions.js';

/**
 * Dangers de la chaussée : flaques (pluie) et plaques de verglas. Posés sur
 * une voie, ils défilent avec la route.
 *
 * @typedef {object} Danger
 * @property {'flaque'|'verglas'} type
 * @property {number} x         Centre (px).
 * @property {number} y         Bord haut (px).
 * @property {number} largeur
 * @property {number} hauteur
 * @property {boolean} touche   Les roues du joueur y sont déjà passées.
 */

/**
 * Dépose un danger de temps en temps, tant qu'il pleut ou qu'il gèle assez.
 *
 * Remarque : le seuil de distance est retiré à chaque pas de simulation ;
 * en pratique un danger apparaît dès que la distance dépasse ≈ 900 px.
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 * @param {number} dt
 */
export function creerDangers(jeu, dt) {
  const { meteo, alea, route, joueur } = jeu;
  const intensite = Math.max(meteo.intensitePluie, meteo.intensiteVerglas);
  if (intensite < 0.6) return;
  jeu.distanceDanger += joueur.vitesse * dt;
  if (jeu.distanceDanger < 900 + alea() * 600) return;
  jeu.distanceDanger = 0;
  const voie = Math.floor(alea() * route.nbVoies);
  const estPluie = meteo.intensitePluie > meteo.intensiteVerglas;
  jeu.dangers.push({
    type: estPluie ? 'flaque' : 'verglas',
    x: route.centreVoie(voie) + (alea() - 0.5) * 16,
    y: -120,
    largeur: route.largeurVoie * (0.8 + alea() * 0.25),
    hauteur: 55 + alea() * 35,
    touche: false,
  });
}

/**
 * Fait défiler les dangers avec la route et retire ceux sortis de l'écran.
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 * @param {number} dt
 */
export function deplacerDangers(jeu, dt) {
  for (const d of jeu.dangers) {
    d.y += jeu.joueur.vitesse * dt; // collés à la route
  }
  jeu.dangers = jeu.dangers.filter((d) => d.y < HAUTEUR + 20);
}

/**
 * Détermine si les roues du joueur sont sur un danger (cela limite alors
 * l'adhérence, voir conditions.js).
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 */
export function verifierDangersSousRoues(jeu) {
  const { meteo } = jeu;
  const roues = rectangle(jeu.joueur);
  meteo.surDanger = null;
  for (const d of jeu.dangers) {
    const zone = {
      gauche: d.x - d.largeur * 0.4,
      droite: d.x + d.largeur * 0.4,
      haut: d.y + d.hauteur * 0.15,
      bas: d.y + d.hauteur * 0.85,
    };
    if (seChevauchent(roues, zone)) {
      meteo.surDanger = d.type;
      if (!d.touche) entrerSurDanger(jeu, d);
    }
  }
}

/**
 * Première entrée sur un danger : la voiture est déviée (une roue freinée
 * d'un seul côté).
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 * @param {Danger} danger
 */
function entrerSurDanger(jeu, danger) {
  const { joueur, alea } = jeu;
  danger.touche = true;
  joueur.vx += (alea() < 0.5 ? -1 : 1) * (50 + alea() * 60);
  if (danger.type === 'flaque') {
    ajouterTexteFlottant(jeu, 'AQUAPLANING !', joueur.x, joueur.y - 30, '#8fd3ff', 24);
    for (let i = 0; i < 18; i++) {
      creerGerbe(jeu, joueur.x + (Math.random() - 0.5) * 40, joueur.y + joueur.hauteur * 0.6, 250);
    }
  } else {
    ajouterTexteFlottant(jeu, 'PLAQUE DE GLACE !', joueur.x, joueur.y - 30, '#dff3ff', 22);
  }
  jeu.evenements.emettre('danger', { type: danger.type });
  jeu.evenements.emettre('vibration', { motif: 30 });
}
