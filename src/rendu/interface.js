import { HAUTEUR, LARGEUR } from '../config/constantes.js';
import { COMBO } from '../config/gameplay.js';
import { ADHERENCE_SECHE, DUREE_ANNONCE_METEO, METEOS } from '../config/meteo.js';
import { PHASES } from '../etat/jeu.js';
import { adherence } from '../meteo/conditions.js';
import { multiplicateur } from '../systemes/score.js';
import { imagePrete } from './images.js';
import { rectangleArrondi } from './primitives.js';

/**
 * Interface dessinée dans le Canvas : tableaux de bord latéraux (combo,
 * adhérence, nitro), interface propre au mode, annonce de météo, compte à rebours.
 *
 * @typedef {import('./rendu.js').Rendu} Rendu
 */

/**
 * Multiplicateur de combo et adhérence (herbe à gauche), jauge de nitro
 * (herbe à droite).
 *
 * @param {Rendu} r
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 */
export function dessinerInterfaceJeu(r, jeu) {
  if (jeu.phase !== PHASES.JEU && jeu.phase !== PHASES.ACCIDENT) return;
  const { ctx } = r;
  const { route, meteo, nitro } = jeu;
  const largeurPanneau = route.gauche;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Combo
  const mult = multiplicateur(jeu);
  const xCombo = largeurPanneau / 2;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  rectangleArrondi(ctx, 5, 8, largeurPanneau - 10, 62, 10);
  ctx.fill();
  ctx.font = `900 ${Math.round(24 * (1 + 0.5 * jeu.animationCombo))}px Arial`;
  ctx.fillStyle = mult > 1 ? '#ffd23f' : '#ffffff';
  ctx.fillText(`×${mult}`, xCombo, 32);
  const progression =
    mult >= COMBO.multiplicateurMax
      ? 1
      : (jeu.serie % COMBO.voituresParNiveau) / COMBO.voituresParNiveau;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fillRect(12, 56, largeurPanneau - 24, 5);
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(12, 56, (largeurPanneau - 24) * progression, 5);

  // Météo : icône + adhérence μ (devient rouge sur une flaque ou une plaque)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  rectangleArrondi(ctx, 5, 78, largeurPanneau - 10, 74, 10);
  ctx.fill();
  const icone = r.banque.get(`meteo-${meteo.actuelle}`);
  if (imagePrete(icone)) ctx.drawImage(icone, xCombo - 16, 83, 32, 32);
  const mu = adherence(meteo);
  ctx.font = 'bold 11px Arial';
  ctx.fillStyle = meteo.surDanger ? '#ff6b6b' : '#ffffff';
  ctx.fillText(`μ ${mu.toFixed(2).replace('.', ',')}`, xCombo, 126);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.fillRect(12, 138, largeurPanneau - 24, 5);
  ctx.fillStyle = mu > 0.7 ? '#4ade80' : mu > 0.35 ? '#facc15' : '#ff6b6b';
  ctx.fillRect(12, 138, (largeurPanneau - 24) * Math.min(1, mu / ADHERENCE_SECHE), 5);

  // Nitro
  const largeurPanneauDroit = LARGEUR - route.droite;
  const xJauge = LARGEUR - largeurPanneauDroit / 2;
  const hauteurJauge = 110;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  rectangleArrondi(
    ctx,
    LARGEUR - largeurPanneauDroit + 5,
    8,
    largeurPanneauDroit - 10,
    hauteurJauge + 34,
    10,
  );
  ctx.fill();
  ctx.font = 'bold 10px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('NITRO', xJauge, 20);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.fillRect(xJauge - 7, 30, 14, hauteurJauge);
  const plein = nitro.jauge >= 1 && !nitro.actif;
  const clignote = plein && Math.floor(performance.now() / 250) % 2 === 0;
  ctx.fillStyle = nitro.actif ? '#5ee7ff' : clignote ? '#ffffff' : '#ff9a3c';
  const h = hauteurJauge * nitro.jauge;
  ctx.fillRect(xJauge - 7, 30 + hauteurJauge - h, 14, h);

  // Interface propre au mode actif (chrono, position…) : rien pour Esquive
  jeu.mode.dessinerInterface?.(ctx, jeu);
}

/**
 * Annonce d'un changement de temps : bandeau compact en haut (il ne cache
 * pas la route).
 *
 * @param {Rendu} r
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 */
export function dessinerAnnonceMeteo(r, jeu) {
  const { meteo, route } = jeu;
  if (meteo.annonce <= 0 || jeu.phase !== PHASES.JEU) return;
  const { ctx } = r;
  const infos = METEOS[meteo.actuelle];
  const age = DUREE_ANNONCE_METEO - meteo.annonce;
  const entree = Math.min(1, age / 0.25); // glisse depuis le haut
  const sortie = Math.min(1, meteo.annonce / 0.4); // s'efface à la fin
  const x = route.gauche + 6;
  const y = 8 - (1 - entree) * 80;
  ctx.save();
  ctx.globalAlpha = sortie;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.beginPath();
  rectangleArrondi(ctx, x, y, route.largeur - 12, 62, 12);
  ctx.fill();
  const image = r.banque.get(meteo.actuelle === 'sec' ? 'meteo-sec' : 'panneau-glissant');
  if (imagePrete(image)) {
    if (meteo.actuelle === 'sec') ctx.drawImage(image, x + 8, y + 8, 46, 46);
    else ctx.drawImage(image, x + 6, y + 9, 52, 46);
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '900 19px Arial';
  ctx.fillStyle =
    meteo.actuelle === 'verglas' ? '#bfe6ff' : meteo.actuelle === 'pluie' ? '#8fd3ff' : '#ffd23f';
  ctx.fillText(infos.nom, x + 66, y + 17);
  ctx.font = 'bold 11px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(infos.conseil, x + 66, y + 36);
  ctx.font = '11px Arial';
  ctx.fillStyle = '#cfd8e3';
  ctx.fillText(`Adhérence μ = ${infos.adherence.toFixed(2).replace('.', ',')}`, x + 66, y + 51);
  ctx.restore();
}

/**
 * Compte à rebours, dessiné sur le Canvas. Les écrans d'accueil, de choix
 * du mode et de fin de partie sont des écrans HTML (ui/ecrans.js).
 *
 * @param {Rendu} r
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 */
export function dessinerTexteSurCanvas(r, jeu) {
  if (jeu.phase !== PHASES.COMPTE) return;
  const { ctx } = r;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const nombre = Math.ceil(jeu.compteARebours);
  const progression = jeu.compteARebours - Math.floor(jeu.compteARebours);
  ctx.font = `bold ${Math.round(60 + 40 * progression)}px Arial`;
  ctx.fillStyle = `rgba(255, 210, 63, ${0.4 + 0.6 * progression})`;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.lineWidth = 6;
  ctx.strokeText(nombre, LARGEUR / 2, HAUTEUR / 2 - 40);
  ctx.fillText(nombre, LARGEUR / 2, HAUTEUR / 2 - 40);
}
