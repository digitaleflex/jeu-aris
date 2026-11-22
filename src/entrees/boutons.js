/**
 * Boutons HTML : ils appellent les mêmes commandes que le clavier.
 * Chaque bouton perd le focus après un clic pour que la touche Espace ne le
 * réactive pas.
 *
 * @param {object} boutons
 * @param {HTMLElement} boutons.gauche
 * @param {HTMLElement} boutons.droite
 * @param {HTMLElement} boutons.nitro
 * @param {HTMLElement} boutons.recommencer
 * @param {HTMLElement} boutons.son
 * @param {import('./commandes.js').Commandes} commandes
 */
export function brancherBoutons(boutons, commandes) {
  const relier = (bouton, action) => {
    bouton.addEventListener('click', () => {
      action();
      bouton.blur();
    });
  };
  relier(boutons.gauche, commandes.gauche);
  relier(boutons.droite, commandes.droite);
  relier(boutons.nitro, commandes.nitro);
  relier(boutons.recommencer, commandes.demarrer);
  relier(boutons.son, commandes.basculerSon);
}
