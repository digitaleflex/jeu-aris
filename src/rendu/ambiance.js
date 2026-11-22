import { HAUTEUR, LARGEUR } from '../config/constantes.js';
import { ambiance } from '../environnement/cycleJour.js';
import { halo } from './primitives.js';

/**
 * Ambiance lumineuse : teinte du coucher de soleil, nuit et phares.
 *
 * La nuit est dessinée sur un calque séparé : on le remplit d'obscurité, puis
 * on « efface » (destination-out) la lumière des phares avant de l'afficher.
 *
 * @typedef {import('./rendu.js').Rendu} Rendu
 */

/**
 * @param {Rendu} r
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 */
export function dessinerAmbiance(r, jeu) {
  const { ctx, ctxNuit, calqueNuit } = r;
  const { obscurite, teinte } = ambiance(jeu.defilement);

  if (teinte) {
    ctx.fillStyle = `rgba(${teinte[0]}, ${teinte[1]}, ${teinte[2]}, ${teinte[3]})`;
    ctx.fillRect(-20, -20, LARGEUR + 40, HAUTEUR + 40);
  }
  if (obscurite < 0.02) return;

  // 1. Obscurité sur un calque séparé
  ctxNuit.globalCompositeOperation = 'source-over';
  ctxNuit.clearRect(0, 0, LARGEUR, HAUTEUR);
  ctxNuit.fillStyle = `rgba(3, 6, 24, ${0.9 * obscurite})`;
  ctxNuit.fillRect(0, 0, LARGEUR, HAUTEUR);

  // 2. On « efface » l'obscurité là où les phares éclairent
  ctxNuit.globalCompositeOperation = 'destination-out';
  decouperPhares(ctxNuit, jeu.joueur, 1);
  for (const o of jeu.obstacles) {
    decouperPhares(ctxNuit, o, 0.75);
  }
  ctxNuit.globalCompositeOperation = 'source-over';
  ctx.drawImage(calqueNuit, 0, 0, LARGEUR, HAUTEUR);

  // 3. Halos lumineux : feux arrière rouges et ampoules des phares
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  dessinerFeux(ctx, jeu.joueur, obscurite);
  for (const o of jeu.obstacles) {
    dessinerFeux(ctx, o, obscurite);
  }
  ctx.restore();
}

/**
 * Deux cônes de lumière devant la voiture + une faible lueur autour d'elle.
 *
 * @param {CanvasRenderingContext2D} c Contexte du calque de nuit.
 * @param {{x: number, y: number, hauteur: number, angle: number}} voiture
 * @param {number} intensite
 */
function decouperPhares(c, voiture, intensite) {
  const { hauteur } = voiture;
  c.save();
  c.translate(voiture.x, voiture.y + hauteur / 2);
  c.rotate(voiture.angle);
  const avant = -hauteur / 2 + 6;
  const portee = 230;

  const degrade = c.createLinearGradient(0, avant, 0, avant - portee);
  degrade.addColorStop(0, `rgba(0, 0, 0, ${intensite})`);
  degrade.addColorStop(0.6, `rgba(0, 0, 0, ${0.55 * intensite})`);
  degrade.addColorStop(1, 'rgba(0, 0, 0, 0)');
  c.fillStyle = degrade;
  for (const cote of [-1, 1]) {
    c.beginPath();
    c.moveTo(cote * 12 - 5, avant);
    c.lineTo(cote * 12 + 5, avant);
    c.lineTo(cote * 12 + 48, avant - portee);
    c.lineTo(cote * 12 - 48, avant - portee);
    c.closePath();
    c.fill();
  }

  const lueur = c.createRadialGradient(0, 0, 10, 0, 0, hauteur * 0.75);
  lueur.addColorStop(0, `rgba(0, 0, 0, ${0.55 * intensite})`);
  lueur.addColorStop(1, 'rgba(0, 0, 0, 0)');
  c.fillStyle = lueur;
  c.beginPath();
  c.arc(0, 0, hauteur * 0.75, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

/**
 * Feux arrière (rouges) et phares (blancs) d'une voiture, en additif.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x: number, y: number, hauteur: number, angle: number}} voiture
 * @param {number} obscurite
 */
function dessinerFeux(ctx, voiture, obscurite) {
  const { hauteur } = voiture;
  ctx.save();
  ctx.translate(voiture.x, voiture.y + hauteur / 2);
  ctx.rotate(voiture.angle);
  for (const cote of [-1, 1]) {
    halo(ctx, cote * 14, hauteur / 2 - 6, 11, '255, 30, 30', 0.85 * obscurite); // feu arrière
    halo(ctx, cote * 13, -hauteur / 2 + 7, 9, '255, 245, 200', 0.9 * obscurite); // phare
  }
  ctx.restore();
}
