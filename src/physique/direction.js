import { HAUTEUR, PX_PAR_METRE } from '../config/constantes.js';
import { ADHERENCE_SECHE } from '../config/meteo.js';
import { adherence, deriveVerglas, facteurMeteo, forceAdherence } from '../meteo/conditions.js';
import { puissanceDisponible } from './moteur.js';
import { limiter } from '../utilitaires/maths.js';

/** Nombre maximal de traces de pneus conservées. */
const TRACES_MAX = 1500;

/**
 * Direction : la voiture est attirée vers le centre de sa voie comme par un
 * ressort amorti. L'accélération latérale est limitée par l'adhérence, et
 * l'angle de la voiture suit la direction réelle de sa vitesse :
 *
 *     angle = atan(vitesse latérale / vitesse d'avancement)
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 * @param {number} dt Durée du pas (s).
 */
export function mettreAJourDirection(jeu, dt) {
  const { joueur, meteo, route } = jeu;
  const car = joueur.caracteristiques;

  const cible = route.centreVoie(joueur.voie);
  let ax = car.raideur * (cible - joueur.x) - car.amortissement * joueur.vx;
  // Sur le verglas, de petites irrégularités de la glace font dériver la voiture
  ax += deriveVerglas(meteo, jeu.defilement);
  // Les pneus ne peuvent pas fournir plus que μ·g : sur route glissante la
  // voiture met plus de temps à changer de voie et dépasse sa cible (survirage)
  const accelMax = (car.accelLateraleMax * adherence(meteo)) / car.adherenceReference;
  ax = limiter(ax, -accelMax, accelMax);
  joueur.ax = ax;
  joueur.vx += ax * dt;
  joueur.x += joueur.vx * dt;
  joueur.angle = limiter(Math.atan2(joueur.vx, Math.max(joueur.vitesse, 1)), -0.5, 0.5);

  // Glissement latéral : un virage serré dépasse l'adhérence des pneus
  const k = adherence(meteo) / ADHERENCE_SECHE;
  const glisseLaterale = limiter((Math.abs(ax) - 800 * k) / (1500 * k), 0, 1);
  // Patinage : la force demandée au moteur approche la limite d'adhérence μ·m·g
  const v = Math.max(joueur.vitesse / PX_PAR_METRE, 1);
  const forceDemandee = (joueur.accelerateur * puissanceDisponible(jeu)) / v;
  const patinage = limiter((forceDemandee / forceAdherence(meteo, car) - 0.8) / 0.25, 0, 1);
  lisserGlisse(joueur, Math.max(glisseLaterale, patinage), dt);
  laisserTraces(jeu);
}

/**
 * Fait tendre le niveau de glisse vers une valeur cible (lissage).
 *
 * @param {import('../etat/jeu.js').Voiture} voiture
 * @param {number} cible 0 (adhérence) à 1 (dérapage complet).
 * @param {number} dt
 */
export function lisserGlisse(voiture, cible, dt) {
  voiture.glisse += (cible - voiture.glisse) * Math.min(1, dt * 25);
}

/**
 * Traces de pneus : on mémorise la position des roues arrière quand la
 * voiture glisse. Les traces sont « collées » à la route : elles descendent
 * avec le défilement.
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 */
export function laisserTraces(jeu) {
  const { joueur, meteo, traces } = jeu;
  const facteur = facteurMeteo(meteo, 'traces');
  if (joueur.glisse < 0.3 || facteur < 0.1) return;

  const cosA = Math.cos(joueur.angle);
  const sinA = Math.sin(joueur.angle);
  const centreY = joueur.y + joueur.hauteur / 2;
  for (const cote of [-1, 1]) {
    const lx = cote * (joueur.largeur / 2 - 8);
    const ly = joueur.hauteur / 2 - 16;
    traces.push({
      x: joueur.x + lx * cosA - ly * sinA,
      y: centreY + lx * sinA + ly * cosA,
      defilementDepart: jeu.defilement,
      opacite: (0.2 + 0.45 * joueur.glisse) * facteur,
    });
  }
  if (traces.length > TRACES_MAX) traces.splice(0, traces.length - TRACES_MAX);
}

/**
 * Supprime les traces sorties de l'écran (elles défilent vers le bas).
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 */
export function purgerTraces(jeu) {
  jeu.traces = jeu.traces.filter((t) => t.y + (jeu.defilement - t.defilementDepart) < HAUTEUR + 5);
}
