import { JOUEUR_Y } from '../config/constantes.js';
import { REGLAGES_PAR_DEFAUT } from '../config/reglages.js';
import { DISTANCE_PREMIERE_METEO_M } from '../config/meteo.js';
import { VEHICULE_PAR_DEFAUT } from '../config/vehicules.js';
import { ROUTE_STANDARD } from '../route/route.js';
import { creerEmetteur } from '../evenements.js';
import { aleaParDefaut } from '../utilitaires/alea.js';
import { kmhVersPx } from '../utilitaires/maths.js';

/**
 * États successifs d'une partie.
 *
 *   attente ─► compte ─► jeu ─► accident ─► fini ─┐
 *      ▲         ▲                                │
 *      └─────────┴──────────── nouvelle partie ◄──┘
 */
export const PHASES = Object.freeze({
  ATTENTE: 'attente',
  COMPTE: 'compte',
  JEU: 'jeu',
  ACCIDENT: 'accident',
  FIN: 'fini',
});

/**
 * Voiture pilotée par le joueur (ou, plus tard, par un adversaire).
 * Les voitures du trafic ont le même vocabulaire (x, y, vx, vitesse, angle…).
 *
 * @typedef {object} Voiture
 * @property {import('../config/vehicules.js').ModeleVehicule} modele
 * @property {import('../config/vehicules.js').Caracteristiques} caracteristiques
 * @property {string} sprite
 * @property {string} couleurSecours
 * @property {number} largeur         Largeur (px).
 * @property {number} hauteur         Hauteur (px).
 * @property {number} voie            Numéro de la voie visée.
 * @property {number} x               Abscisse du centre (px).
 * @property {number} y               Ordonnée du bord haut (px).
 * @property {number} vx              Vitesse latérale (px/s).
 * @property {number} ax              Accélération latérale (px/s²).
 * @property {number} vitesse         Vitesse d'avancement (px/s).
 * @property {number} accelerateur    Position de l'accélérateur (0 à 1).
 * @property {number} angle           Orientation (rad).
 * @property {number} rotation        Vitesse de rotation pendant un accident (rad/s).
 * @property {number} glisse          0 = les pneus adhèrent, 1 = dérapage complet.
 */

/**
 * @typedef {object} Nitro
 * @property {number} jauge    Charge (0 à 1).
 * @property {boolean} actif
 * @property {number} restant  Secondes de boost restantes.
 */

/**
 * @typedef {object} Meteo
 * @property {'sec'|'pluie'|'verglas'} actuelle   Temps visé.
 * @property {number} intensitePluie              0 à 1, transition douce.
 * @property {number} intensiteVerglas            0 à 1, transition douce.
 * @property {number} distanceRestante            Mètres avant le prochain changement.
 * @property {number} annonce                     Durée restante de l'annonce à l'écran (s).
 * @property {'flaque'|'verglas'|null} surDanger  Danger sous les roues du joueur.
 */

/**
 * État complet d'une partie. Les règles (src/systemes, src/meteo, src/modes)
 * le lisent et le modifient ; le rendu, l'audio et le HUD le lisent.
 *
 * @typedef {object} EtatJeu
 * @property {Readonly<import('../route/route.js').Route>} route
 * @property {import('../modes/esquive.js').Mode} mode
 * @property {() => number} alea                 Hasard de la partie, voir utilitaires/alea.js.
 * @property {import('../evenements.js').Emetteur} evenements
 * @property {import('../config/reglages.js').Reglages} reglages
 * @property {string} phase                      Une valeur de PHASES.
 * @property {number} score
 * @property {number} record
 * @property {boolean} aDejaJoue
 * @property {{texte: string|null, perdu: boolean}} message
 * @property {number} voituresEvitees
 * @property {number} serie                      Voitures évitées d'affilée (combo).
 * @property {number} multiplicateurMax          Meilleur multiplicateur de la partie.
 * @property {number} nbFrolements
 * @property {number} defilement                 Distance parcourue (px), fait défiler la route.
 * @property {number} distanceDepuisVague
 * @property {number} distanceDanger
 * @property {number} tremblement                Amplitude du tremblement d'écran.
 * @property {number} ralentiRestant             Durée restante du ralenti (temps réel, s).
 * @property {number} animationCombo             Effet « pop » du multiplicateur (0 à 1).
 * @property {number} compteARebours             Secondes restantes avant le départ.
 * @property {number} dureeAccident
 * @property {number} reservoirTemps             Temps réel non encore simulé (s).
 * @property {Voiture} joueur
 * @property {Nitro} nitro
 * @property {Meteo} meteo
 * @property {object[]} obstacles                Voitures du trafic.
 * @property {object[]} particules
 * @property {object[]} traces                   Traces de pneus sur la route.
 * @property {object[]} dangers                  Flaques et plaques de verglas.
 * @property {object[]} textesFlottants
 */

