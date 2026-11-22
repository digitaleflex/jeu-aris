/**
 * Actions que le joueur peut déclencher. Clavier, boutons à l'écran et gestes
 * tactiles appellent les MÊMES commandes : il n'y a qu'un seul système de
 * déplacement (exigence du TP).
 *
 * @typedef {object} Commandes
 * @property {() => void} gauche           Voie de gauche.
 * @property {() => void} droite           Voie de droite.
 * @property {() => void} nitro            Active le nitro.
 * @property {() => void} boutonPrincipal  Bouton « Démarrer / Recommencer » : selon l'écran, ouvre
 *   la saisie du nom, le choix du mode ou relance une partie.
 * @property {() => void} basculerSon      Active ou coupe le son.
 * @property {() => boolean} saisieActive  Vrai si un champ de saisie a le focus.
 * @property {() => boolean} interfaceOuverte  Vrai si un écran HTML recouvre le jeu.
 */
export {};
