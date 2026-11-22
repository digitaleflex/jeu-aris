import { difficulteExiste } from '../config/difficultes.js';
import { creerReglages } from '../config/reglages.js';
import { MODES, modeDisponible, modeInitial } from '../modes/modes.js';
import { afficherMessage, PHASES, reinitialiserPartie } from './jeu.js';
import {
  ecrireDernierMode,
  ecrireDifficulte,
  lireDernierMode,
  lireDernierNom,
  lireDifficulte,
  lireNePlusAfficherRegles,
  lireRecord,
  memoriserNom,
  migrerAncienRecord,
  nomValide,
} from './preferences.js';

/**
 * Navigation entre les écrans : accueil → choix du mode → (règles) → partie → fin.
 *
 * Ces fonctions ne font que modifier l'état et prévenir par l'événement
 * `navigation` : ce sont les écrans HTML (ui/ecrans.js) qui s'affichent en
 * conséquence. Lancer la partie elle-même (boucle d'animation) est le rôle de
 * boucle.js.
 */

/**
 * Prévient l'interface que l'écran à afficher a changé.
 * @param {import('./jeu.js').EtatJeu} jeu
 */
function signaler(jeu) {
  jeu.evenements.emettre('navigation', { phase: jeu.phase, reglesMode: jeu.reglesMode });
}

/**
 * Met à jour `jeu.record` : record du joueur courant (ou du dernier nom connu)
 * dans le mode courant.
 *
 * @param {import('./jeu.js').EtatJeu} jeu
 */
export function rafraichirRecord(jeu) {
  jeu.record = lireRecord(jeu.mode.id, jeu.nomJoueur || lireDernierNom());
}

/**
 * Restaure les préférences mémorisées (dernier mode jouable, difficulté,
 * record) puis ouvre l'accueil. À appeler une fois au lancement.
 *
 * @param {import('./jeu.js').EtatJeu} jeu
 */
export function restaurerPreferences(jeu) {
  jeu.mode = modeInitial(lireDernierMode());
  jeu.difficulteId = lireDifficulte();
  jeu.reglages = creerReglages(jeu.difficulteId);
  reinitialiserPartie(jeu);
  rafraichirRecord(jeu);
  allerAccueil(jeu);
}

/**
 * Ouvre l'accueil (saisie du nom). Le nom actuel n'est pas effacé : il
 * pré-remplit le champ.
 *
 * @param {import('./jeu.js').EtatJeu} jeu
 */
export function allerAccueil(jeu) {
  jeu.phase = PHASES.ACCUEIL;
  jeu.reglesMode = null;
  signaler(jeu);
}

/**
 * Ouvre l'écran de choix du mode.
 *
 * @param {import('./jeu.js').EtatJeu} jeu
 */
export function allerChoixMode(jeu) {
  jeu.phase = PHASES.CHOIX_MODE;
  jeu.reglesMode = null;
  signaler(jeu);
}

/**
 * Valide le nom saisi à l'accueil. S'il est valide, il est mémorisé (avec
 * migration de l'ancien record unique) et le choix du mode s'ouvre.
 *
 * @param {import('./jeu.js').EtatJeu} jeu
 * @param {string} texte
 * @returns {boolean} Vrai si le nom a été accepté.
 */
export function confirmerNom(jeu, texte) {
  const nom = texte.trim();
  if (!nomValide(nom)) return false;
  jeu.nomJoueur = nom;
  memoriserNom(nom);
  migrerAncienRecord(nom);
  rafraichirRecord(jeu);
  afficherMessage(jeu, `Prêt, ${nom} ?`);
  allerChoixMode(jeu);
  return true;
}

/**
 * Choisit la difficulté (mémorisée pour les parties suivantes).
 *
 * @param {import('./jeu.js').EtatJeu} jeu
 * @param {string} id
 * @returns {boolean} Faux si la difficulté est inconnue.
 */
export function choisirDifficulte(jeu, id) {
  if (!difficulteExiste(id)) return false;
  jeu.difficulteId = id;
  jeu.reglages = creerReglages(id);
  ecrireDifficulte(id);
  return true;
}

/**
 * Le joueur a touché la carte d'un mode : on lui montre les règles, sauf s'il
 * a demandé de ne plus les voir.
 *
 * @param {import('./jeu.js').EtatJeu} jeu
 * @param {string} id
 * @returns {'regles'|'depart'|null} Ce qu'il faut faire ensuite : `regles`
 *   (règles affichées), `depart` (lancer directement la partie), ou `null`
 *   (mode inconnu ou pas encore jouable).
 */
export function ouvrirRegles(jeu, id) {
  if (!modeDisponible(id)) return null;
  jeu.reglesMode = id;
  if (lireNePlusAfficherRegles()) return 'depart';
  signaler(jeu);
  return 'regles';
}

/**
 * Ferme les règles et revient au choix du mode.
 * @param {import('./jeu.js').EtatJeu} jeu
 */
export function fermerRegles(jeu) {
  allerChoixMode(jeu);
}

/**
 * Sélectionne le mode (mémorisé comme dernier mode) avant de lancer la partie.
 *
 * @param {import('./jeu.js').EtatJeu} jeu
 * @param {string} id
 * @returns {boolean} Faux si le mode est inconnu ou pas encore jouable.
 */
export function selectionnerMode(jeu, id) {
  if (!modeDisponible(id)) return false;
  jeu.mode = MODES[id];
  ecrireDernierMode(id);
  rafraichirRecord(jeu);
  jeu.reglesMode = null;
  return true;
}
