/**
 * Niveaux de difficulté : un seul tableau à modifier pour régler le jeu.
 *
 * Les champs `reflexeRivaux` et `tempsCheckpoint` sont prêts pour les modes
 * à rivaux et à chrono (pas encore utilisés).
 *
 * @typedef {object} Difficulte
 * @property {string} nom
 * @property {number} vitesseDepart        Vitesse au départ (km/h).
 * @property {number} vitesseMax           Vitesse maximale visée (km/h).
 * @property {number} densiteTrafic        Multiplie la fréquence des vagues de voitures.
 * @property {number} probabiliteVerglas   Chance (0 à 1) que le prochain mauvais temps soit du verglas plutôt que de la pluie.
 * @property {number} reflexeRivaux        Temps de réaction des rivaux (s).
 * @property {number} tempsCheckpoint      Temps gagné à chaque point de passage (s).
 * @property {number} multiplicateurScore  Multiplie les points gagnés.
 */

/** @type {Readonly<Record<'facile'|'normal'|'difficile', Readonly<Difficulte>>>} */
export const DIFFICULTES = Object.freeze({
  facile: Object.freeze({
    nom: 'Facile',
    vitesseDepart: 70,
    vitesseMax: 140,
    densiteTrafic: 0.7,
    probabiliteVerglas: 0.15,
    reflexeRivaux: 0.6,
    tempsCheckpoint: 20,
    multiplicateurScore: 0.8,
  }),
  normal: Object.freeze({
    nom: 'Normal',
    vitesseDepart: 90,
    vitesseMax: 180,
    densiteTrafic: 1,
    probabiliteVerglas: 0.3,
    reflexeRivaux: 0.4,
    tempsCheckpoint: 15,
    multiplicateurScore: 1,
  }),
  difficile: Object.freeze({
    nom: 'Difficile',
    vitesseDepart: 110,
    vitesseMax: 220,
    densiteTrafic: 1.3,
    probabiliteVerglas: 0.5,
    reflexeRivaux: 0.2,
    tempsCheckpoint: 10,
    multiplicateurScore: 1.3,
  }),
});

/** Difficulté utilisée tant que le joueur n'en a pas choisi une autre. */
export const DIFFICULTE_PAR_DEFAUT = 'normal';

/**
 * @param {string} id
 * @returns {boolean} Vrai si `id` désigne une difficulté connue.
 */
export function difficulteExiste(id) {
  return Object.prototype.hasOwnProperty.call(DIFFICULTES, id);
}
