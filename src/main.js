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
import {
  allerAccueil,
  allerChoixMode,
  choisirDifficulte,
  confirmerNom,
  fermerRegles,
  ouvrirRegles,
  restaurerPreferences,
  selectionnerMode,
} from './etat/navigation.js';
import { brancherVibration } from './plateforme/vibration.js';
import { chargerImages } from './rendu/images.js';
import { creerRendu } from './rendu/rendu.js';
import { activerNitro } from './systemes/nitro.js';
import { changerDeVoie } from './systemes/pilotage.js';
import { creerEcrans, trouverElementsEcrans } from './ui/ecrans.js';
import { creerHud } from './ui/hud.js';

/**
 * Point d'entrée : assemble l'état du jeu, le rendu, l'audio, l'interface et
 * les commandes, puis ouvre l'écran d'accueil.
 */

const element = (id) => document.getElementById(id);

const canvas = element('canvasJeu');
const zoneCanvas = canvas.parentElement;

// --- État du jeu et services branchés sur ses événements ---
const jeu = creerEtatJeu();
brancherAudio(jeu);
brancherVibration(jeu);

// --- Interface HTML : score, messages, boutons (HUD) et écrans ---
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

// --- Boucle d'animation ---
const boucle = creerBoucle({
  jeu,
  rendu,
  hud,
  sons: { initialiser: initialiserSon, mettreAJour: mettreAJourSons },
});

// --- Actions des écrans : elles combinent navigation (état) et boucle (partie) ---
const demarrerMode = (id) => {
  if (selectionnerMode(jeu, id)) boucle.demarrer();
};
const rejouer = () => boucle.demarrer(); // sans nom de joueur, la boucle ramène à l'accueil

const ecrans = creerEcrans(
  trouverElementsEcrans(document),
  {
    confirmerNom: (texte) => confirmerNom(jeu, texte),
    allerAccueil: () => allerAccueil(jeu),
    allerChoixMode: () => allerChoixMode(jeu),
    ouvrirRegles: (id) => {
      if (ouvrirRegles(jeu, id) === 'depart') demarrerMode(id);
    },
    fermerRegles: () => fermerRegles(jeu),
    lancerMode: demarrerMode,
    rejouer,
    choisirDifficulte: (id) => choisirDifficulte(jeu, id),
  },
  jeu,
);

// Les écrans et le HUD se mettent à jour à chaque changement d'écran (même sans boucle d'animation)
jeu.evenements.sur('navigation', () => {
  ecrans.rafraichir();
  hud.rafraichir(jeu);
});

// --- Commandes : clavier, boutons et gestes appellent les mêmes fonctions ---
/** @type {import('./entrees/commandes.js').Commandes} */
const commandes = {
  gauche: () => changerDeVoie(jeu, -1),
  droite: () => changerDeVoie(jeu, 1),
  nitro: () => activerNitro(jeu),
  boutonPrincipal: () => {
    if (jeu.phase === PHASES.ACCUEIL) ecrans.focaliserNom();
    else if (jeu.phase === PHASES.CHOIX_MODE) allerChoixMode(jeu);
    else rejouer();
  },
  basculerSon: () => hud.afficherSon(basculerSon()),
  saisieActive: ecrans.saisieActive,
  interfaceOuverte: ecrans.interfaceOuverte,
};

brancherClavier(commandes);
const tactile = brancherTactile(canvas, commandes);
jeu.evenements.sur('nouvellePartie', tactile.reinitialiser);
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

// --- Démarrage : préférences mémorisées, puis accueil ---
restaurerPreferences(jeu);

/**
 * Accès de débogage et de test (Playwright) : `window.jeuAris`.
 * Ne fait pas partie de l'API publique du jeu.
 */
window.jeuAris = { jeu, rendu, boucle, commandes, banque, hud, ecrans };
