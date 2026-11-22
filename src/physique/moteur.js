import { PX_PAR_METRE } from '../config/constantes.js';
import { NITRO } from '../config/gameplay.js';
import { facteurMeteo, forceAdherence } from '../meteo/conditions.js';
import { limiter } from '../utilitaires/maths.js';

/**
 * Vitesse visée par le régulateur (km/h) : elle augmente avec le nombre de
 * voitures évitées, grimpe avec le nitro et baisse sur route glissante.
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 * @returns {number}
 */
export function vitesseCibleKmh(jeu) {
  const { reglages, nitro, meteo } = jeu;
  let cible = Math.min(
    reglages.vitesseMaxKmh,
    reglages.vitesseDepartKmh + jeu.voituresEvitees * reglages.gainParVoitureKmh,
  );
  if (nitro.actif) cible += NITRO.bonusKmh;
  cible *= facteurMeteo(meteo, 'vitesseMax');
  return cible;
}

/**
 * Puissance disponible (W) : celle du moteur, multipliée pendant le nitro.
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 * @returns {number}
 */
export function puissanceDisponible(jeu) {
  return jeu.joueur.caracteristiques.puissanceMax * (jeu.nitro.actif ? NITRO.puissance : 1);
}

/**
 * Moteur : principe fondamental de la dynamique
 *
 *     m·a = F_moteur − F_traînée − F_roulement
 *
 * La force du moteur est limitée par la puissance (F = P / v) et par
 * l'adhérence des pneus (μ·m·g). Voir docs/PHYSIQUE.md.
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 * @param {number} dt Durée du pas (s).
 */
export function mettreAJourMoteur(jeu, dt) {
  const { joueur, meteo } = jeu;
  const car = joueur.caracteristiques;

  const v = joueur.vitesse / PX_PAR_METRE; // m/s
  const vCible = vitesseCibleKmh(jeu) / 3.6;
  const puissance = puissanceDisponible(jeu);

  const forceTrainee = car.coefTrainee * v * v;

  // « Régulateur de vitesse » : la puissance juste nécessaire pour compenser
  // les résistances, plus un supplément si l'on est sous la vitesse visée.
  const puissanceMaintien = ((forceTrainee + car.forceRoulement) * v) / puissance;
  const accelerateur = limiter(puissanceMaintien + (vCible - v) * 0.5, 0, 1);
  joueur.accelerateur = accelerateur;

  let forceMoteur = accelerateur * Math.min(forceAdherence(meteo, car), puissance / Math.max(v, 1));
  if (v > vCible + 1) forceMoteur = -Math.min(car.forceFreinMax, (v - vCible) * 2000);

  const acceleration = (forceMoteur - forceTrainee - car.forceRoulement) / car.masse;
  const nouvelleVitesse = Math.max(0, v + acceleration * dt);

  joueur.vitesse = nouvelleVitesse * PX_PAR_METRE;
}
