/**
 * Collisions entre voitures : rectangles alignés sur les axes.
 *
 * @typedef {object} Rectangle
 * @property {number} gauche
 * @property {number} droite
 * @property {number} haut
 * @property {number} bas
 */

/** Marges retirées de chaque côté : la carrosserie est plus fine que l'image. */
const MARGE_X = 5;
const MARGE_Y = 4;

/**
 * Zone occupée par une voiture, à partir de ses coordonnées et de son gabarit.
 *
 * @param {{x: number, y: number, largeur: number, hauteur: number}} voiture
 * @returns {Rectangle}
 */
export function rectangle(voiture) {
  return {
    gauche: voiture.x - voiture.largeur / 2 + MARGE_X,
    droite: voiture.x + voiture.largeur / 2 - MARGE_X,
    haut: voiture.y + MARGE_Y,
    bas: voiture.y + voiture.hauteur - MARGE_Y,
  };
}

/**
 * Deux rectangles ne se touchent pas si l'un est entièrement à gauche, à
 * droite, au-dessus ou en dessous de l'autre. Il y a collision lorsqu'aucune
 * de ces quatre séparations n'est vraie.
 *
 * @param {Rectangle} a
 * @param {Rectangle} b
 * @returns {boolean}
 */
export function seChevauchent(a, b) {
  return !(a.droite < b.gauche || a.gauche > b.droite || a.bas < b.haut || a.haut > b.bas);
}
