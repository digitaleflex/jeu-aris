/**
 * Clavier :
 *   ← / Q / A      voie de gauche
 *   → / D          voie de droite
 *   ↑ / Z / W / ⇧  nitro
 *   Espace / Entrée démarrer ou recommencer
 *   M              son
 *
 * @param {import('./commandes.js').Commandes} commandes
 * @returns {() => void} Fonction de désabonnement.
 */
export function brancherClavier(commandes) {
  function surTouche(evenement) {
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
    else if ((touche === ' ' || touche === 'Enter') && commandes.peutDemarrer())
      commandes.demarrer();
    else if (touche === 'ArrowUp' || touche === 'z' || touche === 'w' || touche === 'Shift')
      commandes.nitro();
    else if (touche === 'm') commandes.basculerSon();
  }
  document.addEventListener('keydown', surTouche);
  return () => document.removeEventListener('keydown', surTouche);
}
