/**
 * Générateurs de nombres aléatoires.
 *
 * Le hasard qui influence la partie (trafic, météo, dangers) passe par la
 * fonction `jeu.alea`, jamais directement par Math.random. On peut ainsi
 * rejouer une partie identique à partir d'une graine (défi du jour, tests).
 * Les effets purement visuels ou sonores, eux, utilisent Math.random.
 */

/**
 * Hasard par défaut : lit Math.random à chaque appel.
 * @returns {number} Un nombre dans [0, 1[.
 */
export function aleaParDefaut() {
  return Math.random();
}

/**
 * Générateur pseudo-aléatoire à graine (algorithme mulberry32).
 * La même graine produit toujours la même suite de nombres.
 *
 * @param {number} graine Entier quelconque.
 * @returns {() => number} Fonction renvoyant un nombre dans [0, 1[.
 */
export function creerAleaAvecGraine(graine) {
  let etat = graine >>> 0;
  return function alea() {
    etat = (etat + 0x6d2b79f5) >>> 0;
    let t = etat;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
