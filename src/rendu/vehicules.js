import { imagePrete } from './images.js';

/**
 * Dessine une voiture (joueur ou trafic) avec son ombre, orientée selon son angle.
 *
 * @param {import('./rendu.js').Rendu} r
 * @param {{sprite: string, couleurSecours: string, x: number, y: number, largeur: number, hauteur: number, angle: number}} voiture
 */
export function dessinerVoiture(r, voiture) {
  const { ctx } = r;
  const { x, y, largeur, hauteur, angle } = voiture;
  ctx.save();
  ctx.translate(x, y + hauteur / 2);
  ctx.rotate(angle);
  // Ombre portée
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.ellipse(4, 6, largeur / 2, hauteur / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  const image = r.banque.get(voiture.sprite);
  if (imagePrete(image)) {
    ctx.drawImage(image, -largeur / 2, -hauteur / 2, largeur, hauteur);
  } else {
    ctx.fillStyle = voiture.couleurSecours;
    ctx.fillRect(-largeur / 2, -hauteur / 2, largeur, hauteur);
  }
  ctx.restore();
}
