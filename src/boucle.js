import { PHASES } from './etat/jeu.js';
import { preparerPartie } from './etat/phases.js';
import { avancerSimulation } from './simulation.js';

/**
 * Boucle d'animation : à chaque image du navigateur, on fait avancer la
 * simulation, on met à jour les sons, on dessine, puis on rafraîchit le HUD.
 *
 * Une seule boucle tourne à la fois, même après plusieurs clics sur
 * « Recommencer ».
 *
 * @param {object} options
 * @param {import('./etat/jeu.js').EtatJeu} options.jeu
 * @param {import('./rendu/rendu.js').Rendu} options.rendu
 * @param {{rafraichir: (jeu: import('./etat/jeu.js').EtatJeu) => void}} options.hud
 * @param {{initialiser: () => void, mettreAJour: (jeu: import('./etat/jeu.js').EtatJeu) => void}} options.sons
 */
export function creerBoucle({ jeu, rendu, hud, sons }) {
  let idAnimation = null;
  let tempsPrecedent = 0;

  function etape(temps) {
    const duree = (temps - tempsPrecedent) / 1000;
    tempsPrecedent = temps;

    avancerSimulation(jeu, duree);
    sons.mettreAJour(jeu);
    rendu.dessiner(jeu);
    hud.rafraichir(jeu);

    if (jeu.phase === PHASES.FIN) {
      idAnimation = null; // la boucle s'arrête
    } else {
      idAnimation = requestAnimationFrame(etape);
    }
  }

  return {
    /**
     * Une image de la boucle (simulation, sons, dessin, HUD). Exposée pour les
     * tests, qui l'appellent avec des horodatages choisis ; en jeu, c'est le
     * navigateur qui l'appelle via requestAnimationFrame.
     *
     * @param {number} temps Horodatage en millisecondes.
     */
    etape,

    /** Lance (ou relance) une partie : compte à rebours puis jeu. */
    demarrer() {
      sons.initialiser();

      // Une seule boucle à la fois : on annule l'éventuelle boucle précédente
      if (idAnimation !== null) {
        cancelAnimationFrame(idAnimation);
        idAnimation = null;
      }

      preparerPartie(jeu);
      idAnimation = requestAnimationFrame((temps) => {
        tempsPrecedent = temps;
        etape(temps);
      });
    },

    /** Vrai tant qu'une boucle d'animation est active. */
    get active() {
      return idAnimation !== null;
    },
  };
}
