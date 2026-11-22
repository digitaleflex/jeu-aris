/**
 * Accès protégé au stockage local du navigateur (localStorage).
 *
 * Le stockage peut être indisponible (navigation privée, données bloquées,
 * exécution hors navigateur) : toutes les fonctions échouent sans bruit et
 * renvoient la valeur par défaut.
 */

/**
 * @param {string} cle
 * @param {string} valeurParDefaut
 * @returns {string}
 */
export function lireStockage(cle, valeurParDefaut) {
  try {
    const valeur = localStorage.getItem(cle);
    return valeur === null ? valeurParDefaut : valeur;
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
    localStorage.setItem(cle, valeur);
  } catch {
    /* stockage indisponible : on ignore */
  }
}
