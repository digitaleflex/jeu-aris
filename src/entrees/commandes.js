/**
 * Actions que le joueur peut déclencher. Clavier, boutons à l'écran et gestes
 * tactiles appellent les MÊMES commandes : il n'y a qu'un seul système de
 * déplacement (exigence du TP).
 *
 * @typedef {object} Commandes
 * @property {() => void} gauche        Voie de gauche.
 * @property {() => void} droite        Voie de droite.
 * @property {() => void} nitro         Active le nitro.
 * @property {() => void} demarrer      Lance (ou relance) une partie.
 * @property {() => boolean} peutDemarrer  Vrai avant la première partie et après une partie.
 * @property {() => void} basculerSon   Active ou coupe le son.
 */
export {};
