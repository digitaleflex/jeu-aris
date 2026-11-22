import { detecterCollision, declencherAccident } from '../systemes/accident.js';
import { mesurerEcartsLateraux, verifierObstaclesEvites } from '../systemes/score.js';
import { creerVaguesDeTrafic } from '../systemes/trafic.js';
import { ecrireStockage, lireStockage } from '../utilitaires/stockage.js';

/**
 * Un mode de jeu décrit les RÈGLES d'une partie ; le moteur (simulation,
 * physique, météo, rendu, audio) est commun à tous les modes.
 *
 * Le moteur appelle ces fonctions « crochets » :
 *
 * @typedef {object} Mode
 * @property {string} id
 * @property {string} nom
 * @property {string} messageDepart
 *   Message affiché au départ de la partie.
 * @property {() => number} chargerRecord
 *   Lit le record mémorisé.
 * @property {(jeu: import('../etat/jeu.js').EtatJeu) => void} [preparer]
 *   Appelée à chaque remise à zéro (état propre au mode).
 * @property {(jeu: import('../etat/jeu.js').EtatJeu, dt: number) => void} mettreAJourPartie
 *   Règles du mode, appelées à chaque pas pendant la phase « jeu ».
 * @property {(jeu: import('../etat/jeu.js').EtatJeu) => {nouveauRecord: boolean}} enregistrerResultat
 *   Appelée à la fin de la partie ; met à jour `jeu.record` si besoin.
 */

const CLE_RECORD = 'recordVoiture';

/**
 * Mode Esquive : éviter les voitures du trafic le plus longtemps possible.
 * Un choc termine la partie.
 *
 * @type {Mode}
 */
export const modeEsquive = {
  id: 'esquive',
  nom: 'Esquive',
  messageDepart: "C'est parti ! Évitez les voitures.",

  chargerRecord() {
    return parseInt(lireStockage(CLE_RECORD, '0'), 10) || 0;
  },

  mettreAJourPartie(jeu, dt) {
    mesurerEcartsLateraux(jeu);
    creerVaguesDeTrafic(jeu, dt);
    verifierObstaclesEvites(jeu);
    const voitureTouchee = detecterCollision(jeu);
    if (voitureTouchee) declencherAccident(jeu, voitureTouchee);
  },

  enregistrerResultat(jeu) {
    const nouveauRecord = jeu.score > jeu.record;
    if (nouveauRecord) {
      jeu.record = jeu.score;
      ecrireStockage(CLE_RECORD, String(jeu.record));
    }
    return { nouveauRecord };
  },
};
