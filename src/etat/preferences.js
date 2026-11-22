import { DIFFICULTE_PAR_DEFAUT, difficulteExiste } from '../config/difficultes.js';
import { ecrireStockage, lireStockage, supprimerStockage } from '../utilitaires/stockage.js';

/**
 * Préférences du joueur et records, mémorisés dans le stockage local.
 *
 * Clés utilisées (inchangées depuis la première version des écrans) :
 *
 * | Clé                      | Contenu                                           |
 * | ------------------------ | ------------------------------------------------- |
 * | `dernierNom`             | dernier nom validé                                |
 * | `nomsJoueurs`            | JSON : les 3 derniers noms distincts              |
 * | `difficulte`             | `facile`, `normal` ou `difficile`                 |
 * | `dernierMode`            | identifiant du dernier mode joué                  |
 * | `nePlusAfficherRegles`   | `1` si le joueur ne veut plus voir les règles     |
 * | `record.<mode>.<nom>`    | meilleur score du joueur dans ce mode             |
 * | `recordVoiture`          | ancien record unique (migré vers `record.esquive.<nom>`) |
 */

const CLE_ANCIEN_RECORD = 'recordVoiture';
const CLE_DERNIER_NOM = 'dernierNom';
const CLE_NOMS = 'nomsJoueurs';
const CLE_DIFFICULTE = 'difficulte';
const CLE_DERNIER_MODE = 'dernierMode';
const CLE_NE_PLUS_AFFICHER = 'nePlusAfficherRegles';

/** Nombre de noms récents proposés à l'accueil. */
export const NB_NOMS_RECENTS = 3;

/** Nom : 2 à 12 caractères, lettres (accents compris), chiffres, espace ou tiret. */
const REGEX_NOM = /^[\p{L}\p{N} -]{2,12}$/u;

/**
 * @param {string} texte
 * @returns {boolean}
 */
export function nomValide(texte) {
  return REGEX_NOM.test(texte.trim());
}

/* ---------- Noms ---------- */

/** @returns {string} Dernier nom validé, ou chaîne vide. */
export function lireDernierNom() {
  return lireStockage(CLE_DERNIER_NOM, '');
}

/** @returns {string[]} Les noms récents valides (3 au plus). */
export function lireNomsRecents() {
  try {
    const noms = JSON.parse(lireStockage(CLE_NOMS, '[]'));
    if (!Array.isArray(noms)) return [];
    return noms
      .filter((nom) => typeof nom === 'string' && nomValide(nom))
      .slice(0, NB_NOMS_RECENTS);
  } catch {
    return []; // JSON corrompu
  }
}

/**
 * Mémorise le nom : dernier nom + 3 derniers noms distincts.
 * @param {string} nom
 */
export function memoriserNom(nom) {
  ecrireStockage(CLE_DERNIER_NOM, nom);
  const noms = [nom, ...lireNomsRecents().filter((n) => n !== nom)].slice(0, NB_NOMS_RECENTS);
  ecrireStockage(CLE_NOMS, JSON.stringify(noms));
}

/* ---------- Records ---------- */

/**
 * @param {string} mode Identifiant du mode.
 * @param {string} nom
 * @returns {string}
 */
export function cleRecord(mode, nom) {
  return `record.${mode}.${nom}`;
}

/**
 * @param {string} mode
 * @param {string} nom
 * @returns {number} Record du joueur dans ce mode (0 s'il n'en a pas).
 */
export function lireRecord(mode, nom) {
  if (!nom) return 0;
  return parseInt(lireStockage(cleRecord(mode, nom), '0'), 10) || 0;
}

/**
 * @param {string} mode
 * @param {string} nom
 * @param {number} valeur
 */
export function ecrireRecord(mode, nom, valeur) {
  if (!nom) return;
  ecrireStockage(cleRecord(mode, nom), String(valeur));
}

/**
 * Migration : au premier nom validé, l'ancien record unique (`recordVoiture`)
 * devient le record du mode Esquive pour ce joueur.
 *
 * @param {string} nom
 */
export function migrerAncienRecord(nom) {
  if (!nom) return;
  const cle = cleRecord('esquive', nom);
  if (lireStockage(cle, null) !== null) return;
  const ancien = parseInt(lireStockage(CLE_ANCIEN_RECORD, '0'), 10) || 0;
  if (ancien <= 0) return;
  ecrireRecord('esquive', nom, ancien);
  supprimerStockage(CLE_ANCIEN_RECORD);
}

/* ---------- Difficulté, mode, règles ---------- */

/** @returns {string} Difficulté mémorisée (toujours valide). */
export function lireDifficulte() {
  const id = lireStockage(CLE_DIFFICULTE, DIFFICULTE_PAR_DEFAUT);
  return difficulteExiste(id) ? id : DIFFICULTE_PAR_DEFAUT;
}

/** @param {string} id */
export function ecrireDifficulte(id) {
  ecrireStockage(CLE_DIFFICULTE, id);
}

/** @returns {string|null} Identifiant du dernier mode joué. */
export function lireDernierMode() {
  return lireStockage(CLE_DERNIER_MODE, null);
}

/** @param {string} id */
export function ecrireDernierMode(id) {
  ecrireStockage(CLE_DERNIER_MODE, id);
}

/** @returns {boolean} Vrai si le joueur ne veut plus voir les règles avant de jouer. */
export function lireNePlusAfficherRegles() {
  return lireStockage(CLE_NE_PLUS_AFFICHER, '0') === '1';
}

/** @param {boolean} valeur */
export function ecrireNePlusAfficherRegles(valeur) {
  ecrireStockage(CLE_NE_PLUS_AFFICHER, valeur ? '1' : '0');
}
