/**
 * Constantes fondamentales du jeu : repère de dessin, échelle, pas de temps.
 *
 * Toutes les distances du jeu sont exprimées en pixels du repère logique
 * (LARGEUR × HAUTEUR). L'échelle PX_PAR_METRE les relie aux unités physiques
 * (SI) utilisées par la simulation. Voir docs/PHYSIQUE.md.
 */

/** Largeur du repère logique de dessin (px). */
export const LARGEUR = 360;
/** Hauteur du repère logique de dessin (px). */
export const HAUTEUR = 540;

/** Échelle : 20 px = 1 m (une voiture de ≈ 4,5 m mesure ≈ 89 px). */
export const PX_PAR_METRE = 20;

/** Accélération de la pesanteur (m/s²). */
export const G = 9.81;

/**
 * Pas de temps fixe de la simulation (s). Il garantit un comportement
 * identique à 60, 120 ou 144 images par seconde.
 */
export const PAS_PHYSIQUE = 1 / 120;

/** Gabarit commun à toutes les voitures (rapport 140 × 260 des images). */
export const GABARIT_VOITURE = Object.freeze({
  largeur: 48,
  hauteur: Math.round((48 * 260) / 140),
});

/** Distance entre le bas du Canvas et la voiture du joueur (px). */
export const MARGE_BAS_JOUEUR = 22;

/** Position verticale (bord haut) de la voiture du joueur : fixe à l'écran. */
export const JOUEUR_Y = HAUTEUR - GABARIT_VOITURE.hauteur - MARGE_BAS_JOUEUR;

/** Durée du compte à rebours avant le départ (s). */
export const DUREE_COMPTE_A_REBOURS = 3;

/** Durée d'une partie « accident » avant l'écran de fin (s). */
export const DUREE_ACCIDENT_MAX = 3;
