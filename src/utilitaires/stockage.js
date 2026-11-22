/**
 * Accès protégé au stockage local (localStorage dans le navigateur).
 *
 * Le stockage peut être indisponible (navigation privée, données bloquées,
 * exécution hors navigateur) : toutes les fonctions échouent sans bruit et
 * renvoient la valeur par défaut.
 *
 * Le support de stockage est remplaçable (`definirStockage`) : les tests
 * utilisent un stockage en mémoire, ce qui permet de vérifier les records et
 * les préférences sans navigateur.
 *
 * @typedef {object} SupportStockage
 * @property {(cle: string) => string|null} getItem
 * @property {(cle: string, valeur: string) => void} setItem
 * @property {(cle: string) => void} removeItem
 */

/** @type {SupportStockage|null} null = utiliser localStorage s'il existe */
let support = null;

/** @returns {SupportStockage|null} */
function courant() {
  if (support) return support;
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // accès refusé (cookies bloqués)
  }
}

/**
 * Remplace le support de stockage (tests). `null` rétablit localStorage.
 * @param {SupportStockage|null} nouveau
 */
export function definirStockage(nouveau) {
  support = nouveau;
}

/**
 * Stockage en mémoire, pour les tests.
 * @returns {SupportStockage & {clear: () => void, has: (cle: string) => boolean}}
 */
export function creerStockageMemoire() {
  const donnees = new Map();
  return {
    getItem: (cle) => (donnees.has(cle) ? donnees.get(cle) : null),
    setItem: (cle, valeur) => void donnees.set(cle, String(valeur)),
    removeItem: (cle) => void donnees.delete(cle),
    clear: () => donnees.clear(),
    has: (cle) => donnees.has(cle),
  };
}

/**
 * @param {string} cle
 * @param {string|null} valeurParDefaut
 * @returns {string|null}
 */
export function lireStockage(cle, valeurParDefaut) {
  try {
    const valeur = courant()?.getItem(cle);
    return valeur === null || valeur === undefined ? valeurParDefaut : valeur;
  } catch {
    return valeurParDefaut;
  }
}

/**
 * @param {string} cle
 * @param {string} valeur
 */
export function ecrireStockage(cle, valeur) {
  try {
    courant()?.setItem(cle, valeur);
  } catch {
    /* stockage indisponible : on ignore */
  }
}

/**
 * @param {string} cle
 */
export function supprimerStockage(cle) {
  try {
    courant()?.removeItem(cle);
  } catch {
    /* stockage indisponible : on ignore */
  }
}
