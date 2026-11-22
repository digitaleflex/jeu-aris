/**
 * Clavier pendant la partie :
 *   ← / Q / A      voie de gauche
 *   → / D          voie de droite
 *   ↑ / Z / W / ⇧  nitro
 *   M              son
 *
 * Quand un écran HTML est ouvert, ou quand un champ de saisie a le focus, le
 * clavier ne pilote pas le jeu : la navigation dans les écrans est gérée par
 * ui/ecrans.js.
 *
 * @param {import('./commandes.js').Commandes} commandes
 * @returns {() => void} Fonction de désabonnement.
 */
export function brancherClavier(commandes) {
  function surTouche(evenement) {
    // Le champ de saisie garde la main (Espace et Entrée compris)
    if (commandes.saisieActive()) return;
    // Un écran HTML est ouvert : navigation seulement, aucune commande de jeu
    if (commandes.interfaceOuverte()) return;

    const touche = evenement.key;
    if (
      touche === 'ArrowLeft' ||
      touche === 'ArrowRight' ||
      touche === 'ArrowUp' ||
      touche === ' '
    ) {
      evenement.preventDefault(); // pas de défilement de la page
    }
    if (evenement.repeat) return;

    if (touche === 'ArrowLeft' || touche === 'q' || touche === 'a') commandes.gauche();
    else if (touche === 'ArrowRight' || touche === 'd') commandes.droite();
    else if (touche === 'ArrowUp' || touche === 'z' || touche === 'w' || touche === 'Shift')
      commandes.nitro();
    else if (touche === 'm') commandes.basculerSon();
  }
  document.addEventListener('keydown', surTouche);
  return () => document.removeEventListener('keydown', surTouche);
}
