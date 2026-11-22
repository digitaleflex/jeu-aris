import { HAUTEUR, LARGEUR } from '../config/constantes.js';
import { imagePrete } from './images.js';

/**
 * Dessin de la route : fond, marquages, état de la chaussée (mouillée,
 * givrée), flaques, plaques de verglas et traces de pneus.
 *
 * @typedef {import('./rendu.js').Rendu} Rendu
 */

/** Hauteur de l'image de route (elle se raccorde en haut et en bas). */
const HAUTEUR_TUILE = 1080;

/** Motif des reflets de pluie, répété de voie en voie. */
const REFLETS = [
  { dx: 20, dy: 0, largeur: 14, hauteur: 90 },
  { dx: 30, dy: 70, largeur: 10, hauteur: 70 },
  { dx: 24, dy: 30, largeur: 12, hauteur: 110 },
];

/**
 * @param {Rendu} r
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 */
export function dessinerRoute(r, jeu) {
  const { ctx } = r;
  const { route } = jeu;
  const decalage = jeu.defilement % HAUTEUR_TUILE;
  const image = r.banque.get('route');
  if (imagePrete(image)) {
    ctx.drawImage(image, 0, decalage - HAUTEUR_TUILE, LARGEUR, HAUTEUR_TUILE);
    ctx.drawImage(image, 0, decalage, LARGEUR, HAUTEUR_TUILE);
  } else {
    ctx.fillStyle = '#3d8c2a';
    ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
    ctx.fillStyle = '#333';
    ctx.fillRect(route.gauche, 0, route.largeur, HAUTEUR);
  }

  // Marquages entre les voies (pointillés qui défilent avec la route)
  const longueurTrait = 32;
  const periode = 64;
  const decalageTraits = jeu.defilement % periode;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  for (let i = 1; i < route.nbVoies; i++) {
    const x = route.gauche + route.largeurVoie * i - 2;
    for (let y = decalageTraits - periode; y < HAUTEUR; y += periode) {
      ctx.fillRect(x, y, 4, longueurTrait);
    }
  }
}

/**
 * Route mouillée (plus sombre, avec des reflets) ou givrée (voile bleuté).
 *
 * @param {Rendu} r
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 */
export function dessinerChaussee(r, jeu) {
  const { ctx } = r;
  const { route, meteo } = jeu;
  const pluie = meteo.intensitePluie;
  const verglas = meteo.intensiteVerglas;
  if (pluie > 0.01) {
    ctx.fillStyle = `rgba(10, 25, 50, ${0.28 * pluie})`;
    ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
    // Reflets allongés qui défilent avec la route
    const decalage = jeu.defilement % 180;
    ctx.fillStyle = `rgba(180, 210, 255, ${0.07 * pluie})`;
    for (let y = decalage - 180; y < HAUTEUR; y += 180) {
      for (let voie = 0; voie < route.nbVoies; voie++) {
        const reflet = REFLETS[voie % REFLETS.length];
        ctx.fillRect(
          route.gauche + route.largeurVoie * voie + reflet.dx,
          y + reflet.dy,
          reflet.largeur,
          reflet.hauteur,
        );
      }
    }
  }
  if (verglas > 0.01) {
    ctx.fillStyle = `rgba(200, 230, 255, ${0.22 * verglas})`;
    ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
    // Herbe gelée
    ctx.fillStyle = `rgba(240, 250, 255, ${0.35 * verglas})`;
    ctx.fillRect(0, 0, route.gauche - 4, HAUTEUR);
    ctx.fillRect(route.droite + 4, 0, LARGEUR - route.droite - 4, HAUTEUR);
  }
}

/**
 * Flaques et plaques de verglas.
 *
 * @param {Rendu} r
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 */
export function dessinerDangers(r, jeu) {
  const { ctx } = r;
  for (const d of jeu.dangers) {
    const image = r.banque.get(d.type === 'flaque' ? 'flaque' : 'plaque-verglas');
    if (imagePrete(image)) {
      ctx.drawImage(image, d.x - d.largeur / 2, d.y, d.largeur, d.hauteur);
    } else {
      ctx.fillStyle = d.type === 'flaque' ? 'rgba(60, 100, 150, 0.6)' : 'rgba(220, 240, 255, 0.6)';
      ctx.beginPath();
      ctx.ellipse(d.x, d.y + d.hauteur / 2, d.largeur / 2, d.hauteur / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/**
 * Traces de pneus noires laissées par les dérapages.
 *
 * @param {Rendu} r
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 */
export function dessinerTraces(r, jeu) {
  const { ctx } = r;
  ctx.fillStyle = '#141414';
  for (const t of jeu.traces) {
    const y = t.y + (jeu.defilement - t.defilementDepart);
    if (y > HAUTEUR + 5) continue;
    ctx.globalAlpha = t.opacite;
    ctx.fillRect(t.x - 2.5, y - 2.5, 5, 5);
  }
  ctx.globalAlpha = 1;
}

/**
 * Bords de l'écran givrés quand il gèle.
 *
 * @param {Rendu} r
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 */
export function dessinerGivre(r, jeu) {
  const { ctx } = r;
  const verglas = jeu.meteo.intensiteVerglas;
  if (verglas < 0.01) return;
  const degrade = ctx.createRadialGradient(
    LARGEUR / 2,
    HAUTEUR / 2,
    HAUTEUR * 0.35,
    LARGEUR / 2,
    HAUTEUR / 2,
    HAUTEUR * 0.75,
  );
  degrade.addColorStop(0, 'rgba(230, 245, 255, 0)');
  degrade.addColorStop(1, `rgba(230, 245, 255, ${0.5 * verglas})`);
  ctx.fillStyle = degrade;
  ctx.fillRect(-20, -20, LARGEUR + 40, HAUTEUR + 40);
}
