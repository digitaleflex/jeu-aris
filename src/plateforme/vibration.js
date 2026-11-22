/**
 * Vibration du téléphone (si le navigateur l'autorise ; absent sur iPhone).
 *
 * @param {number|number[]} motif Durée(s) en ms.
 */
export function vibrer(motif) {
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(motif);
  } catch {
    /* non disponible : on ignore */
  }
}

/**
 * Relie l'événement « vibration » du jeu à la vibration du téléphone.
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 */
export function brancherVibration(jeu) {
  jeu.evenements.sur('vibration', ({ motif }) => vibrer(motif));
}
