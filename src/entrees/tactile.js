/**
 * Écran tactile (et souris), n'importe où sur l'écran sauf sur les boutons :
 *   - glisser le doigt vers la gauche / la droite : change de voie dès que le
 *     doigt a parcouru SEUIL_SWIPE pixels (un long swipe enchaîne plusieurs voies) ;
 *   - glisser vers le haut : nitro ;
 *   - toucher brièvement le Canvas : moitié gauche → gauche, moitié droite → droite.
 *
 * Les écrans HTML gèrent leurs propres touchers : un toucher sur un écran ne
 * déclenche jamais un geste de jeu.
 */

/** Pixels parcourus pour valider un swipe. */
const SEUIL_SWIPE = 28;
/** Au-delà de cette distance (px), ce n'est plus un simple toucher. */
const SEUIL_TOUCHER = 12;
/** Durée maximale d'un simple toucher (ms). */
const DUREE_TOUCHER = 350;

/**
 * @param {HTMLCanvasElement} canvas
 * @param {import('./commandes.js').Commandes} commandes
 * @returns {{reinitialiser: () => void}} `reinitialiser` abandonne le geste en cours
 *   (à appeler quand une nouvelle partie démarre).
 */
export function brancherTactile(canvas, commandes) {
  /** @type {null|{id: number, departX: number, departY: number, referenceX: number, debut: number, aGlisse: boolean, surCanvas: boolean, nitroFait: boolean}} */
  let geste = null;

  document.addEventListener(
    'pointerdown',
    (evenement) => {
      if (evenement.target.closest('#ecrans')) return; // les écrans gèrent leurs touchers
      if (evenement.target.closest('button')) return; // les boutons gardent leur rôle
      if (geste !== null) return; // un seul doigt suivi à la fois
      evenement.preventDefault();
      geste = {
        id: evenement.pointerId,
        departX: evenement.clientX,
        departY: evenement.clientY,
        referenceX: evenement.clientX, // point de départ du prochain swipe
        debut: performance.now(),
        aGlisse: false,
        surCanvas: evenement.target === canvas,
        nitroFait: false,
      };
    },
    { passive: false },
  );

  document.addEventListener(
    'pointermove',
    (evenement) => {
      if (geste === null || evenement.pointerId !== geste.id) return;
      evenement.preventDefault();
      const dx = evenement.clientX - geste.referenceX;
      const dy = evenement.clientY - geste.departY;
      if (Math.abs(dx) >= SEUIL_SWIPE && Math.abs(dx) > Math.abs(dy) * 0.7) {
        if (dx < 0) commandes.gauche();
        else commandes.droite();
        geste.aGlisse = true;
        geste.referenceX = evenement.clientX;
      } else if (
        !geste.nitroFait &&
        dy <= -SEUIL_SWIPE * 1.4 &&
        Math.abs(dy) > Math.abs(dx) * 1.2
      ) {
        commandes.nitro(); // swipe vers le haut
        geste.nitroFait = true;
        geste.aGlisse = true;
      }
    },
    { passive: false },
  );

  document.addEventListener('pointerup', (evenement) => {
    if (geste === null || evenement.pointerId !== geste.id) return;
    const distance = Math.hypot(
      evenement.clientX - geste.departX,
      evenement.clientY - geste.departY,
    );
    const duree = performance.now() - geste.debut;
    const simpleToucher = !geste.aGlisse && distance < SEUIL_TOUCHER && duree < DUREE_TOUCHER;

    // Hors partie, gauche() et droite() sont sans effet : pas besoin de tester la phase
    if (simpleToucher && geste.surCanvas) {
      const rect = canvas.getBoundingClientRect();
      if (evenement.clientX - rect.left < rect.width / 2) commandes.gauche();
      else commandes.droite();
    }
    geste = null;
  });

  document.addEventListener('pointercancel', () => {
    geste = null;
  });

  // Empêche le menu « appui long » sur l'image du Canvas
  canvas.addEventListener('contextmenu', (evenement) => evenement.preventDefault());

  return {
    reinitialiser() {
      geste = null;
    },
  };
}
