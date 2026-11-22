/**
 * Géométrie de la route.
 *
 * Le nombre de voies n'est PAS une constante du jeu : tout le code lit
 * `route.nbVoies`, `route.largeurVoie` et `route.centreVoie(n)`. Une route à
 * 1, 2, 4 ou 5 voies se décrit donc sans toucher à la simulation.
 *
 * Limite actuelle : toutes les voies ont la même largeur et la route est
 * droite. Les segments de largeur variable et les circuits sont prévus
 * (voir la feuille de route, docs/FEUILLE-DE-ROUTE.md).
 *
 * @typedef {object} Route
 * @property {number} nbVoies       Nombre de voies.
 * @property {number} gauche        Bord gauche de la chaussée (px).
 * @property {number} largeur       Largeur de la chaussée (px).
 * @property {number} droite        Bord droit de la chaussée (px).
 * @property {number} largeurVoie   Largeur d'une voie (px).
 * @property {(numero: number) => number} centreVoie  Abscisse du centre de la voie `numero`.
 */

/**
 * @param {object} [options]
 * @param {number} [options.nbVoies=3]   Entier ≥ 1.
 * @param {number} [options.gauche=62]   Bord gauche de la chaussée (px).
 * @param {number} [options.largeur=236] Largeur de la chaussée (px).
 * @returns {Readonly<Route>}
 */
export function creerRoute({ nbVoies = 3, gauche = 62, largeur = 236 } = {}) {
  if (!Number.isInteger(nbVoies) || nbVoies < 1) {
    throw new RangeError(`nbVoies doit être un entier ≥ 1 (reçu : ${nbVoies})`);
  }
  if (!(largeur > 0)) {
    throw new RangeError(`largeur doit être positive (reçu : ${largeur})`);
  }
  const largeurVoie = largeur / nbVoies;
  return Object.freeze({
    nbVoies,
    gauche,
    largeur,
    droite: gauche + largeur,
    largeurVoie,
    centreVoie(numero) {
      return gauche + largeurVoie * numero + largeurVoie / 2;
    },
  });
}

/**
 * Route du décor actuel : la chaussée de l'image images/route.jpg va de
 * x = 62 à x = 298 et porte trois voies.
 */
export const ROUTE_STANDARD = creerRoute({ nbVoies: 3, gauche: 62, largeur: 236 });
