import { HAUTEUR, LARGEUR } from '../config/constantes.js';
import { kmhVersPx, limiter } from '../utilitaires/maths.js';
import { creerGerbe } from '../systemes/particules.js';

/**
 * Particules météo : gouttes de pluie, ronds dans l'eau, gerbes d'eau des
 * roues, flocons. Effets purement visuels (Math.random).
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 */
export function creerEffetsMeteo(jeu) {
  const { meteo, joueur, route, particules } = jeu;
  const pluie = meteo.intensitePluie;
  const verglas = meteo.intensiteVerglas;

  // Gouttes de pluie : traits qui tombent vite, inclinés par le vent
  if (Math.random() < 1.3 * pluie) {
    particules.push({
      x: Math.random() * (LARGEUR + 60) - 30,
      y: -30,
      vx: -60,
      vy: 900 + joueur.vitesse * 0.4,
      vie: 0.8,
      age: 0,
      taille: 14 + Math.random() * 10,
      type: 'goutte',
    });
  }
  // Ronds dans l'eau sur la chaussée (collés à la route)
  if (Math.random() < 0.18 * pluie) {
    particules.push({
      x: route.gauche + Math.random() * route.largeur,
      y: Math.random() * HAUTEUR,
      vx: 0,
      vy: joueur.vitesse,
      vie: 0.45,
      age: 0,
      taille: 1,
      type: 'onde',
      auSol: true,
    });
  }
  // Gerbe d'eau soulevée par les roues du joueur
  if (
    pluie > 0.3 &&
    Math.random() < 0.5 * pluie * limiter(joueur.vitesse / kmhVersPx(100), 0, 1.5)
  ) {
    const cote = Math.random() < 0.5 ? -1 : 1;
    creerGerbe(
      jeu,
      joueur.x + cote * (joueur.largeur / 2 - 6),
      joueur.y + joueur.hauteur - 6,
      joueur.vitesse * 0.3,
    );
  }
  // Flocons légers sur le verglas
  if (Math.random() < 0.35 * verglas) {
    particules.push({
      x: Math.random() * LARGEUR,
      y: -10,
      vx: (Math.random() - 0.5) * 30,
      vy: 60 + joueur.vitesse * 0.35,
      vie: 3,
      age: 0,
      taille: 1.2 + Math.random() * 2,
      type: 'flocon',
    });
  }
}
