/**
 * Mode Esquive : éviter les voitures du trafic le plus longtemps possible.
 * Un choc termine la partie. C'est le mode historique du jeu.
 *
 * Il n'a besoin d'aucun crochet : les règles standard (voir regles.js)
 * suffisent.
 *
 * @type {import('./modes.js').Mode}
 */
export const modeEsquive = {
  id: 'esquive',
  nom: 'Esquive',
  icone: '🚗💨',
  but: 'Évite le trafic',
  regles: [
    'Évite les voitures qui arrivent sur les 3 voies.',
    'Enchaîne les frôlements pour recharger le nitro et doubler tes points.',
    'Une collision termine la partie : bats ton record !',
  ],
  messageDepart: "C'est parti ! Évitez les voitures.",
  trafic: true,
  rivaux: false,
  collisionFatale: true,
  distanceCible: null,
  tempsLimite: null,
  score: 'points',
  meteo: true,
  disponible: true,
};
