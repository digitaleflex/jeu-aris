/**
 * Modes annoncés mais pas encore jouables (`disponible: false`).
 *
 * Ils décrivent déjà leurs règles et leurs réglages pour que l'écran de
 * choix les affiche (carte « Bientôt »). Pour en activer un : passer
 * `disponible` à `true` et, si besoin, ajouter ses crochets (`preparer`,
 * `mettreAJour`, `verifierFin`, `dessinerInterface`) — voir modes.js.
 *
 * @type {ReadonlyArray<import('./modes.js').Mode>}
 */
export const MODES_A_VENIR = [
  {
    id: 'course',
    nom: 'Course',
    icone: '🏁',
    but: 'Bats tes rivaux',
    regles: [
      'Affronte des rivaux sur la route.',
      "Franchis la ligne d'arrivée le premier.",
      'Bientôt disponible dans une prochaine version.',
    ],
    messageDepart: 'Course lancée !',
    trafic: true,
    rivaux: true,
    collisionFatale: true,
    distanceCible: 3000,
    tempsLimite: null,
    score: 'position',
    meteo: true,
    disponible: false,
  },
  {
    id: 'chrono',
    nom: 'Chrono',
    icone: '⏱️',
    but: 'Bats le chrono',
    regles: [
      'Parcours la distance le plus vite possible.',
      'Chaque seconde compte, sans sortir de la route.',
      'Bientôt disponible dans une prochaine version.',
    ],
    messageDepart: 'Le chrono tourne !',
    trafic: true,
    rivaux: false,
    collisionFatale: true,
    distanceCible: 2000,
    tempsLimite: 90,
    score: 'temps',
    meteo: true,
    disponible: false,
  },
  {
    id: 'zen',
    nom: 'Zen',
    icone: '🌿',
    but: 'Roule sans pression',
    regles: [
      'Aucune collision fatale : roule à ton rythme.',
      'Parcours la plus grande distance possible.',
      'Bientôt disponible dans une prochaine version.',
    ],
    messageDepart: 'Roule à ton rythme.',
    trafic: true,
    rivaux: false,
    collisionFatale: false,
    distanceCible: null,
    tempsLimite: null,
    score: 'distance',
    meteo: true,
    disponible: false,
  },
  {
    id: 'defi',
    nom: 'Défi',
    icone: '🎯',
    but: 'Un objectif surprise',
    regles: [
      'Un défi différent à chaque partie.',
      "Remplis l'objectif avant la fin du temps.",
      'Bientôt disponible dans une prochaine version.',
    ],
    messageDepart: 'Relève le défi !',
    trafic: true,
    rivaux: false,
    collisionFatale: true,
    distanceCible: 1500,
    tempsLimite: 60,
    score: 'points',
    meteo: true,
    disponible: false,
  },
];
