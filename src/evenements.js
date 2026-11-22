/**
 * Petit émetteur d'événements.
 *
 * Les règles du jeu (src/systemes, src/meteo, src/modes) ne connaissent ni le
 * son, ni la vibration, ni le DOM : elles émettent des événements que les
 * modules concernés écoutent. Cela permet de faire tourner toute la
 * simulation sans navigateur (tests) et d'ajouter une réaction (un nouveau
 * son, une statistique…) sans modifier les règles.
 *
 * Événements émis par le jeu :
 *
 * | Nom               | Données                              | Quand                                   |
 * |-------------------|--------------------------------------|-----------------------------------------|
 * | nouvellePartie    | —                                    | remise à zéro avant une partie          |
 * | compteARebours    | { valeur }                           | chaque seconde du compte à rebours      |
 * | depart            | —                                    | fin du compte à rebours                 |
 * | changementVoie    | { sens }                             | le joueur change de voie                |
 * | depassement       | { voiture }                          | voiture évitée (sans frôlement)         |
 * | frolement         | { voiture }                          | voiture évitée de très près             |
 * | combo             | { niveau }                           | nouveau palier du multiplicateur        |
 * | comboPerdu        | —                                    | série interrompue                       |
 * | nitroActive       | —                                    | le nitro démarre                        |
 * | accident          | { intensite }                        | collision                               |
 * | meteo             | { type }                             | changement de temps                     |
 * | danger            | { type }                             | roues sur une flaque ou une plaque      |
 * | vibration         | { motif }                            | demande de vibration (téléphone)        |
 * | navigation        | { phase, reglesMode? }               | l'écran à afficher a changé             |
 * | fin               | { score, record, ancienRecord, nouveauRecord } | fin de partie                 |
 */

/**
 * @typedef {object} Emetteur
 * @property {(nom: string, ecouteur: (donnees?: any) => void) => () => void} sur
 *   Abonne un écouteur ; renvoie une fonction de désabonnement.
 * @property {(nom: string, donnees?: any) => void} emettre
 *   Appelle, dans l'ordre d'abonnement, les écouteurs du nom donné.
 */

/**
 * @returns {Emetteur}
 */
export function creerEmetteur() {
  /** @type {Map<string, Set<(donnees?: any) => void>>} */
  const ecouteurs = new Map();

  return {
    sur(nom, ecouteur) {
      if (!ecouteurs.has(nom)) ecouteurs.set(nom, new Set());
      ecouteurs.get(nom).add(ecouteur);
      return () => ecouteurs.get(nom).delete(ecouteur);
    },
    emettre(nom, donnees) {
      const liste = ecouteurs.get(nom);
      if (!liste) return;
      for (const ecouteur of [...liste]) ecouteur(donnees);
    },
  };
}
