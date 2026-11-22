/**
 * Réglages de conduite et de trafic d'une partie.
 *
 * Ils sont regroupés dans un objet unique afin que les modes de jeu et les
 * niveaux de difficulté (voir les issues « Modes de jeu » et « Niveaux de
 * difficulté ») puissent les remplacer sans toucher à la simulation.
 *
 * @typedef {object} Reglages
 * @property {number} vitesseDepartKmh   Vitesse au départ (km/h).
 * @property {number} vitesseMaxKmh      Vitesse maximale visée par le régulateur (km/h).
 * @property {number} gainParVoitureKmh  Vitesse visée gagnée par voiture évitée (km/h).
 * @property {number} vitesseTraficKmh   Vitesse des voitures du trafic (km/h).
 */

/** @type {Readonly<Reglages>} */
export const REGLAGES_PAR_DEFAUT = Object.freeze({
  vitesseDepartKmh: 90,
  vitesseMaxKmh: 180,
  gainParVoitureKmh: 2.5,
  vitesseTraficKmh: 50,
});