/**
 * Crée la voiture du joueur, centrée sur la voie du milieu.
 *
 * @param {import('../config/vehicules.js').ModeleVehicule} modele
 * @param {Readonly<import('../route/route.js').Route>} route
 * @returns {Voiture}
 */
export function creerVoitureJoueur(modele, route) {
  const voie = Math.floor(route.nbVoies / 2);
  return {
    modele,
    caracteristiques: modele.caracteristiques,
    sprite: modele.sprite,
    couleurSecours: modele.couleurSecours,
    largeur: modele.largeur,
    hauteur: modele.hauteur,
    voie,
    x: route.centreVoie(voie),
    y: JOUEUR_Y,
    vx: 0,
    ax: 0,
    vitesse: 0,
    accelerateur: 0,
    angle: 0,
    rotation: 0,
    glisse: 0,
  };
}

/**
 * Crée l'état d'une nouvelle session de jeu.
 *
 * @param {object} [options]
 * @param {Readonly<import('../route/route.js').Route>} [options.route]
 * @param {import('../config/vehicules.js').ModeleVehicule} [options.vehicule]
 * @param {import('../modes/esquive.js').Mode} [options.mode]
 * @param {() => number} [options.alea]
 * @param {Partial<import('../config/reglages.js').Reglages>} [options.reglages]
 * @returns {EtatJeu}
 */
export function creerEtatJeu({
  route = ROUTE_STANDARD,
  vehicule = VEHICULE_PAR_DEFAUT,
  mode,
  alea = aleaParDefaut,
  reglages = {},
} = {}) {
  /** @type {EtatJeu} */
  const jeu = {
    route,
    mode,
    alea,
    evenements: creerEmetteur(),
    reglages: { ...REGLAGES_PAR_DEFAUT, ...reglages },
    phase: PHASES.ATTENTE,
    score: 0,
    record: mode?.chargerRecord?.() ?? 0,
    aDejaJoue: false,
    message: { texte: null, perdu: false },
    voituresEvitees: 0,
    serie: 0,
    multiplicateurMax: 1,
    nbFrolements: 0,
    defilement: 0,
    distanceDepuisVague: 0,
    distanceDanger: 0,
    tremblement: 0,
    ralentiRestant: 0,
    animationCombo: 0,
    compteARebours: 0,
    dureeAccident: 0,
    reservoirTemps: 0,
    joueur: creerVoitureJoueur(vehicule, route),
    nitro: { jauge: 1, actif: false, restant: 0 },
    meteo: {
      actuelle: 'sec',
      intensitePluie: 0,
      intensiteVerglas: 0,
      distanceRestante: DISTANCE_PREMIERE_METEO_M,
      annonce: 0,
      surDanger: null,
    },
    obstacles: [],
    particules: [],
    traces: [],
    dangers: [],
    textesFlottants: [],
  };
  reinitialiserPartie(jeu);
  return jeu;
}

/**
 * Remet à zéro tout ce qui dépend d'une partie (pas le record, ni le mode).
 * La voiture démarre lancée, au centre de la route.
 *
 * @param {EtatJeu} jeu
 */
export function reinitialiserPartie(jeu) {
  const { joueur, nitro, meteo, route } = jeu;

  jeu.score = 0;
  joueur.voie = Math.floor(route.nbVoies / 2);
  joueur.x = route.centreVoie(joueur.voie);
  joueur.y = JOUEUR_Y;
  joueur.vx = 0;
  joueur.ax = 0;
  joueur.angle = 0;
  joueur.rotation = 0;
  joueur.accelerateur = 0;
  joueur.vitesse = kmhVersPx(jeu.reglages.vitesseDepartKmh);
  joueur.glisse = 0;

  jeu.obstacles = [];
  jeu.particules = [];
  jeu.traces = [];
  jeu.dangers = [];
  jeu.textesFlottants = [];

  meteo.actuelle = 'sec';
  meteo.intensitePluie = 0;
  meteo.intensiteVerglas = 0;
  meteo.distanceRestante = DISTANCE_PREMIERE_METEO_M;
  meteo.annonce = 0;
  meteo.surDanger = null;

  nitro.jauge = 1;
  nitro.actif = false;
  nitro.restant = 0;

  jeu.distanceDanger = 0;
  jeu.distanceDepuisVague = 0;
  jeu.tremblement = 0;
  jeu.dureeAccident = 0;
  jeu.voituresEvitees = 0;
  jeu.serie = 0;
  jeu.multiplicateurMax = 1;
  jeu.nbFrolements = 0;
  jeu.ralentiRestant = 0;
  jeu.animationCombo = 0;
  jeu.message.perdu = false;

  jeu.mode?.preparer?.(jeu);
  jeu.evenements.emettre('nouvellePartie');
}
