import { modeEsquive } from './esquive.js';
import { MODES_A_VENIR } from './aVenir.js';

/**
 * Un mode de jeu décrit les RÈGLES d'une partie ; le moteur (simulation,
 * physique, météo, rendu, audio) est commun à tous les modes.
 *
 * Un mode est avant tout des **données** : de quoi l'afficher dans l'écran de
 * choix et configurer les règles standard (trafic, collision fatale, météo).
 * Il peut aussi fournir des **crochets**, appelés par `reglesDePartie`
 * (regles.js) pendant la phase « jeu » :
 *
 * @typedef {object} Mode
 * @property {string} id                 Identifiant stable (clé des records).
 * @property {string} nom
 * @property {string} icone              Emoji de la carte.
 * @property {string} but                But du mode en quelques mots (carte).
 * @property {string[]} regles           Règles affichées avant la partie (3 lignes).
 * @property {string} messageDepart      Message affiché au départ de la partie.
 * @property {boolean} trafic            Des voitures arrivent-elles sur la route ?
 * @property {boolean} rivaux            Des rivaux courent-ils contre le joueur ? (modes futurs)
 * @property {boolean} collisionFatale   Un choc termine-t-il la partie ?
 * @property {number|null} distanceCible Distance à parcourir (m), si le mode en a une.
 * @property {number|null} tempsLimite   Temps imparti (s), si le mode en a un.
 * @property {'points'|'position'|'temps'|'distance'} score  Ce qui mesure le résultat.
 * @property {boolean} meteo             La météo change-t-elle pendant la partie ?
 * @property {boolean} disponible        Jouable ? (sinon : carte « Bientôt »)
 * @property {(jeu: import('../etat/jeu.js').EtatJeu) => void} [preparer]
 *   Appelé à chaque remise à zéro : initialise l'état propre au mode.
 * @property {(jeu: import('../etat/jeu.js').EtatJeu, dt: number) => void} [mettreAJour]
 *   Appelé à chaque pas, après le décompte des voitures évitées.
 * @property {(jeu: import('../etat/jeu.js').EtatJeu) => (object|null)} [verifierFin]
 *   Renvoie un résultat pour terminer la partie, ou null pour continuer.
 * @property {(ctx: CanvasRenderingContext2D, jeu: import('../etat/jeu.js').EtatJeu) => void} [dessinerInterface]
 *   Dessine l'interface propre au mode (chrono, position…), par-dessus le jeu.
 */

/**
 * Tous les modes, dans l'ordre des cartes de l'écran de choix.
 * Ajouter un mode = ajouter une entrée ici.
 *
 * @type {Readonly<Record<string, Mode>>}
 */
export const MODES = Object.freeze(
  Object.fromEntries([modeEsquive, ...MODES_A_VENIR].map((mode) => [mode.id, mode])),
);

/** Mode utilisé tant que le joueur n'en a pas choisi un autre. */
export const MODE_PAR_DEFAUT = 'esquive';

/**
 * @param {string|null|undefined} id
 * @returns {boolean} Vrai si `id` désigne un mode jouable.
 */
export function modeDisponible(id) {
  return Boolean(id) && Object.prototype.hasOwnProperty.call(MODES, id) && MODES[id].disponible;
}

/**
 * Mode à sélectionner au lancement : le dernier joué s'il est jouable,
 * sinon le mode par défaut.
 *
 * @param {string|null|undefined} dernierId
 * @returns {Mode}
 */
export function modeInitial(dernierId) {
  return modeDisponible(dernierId) ? MODES[dernierId] : MODES[MODE_PAR_DEFAUT];
}
