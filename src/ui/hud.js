import { pxVersKmh } from '../utilitaires/maths.js';

/**
 * Affichage HTML autour du Canvas : score, record, vitesse, message, boutons.
 *
 * Le HUD ne reçoit aucun ordre : à chaque image, `rafraichir` compare l'état
 * du jeu à ce qui est affiché et ne touche au DOM que si quelque chose a changé.
 *
 * @typedef {object} ElementsHud
 * @property {HTMLElement} score
 * @property {HTMLElement} record
 * @property {HTMLElement} vitesse
 * @property {HTMLElement} message
 * @property {HTMLElement} boutonRecommencer
 * @property {HTMLElement} boutonNitro
 * @property {HTMLElement} boutonSon
 */

/**
 * @param {ElementsHud} elements
 */
export function creerHud(elements) {
  const affiche = {
    score: null,
    record: null,
    vitesse: null,
    texte: null,
    perdu: null,
    aDejaJoue: null,
    charge: null,
    nitroPret: null,
  };

  return {
    /** @param {import('../etat/jeu.js').EtatJeu} jeu */
    rafraichir(jeu) {
      if (jeu.score !== affiche.score) {
        affiche.score = jeu.score;
        elements.score.textContent = String(jeu.score);
      }
      if (jeu.record !== affiche.record) {
        affiche.record = jeu.record;
        elements.record.textContent = String(jeu.record);
      }
      const kmh = Math.round(pxVersKmh(jeu.joueur.vitesse));
      if (kmh !== affiche.vitesse) {
        affiche.vitesse = kmh;
        elements.vitesse.textContent = String(kmh);
      }
      // Le message initial du HTML reste affiché tant que le jeu n'en a pas défini d'autre.
      if (jeu.message.texte !== null && jeu.message.texte !== affiche.texte) {
        affiche.texte = jeu.message.texte;
        elements.message.textContent = jeu.message.texte;
      }
      if (jeu.message.perdu !== affiche.perdu) {
        affiche.perdu = jeu.message.perdu;
        elements.message.classList.toggle('perdu', jeu.message.perdu);
      }
      if (jeu.aDejaJoue !== affiche.aDejaJoue) {
        affiche.aDejaJoue = jeu.aDejaJoue;
        elements.boutonRecommencer.textContent = jeu.aDejaJoue ? 'Recommencer' : 'Démarrer';
      }
      // Bouton nitro : le fond se remplit selon la charge (variable CSS --charge)
      const charge = Math.round(jeu.nitro.jauge * 100);
      const nitroPret = charge >= 100 && !jeu.nitro.actif;
      if (charge !== affiche.charge) {
        affiche.charge = charge;
        elements.boutonNitro.style.setProperty('--charge', `${charge}%`);
      }
      if (nitroPret !== affiche.nitroPret) {
        affiche.nitroPret = nitroPret;
        elements.boutonNitro.classList.toggle('pret', nitroPret);
      }
    },

    /** @param {boolean} actif */
    afficherSon(actif) {
      elements.boutonSon.textContent = actif ? '🔊' : '🔇';
      elements.boutonSon.setAttribute('aria-label', actif ? 'Couper le son' : 'Activer le son');
    },
  };
}
