import { HAUTEUR, LARGEUR } from '../config/constantes.js';
import { NITRO } from '../config/gameplay.js';
import { PHASES } from '../etat/jeu.js';
import { ajouterTexteFlottant, creerFlamme, creerLigneVent } from './particules.js';

/**
 * Active le nitro si la jauge est pleine et si la partie est en cours.
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 */
export function activerNitro(jeu) {
  const { nitro } = jeu;
  if (jeu.phase !== PHASES.JEU || nitro.actif || nitro.jauge < 1) return;
  nitro.actif = true;
  nitro.restant = NITRO.duree;
  nitro.jauge = 0;
  jeu.tremblement = Math.max(jeu.tremblement, 4);
  ajouterTexteFlottant(jeu, 'NITRO !', LARGEUR / 2, HAUTEUR * 0.45, '#ff9a3c', 36);
  jeu.evenements.emettre('nitroActive');
  jeu.evenements.emettre('vibration', { motif: 40 });
}

/**
 * Vide la jauge pendant le nitro (avec flammes et lignes de vitesse),
 * la recharge lentement sinon.
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 * @param {number} dt
 */
export function mettreAJourNitro(jeu, dt) {
  const { nitro } = jeu;
  if (nitro.actif) {
    nitro.restant -= dt;
    nitro.jauge = Math.max(0, nitro.restant / NITRO.duree); // la jauge se vide
    if (nitro.restant <= 0) {
      nitro.actif = false;
      nitro.jauge = 0;
    }
    if (Math.random() < 0.6) creerFlamme(jeu);
    if (Math.random() < 0.35) creerLigneVent(jeu);
  } else if (jeu.phase === PHASES.JEU) {
    nitro.jauge = Math.min(1, nitro.jauge + NITRO.recharge * dt);
  }
}
