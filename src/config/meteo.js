/**
 * Conditions météo.
 *
 * Chaque temps modifie le coefficient d'adhérence μ des pneus. Valeurs réelles
 * approximatives : asphalte sec 0,8 à 1 ; mouillé 0,5 à 0,6 ; verglas 0,1 à 0,2.
 *
 * @typedef {object} ConditionMeteo
 * @property {string} nom        Nom affiché.
 * @property {string} conseil    Conseil affiché au joueur.
 * @property {number} adherence  Coefficient d'adhérence μ.
 * @property {number} vitesseMax Facteur sur la vitesse visée (un conducteur prudent ralentit).
 * @property {number} crissement Facteur sur le volume du crissement des pneus.
 * @property {number} traces     Facteur sur l'opacité des traces de pneus.
 */

/** @type {Readonly<Record<'sec'|'pluie'|'verglas', ConditionMeteo>>} */
export const METEOS = Object.freeze({
  sec: {
    nom: 'ROUTE SÈCHE',
    conseil: 'Bonne adhérence',
    adherence: 0.9,
    vitesseMax: 1,
    crissement: 1,
    traces: 1,
  },
  pluie: {
    nom: 'PLUIE',
    conseil: 'Route mouillée : anticipez !',
    adherence: 0.55,
    vitesseMax: 0.82,
    crissement: 0.35,
    traces: 0.3,
  },
  verglas: {
    nom: 'VERGLAS',
    conseil: 'La voiture glisse : douceur !',
    adherence: 0.2,
    vitesseMax: 0.65,
    crissement: 0.08,
    traces: 0.05,
  },
});

/** Adhérence de référence : asphalte sec. */
export const ADHERENCE_SECHE = METEOS.sec.adherence;

/** Distance avant le premier changement de temps (m, ≈ 25 s de jeu). */
export const DISTANCE_PREMIERE_METEO_M = 900;
/** Distance moyenne entre deux changements de temps (m). */
export const DISTANCE_ENTRE_METEOS_M = 1300;
/** Durée d'affichage de l'annonce d'un changement de temps (s). */
export const DUREE_ANNONCE_METEO = 2.6;

/** Adhérence sur une flaque : aquaplaning, les pneus flottent sur l'eau. */
export const ADHERENCE_FLAQUE = 0.1;
/** Adhérence sur une plaque de verglas. */
export const ADHERENCE_PLAQUE = 0.06;
/** Adhérence minimale, pour éviter toute division par zéro. */
export const ADHERENCE_MINIMALE = 0.05;
