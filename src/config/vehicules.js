import { G, GABARIT_VOITURE } from './constantes.js';

/**
 * Caractéristiques physiques d'un véhicule (unités SI).
 *
 * @typedef {object} Caracteristiques
 * @property {number} masse               Masse (kg).
 * @property {number} puissanceMax        Puissance maximale du moteur (W).
 * @property {number} adherenceReference  Adhérence sur route sèche, pour mettre l'adhérence réelle à l'échelle.
 * @property {number} coefTrainee         ½·ρ·Cx·S : force de traînée = coefTrainee · v² (N, v en m/s).
 * @property {number} forceRoulement      Résistance au roulement (N).
 * @property {number} forceFreinMax       Force de freinage maximale (N).
 * @property {number} raideur             Direction : raideur du ressort de rappel vers la voie (1/s²).
 * @property {number} amortissement       Direction : amortissement (1/s).
 * @property {number} accelLateraleMax    Accélération latérale maximale sur sec (px/s²).
 */

/** Masse volumique de l'air (kg/m³). */
const RHO_AIR = 1.2;

/**
 * Calcule les valeurs dérivées (traînée, roulement, freinage) à partir des
 * données de base d'un véhicule.
 *
 * @param {object} donnees
 * @param {number} donnees.masse
 * @param {number} donnees.puissanceMax
 * @param {number} donnees.adherenceReference
 * @param {number} donnees.cx                  Coefficient de traînée.
 * @param {number} donnees.surfaceFrontale     Surface frontale (m²).
 * @param {number} donnees.coefRoulement       Coefficient de résistance au roulement.
 * @param {number} donnees.coefFreinage        Décélération maximale au freinage, en nombre de g.
 * @param {number} donnees.raideur
 * @param {number} donnees.amortissement
 * @param {number} donnees.accelLateraleMax
 * @returns {Readonly<Caracteristiques>}
 */
export function creerCaracteristiques(donnees) {
  const { masse } = donnees;
  return Object.freeze({
    masse,
    puissanceMax: donnees.puissanceMax,
    adherenceReference: donnees.adherenceReference,
    coefTrainee: 0.5 * RHO_AIR * donnees.cx * donnees.surfaceFrontale,
    forceRoulement: donnees.coefRoulement * masse * G,
    forceFreinMax: donnees.coefFreinage * masse * G,
    raideur: donnees.raideur,
    amortissement: donnees.amortissement,
    accelLateraleMax: donnees.accelLateraleMax,
  });
}

/**
 * Modèle de véhicule : caractéristiques, gabarit et apparence.
 *
 * @typedef {object} ModeleVehicule
 * @property {string} id
 * @property {string} nom
 * @property {string} sprite           Nom de l'image (voir rendu/images.js).
 * @property {string} couleurSecours   Couleur de repli si l'image est absente.
 * @property {number} largeur          Largeur (px).
 * @property {number} hauteur          Hauteur (px).
 * @property {Readonly<Caracteristiques>} caracteristiques
 */

/** @type {Readonly<Record<string, ModeleVehicule>>} */
export const VEHICULES = Object.freeze({
  rouge: {
    id: 'rouge',
    nom: 'Berline sportive',
    sprite: 'voiture-rouge',
    couleurSecours: 'red',
    largeur: GABARIT_VOITURE.largeur,
    hauteur: GABARIT_VOITURE.hauteur,
    caracteristiques: creerCaracteristiques({
      masse: 1200,
      puissanceMax: 120000, // ≈ 163 ch
      adherenceReference: 0.9,
      cx: 0.32,
      surfaceFrontale: 2.2,
      coefRoulement: 0.012,
      coefFreinage: 0.8,
      raideur: 130,
      amortissement: 19,
      accelLateraleMax: 2600,
    }),
  },
});

/** Véhicule utilisé par défaut. */
export const VEHICULE_PAR_DEFAUT = VEHICULES.rouge;

/**
 * Modèles de voitures du trafic (sprites). Le choix est aléatoire.
 * Le trafic n'a pas de physique propre : il roule à vitesse constante.
 */
export const MODELES_TRAFIC = Object.freeze([
  { sprite: 'voiture-verte', couleurSecours: 'royalblue' },
  { sprite: 'voiture-jaune', couleurSecours: 'royalblue' },
  { sprite: 'voiture-bleue', couleurSecours: 'royalblue' },
]);
