import { HAUTEUR, LARGEUR } from '../config/constantes.js';
import { dessinerAmbiance } from './ambiance.js';
import { dessinerAnnonceMeteo, dessinerInterfaceJeu, dessinerTexteSurCanvas } from './interface.js';
import { dessinerParticules, dessinerTextesFlottants } from './particules.js';
import {
  dessinerChaussee,
  dessinerDangers,
  dessinerGivre,
  dessinerRoute,
  dessinerTraces,
} from './route.js';
import { dessinerVoiture } from './vehicules.js';

/**
 * Moteur de rendu Canvas 2D.
 *
 * Le jeu dessine toujours dans un repère logique de LARGEUR × HAUTEUR ; le
 * rendu adapte la taille d'affichage et le nombre réel de pixels à l'écran.
 *
 * @typedef {object} Rendu
 * @property {HTMLCanvasElement} canvas
 * @property {CanvasRenderingContext2D} ctx
 * @property {import('./images.js').BanqueImages} banque
 * @property {HTMLCanvasElement} calqueNuit              Calque d'obscurité (nuit).
 * @property {CanvasRenderingContext2D} ctxNuit
 * @property {(zone: HTMLElement) => void} ajusterTaille
 * @property {(jeu: import('../etat/jeu.js').EtatJeu) => void} dessiner
 */

/**
 * @param {HTMLCanvasElement} canvas
 * @param {import('./images.js').BanqueImages} banque
 * @returns {Rendu}
 */
export function creerRendu(canvas, banque) {
  const ctx = canvas.getContext('2d');
  const calqueNuit = document.createElement('canvas');
  const ctxNuit = calqueNuit.getContext('2d');

  /** @type {Rendu} */
  const rendu = {
    canvas,
    ctx,
    banque,
    calqueNuit,
    ctxNuit,

    /**
     * Affiche le Canvas aussi grand que possible dans `zone` (rapport 2:3
     * conservé), puis adapte le nombre réel de pixels à la densité de
     * l'écran (devicePixelRatio) pour que l'image reste nette.
     */
    ajusterTaille(zone) {
      const largeurZone = zone.clientWidth;
      const hauteurZone = zone.clientHeight;
      if (largeurZone === 0 || hauteurZone === 0) return;

      const largeurAffichee = Math.floor(Math.min(largeurZone, (hauteurZone * LARGEUR) / HAUTEUR));
      const hauteurAffichee = Math.floor((largeurAffichee * HAUTEUR) / LARGEUR);
      canvas.style.width = `${largeurAffichee}px`;
      canvas.style.height = `${hauteurAffichee}px`;

      const densite = Math.min(window.devicePixelRatio || 1, 3);
      canvas.width = Math.round(largeurAffichee * densite);
      canvas.height = Math.round(hauteurAffichee * densite);
      // Changer width/height réinitialise le contexte : on remet l'échelle du repère logique
      ctx.setTransform(canvas.width / LARGEUR, 0, 0, canvas.height / HAUTEUR, 0, 0);
      ctx.imageSmoothingQuality = 'high';

      calqueNuit.width = canvas.width;
      calqueNuit.height = canvas.height;
      ctxNuit.setTransform(canvas.width / LARGEUR, 0, 0, canvas.height / HAUTEUR, 0, 0);
    },

    /**
     * Dessine une image complète. Ordre des couches, du fond vers le dessus :
     * route, chaussée, dangers, traces, particules au sol, voitures,
     * particules en l'air, ambiance (nuit), givre, textes flottants,
     * puis interface (sans tremblement).
     */
    dessiner(jeu) {
      ctx.clearRect(0, 0, LARGEUR, HAUTEUR);
      ctx.save();
      if (jeu.tremblement > 0.3) {
        ctx.translate(
          (Math.random() - 0.5) * jeu.tremblement,
          (Math.random() - 0.5) * jeu.tremblement,
        );
      }
      dessinerRoute(rendu, jeu);
      dessinerChaussee(rendu, jeu);
      dessinerDangers(rendu, jeu);
      dessinerTraces(rendu, jeu);
      dessinerParticules(rendu, jeu, true);
      for (const o of jeu.obstacles) {
        dessinerVoiture(rendu, o);
      }
      dessinerVoiture(rendu, jeu.joueur);
      dessinerParticules(rendu, jeu, false);
      dessinerAmbiance(rendu, jeu);
      dessinerGivre(rendu, jeu);
      dessinerTextesFlottants(rendu, jeu);
      ctx.restore();
      dessinerInterfaceJeu(rendu, jeu);
      dessinerAnnonceMeteo(rendu, jeu);
      dessinerTexteSurCanvas(rendu, jeu);
    },
  };
  return rendu;
}
