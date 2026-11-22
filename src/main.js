import {
  brancherAudio,
  basculerSon,
  initialiserSon,
  mettreAJourSons,
  suspendreSon,
} from './audio/audio.js';
import { son } from './audio/contexte.js';
import { creerBoucle } from './boucle.js';
import { brancherBoutons } from './entrees/boutons.js';
import { brancherClavier } from './entrees/clavier.js';
import { brancherTactile } from './entrees/tactile.js';
import { creerEtatJeu, PHASES } from './etat/jeu.js';
import { modeEsquive } from './modes/esquive.js';
import { brancherVibration } from './plateforme/vibration.js';
import { chargerImages } from './rendu/images.js';
import { creerRendu } from './rendu/rendu.js';
import { changerDeVoie } from './systemes/pilotage.js';
import { activerNitro } from './systemes/nitro.js';
import { creerHud } from './ui/hud.js';

/**
 * Point d'entrée : assemble l'état du jeu, le rendu, l'audio, l'interface et
 * les commandes, puis affiche l'écran d'attente.
 */

const element = (id) => document.getElementById(id);

const canvas = element('canvasJeu');
const zoneCanvas = canvas.parentElement;

// --- État du jeu et services branchés sur ses événements ---
const jeu = creerEtatJeu({ mode: modeEsquive });
brancherAudio(jeu);
brancherVibration(jeu);

// --- Interface (DOM) ---
const hud = creerHud({
  score: element('score'),
  record: element('record'),
  vitesse: element('vitesse'),
  message: element('message'),
  boutonRecommencer: element('boutonRecommencer'),
  boutonNitro: element('boutonNitro'),
  boutonSon: element('boutonSon'),
});
hud.afficherSon(son.actif);

// --- Rendu : on ne dessine qu'une fois toutes les images principales prêtes ---
let rendu = null;
const banque = chargerImages(() => {
  rendu.dessiner(jeu);
  hud.rafraichir(jeu);
});
rendu = creerRendu(canvas, banque);

function ajusterEtRedessiner() {
  rendu.ajusterTaille(zoneCanvas);
  if (banque.pret) rendu.dessiner(jeu);
}
if (window.ResizeObserver) new ResizeObserver(ajusterEtRedessiner).observe(zoneCanvas);
window.addEventListener('resize', ajusterEtRedessiner);
window.addEventListener('orientationchange', ajusterEtRedessiner);
ajusterEtRedessiner();

// --- Boucle et commandes ---
const boucle = creerBoucle({
  jeu,
  rendu,
  hud,
  sons: { initialiser: initialiserSon, mettreAJour: mettreAJourSons },
});

/** @type {import('./entrees/commandes.js').Commandes} */
const commandes = {
  gauche: () => changerDeVoie(jeu, -1),
  droite: () => changerDeVoie(jeu, 1),
  nitro: () => activerNitro(jeu),
  demarrer: () => boucle.demarrer(),
  peutDemarrer: () => jeu.phase === PHASES.ATTENTE || jeu.phase === PHASES.FIN,
  basculerSon: () => hud.afficherSon(basculerSon()),
};

brancherClavier(commandes);
brancherTactile(canvas, commandes);
brancherBoutons(
  {
    gauche: element('boutonGauche'),
    droite: element('boutonDroite'),
    nitro: element('boutonNitro'),
    recommencer: element('boutonRecommencer'),
    son: element('boutonSon'),
  },
  commandes,
);

// Couper le son quand l'onglet est caché
document.addEventListener('visibilitychange', () => suspendreSon(document.hidden));

/**
 * Accès de débogage et de test (Playwright) : `window.jeuAris`.
 * Ne fait pas partie de l'API publique du jeu.
 */
window.jeuAris = { jeu, rendu, boucle, commandes, banque, hud };
