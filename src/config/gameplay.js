/**
 * Règles de jeu : nitro, frôlements, combos, cycle jour / nuit.
 * Les valeurs sont regroupées ici pour être ajustées en un seul endroit.
 */

/** Nitro : la puissance du moteur est multipliée pendant quelques secondes. */
export const NITRO = Object.freeze({
  duree: 3, // s
  puissance: 2.2, // multiplicateur de puissance du moteur
  bonusKmh: 70, // vitesse visée en plus (km/h)
  recharge: 0.03, // jauge regagnée par seconde (0 à 1)
});

/** Frôlement : dépasser une voiture de très près sans la toucher. */
export const FROLEMENT = Object.freeze({
  seuil: 16, // écart latéral maximal entre carrosseries (px)
  gainJauge: 0.34, // part de jauge de nitro regagnée
  points: 2,
  dureeRalenti: 0.35, // s (temps réel)
  echelleRalenti: 0.35, // le temps du jeu s'écoule 3 fois moins vite
});

/** Combos : le multiplicateur monte toutes les N voitures évitées. */
export const COMBO = Object.freeze({
  voituresParNiveau: 5,
  multiplicateurMax: 5,
  /** Distance (px) en deçà de laquelle une voiture rend un changement de voie « utile ». */
  zoneDanger: 480,
});

/** Durée du ralenti déclenché par un accident (s, temps réel). */
export const RALENTI_ACCIDENT = 0.6;

/** Longueur du cycle jour → coucher de soleil → nuit → aube (en mètres parcourus). */
export const LONGUEUR_CYCLE_M = 3600;
