/**
 * Petites fonctions de dessin partagées.
 */

/**
 * Rectangle à coins arrondis. roundRect n'existe pas sur les navigateurs
 * anciens : on dessine alors un simple rectangle.
 *
 * @param {CanvasRenderingContext2D} ctx
 */
export function rectangleArrondi(ctx, x, y, largeur, hauteur, rayon) {
  if (ctx.roundRect) ctx.roundRect(x, y, largeur, hauteur, rayon);
  else ctx.rect(x, y, largeur, hauteur);
}

/**
 * Halo lumineux circulaire (dégradé radial transparent vers l'extérieur).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} rgb Couleur « r, g, b ».
 */
export function halo(ctx, x, y, rayon, rgb, alpha) {
  const degrade = ctx.createRadialGradient(x, y, 0, x, y, rayon);
  degrade.addColorStop(0, `rgba(${rgb}, ${alpha})`);
  degrade.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = degrade;
  ctx.beginPath();
  ctx.arc(x, y, rayon, 0, Math.PI * 2);
  ctx.fill();
}
