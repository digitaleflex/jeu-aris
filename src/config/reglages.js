import { DIFFICULTES, DIFFICULTE_PAR_DEFAUT } from './difficultes.js';

/**
 * Réglages de conduite et de trafic d'une partie.
 *
 * Ils sont regroupés dans un objet unique, dérivé de la difficulté choisie,
 * afin que les modes de jeu puissent les ajuster sans toucher à la simulation.
 *
 * @typedef {object} Reglages
 * @property {number} vitesseDepartKmh     Vitesse au départ (km/h).
 * @property {number} vitesseMaxKmh        Vitesse maximale visée par le régulateur (km/h).
 * @property {number} gainParVoitureKmh    Vitesse visée gagnée par voiture évitée (km/h).
 * @property {number} vitesseTraficKmh     Vitesse des voitures du trafic (km/h), commune à tous les modes.
 * @property {number} densiteTrafic        Multiplie la fréquence des vagues de voitures.
 * @property {number} probabiliteVerglas   Chance que le prochain mauvais temps soit du verglas.
 * @property {number} multiplicateurScore  Multiplie les points gagnés.
 * @property {number} reflexeRivaux        Temps de réaction des rivaux (s) — modes futurs.
 * @property {number} tempsCheckpoint      Temps gagné à chaque point de passage (s) — modes futurs.
 */

/** Vitesse visée gagnée par voiture évitée (km/h). */
const GAIN_PAR_VOITURE_KMH = 2.5;
/** Vitesse du trafic (km/h), commune à tous les modes. */
const VITESSE_TRAFIC_KMH = 50;

/**
 * Réglages d'une partie pour un niveau de difficulté.
 *
 * @param {string} [idDifficulte]
 * @returns {Readonly<Reglages>}
 */
export function creerReglages(idDifficulte = DIFFICULTE_PAR_DEFAUT) {
  const d = DIFFICULTES[idDifficulte] ?? DIFFICULTES[DIFFICULTE_PAR_DEFAUT];
  return Object.freeze({
    vitesseDepartKmh: d.vitesseDepart,
    vitesseMaxKmh: d.vitesseMax,
    gainParVoitureKmh: GAIN_PAR_VOITURE_KMH,
    vitesseTraficKmh: VITESSE_TRAFIC_KMH,
    densiteTrafic: d.densiteTrafic,
    probabiliteVerglas: d.probabiliteVerglas,
    multiplicateurScore: d.multiplicateurScore,
    reflexeRivaux: d.reflexeRivaux,
    tempsCheckpoint: d.tempsCheckpoint,
  });
}
