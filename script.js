"use strict";

/* =====================================================================
   JEU DE VOITURE — Canvas 2D
   Organisation du fichier :
     1. Récupération des éléments HTML
     2. Constantes (dimensions, physique)
     3. Chargement des images
     4. Sons (Web Audio API, sons synthétisés : aucun fichier externe)
     5. État du jeu (joueur, obstacles, score…)
     6. Commandes : clavier, boutons, swipe et toucher (écran tactile)
     7. Physique : moteur, direction, trafic, collisions, accident
     8. Dessin de la scène
     9. Boucle d'animation, démarrage et fin de partie
   Bonus : nitro, frôlements, combos, cycle jour / nuit avec phares
   ===================================================================== */

/* ---------- 1. Éléments HTML ---------- */
const canvas = document.getElementById("canvasJeu");
const ctx = canvas.getContext("2d");
const affichageScore = document.getElementById("score");
const affichageRecord = document.getElementById("record");
const affichageVitesse = document.getElementById("vitesse");
const zoneMessage = document.getElementById("message");
const boutonGauche = document.getElementById("boutonGauche");
const boutonDroite = document.getElementById("boutonDroite");
const boutonRecommencer = document.getElementById("boutonRecommencer");
const boutonSon = document.getElementById("boutonSon");
const boutonNitro = document.getElementById("boutonNitro");

console.log("Éléments trouvés :", { canvas, ctx, affichageScore, zoneMessage, boutonGauche, boutonDroite, boutonRecommencer });

/* ---------- 2. Constantes ---------- */
const LARGEUR = canvas.width;   // 360
const HAUTEUR = canvas.height;  // 540

// Route : la partie goudronnée de l'image va de x = 62 à x = 298
const ROUTE_GAUCHE = 62;
const ROUTE_LARGEUR = 236;
const NB_VOIES = 3;
const LARGEUR_VOIE = ROUTE_LARGEUR / NB_VOIES;

// Voitures (rapport largeur/hauteur des images : 140 x 260)
const VOITURE_LARGEUR = 48;
const VOITURE_HAUTEUR = Math.round(VOITURE_LARGEUR * 260 / 140);
const JOUEUR_Y = HAUTEUR - VOITURE_HAUTEUR - 22;

// Échelle : une voiture (≈ 4,5 m) mesure ≈ 89 px  →  20 pixels = 1 mètre
const PX_PAR_METRE = 20;
const G = 9.81;                 // pesanteur (m/s²)

// Physique longitudinale du joueur (unités SI)
const MASSE = 1200;             // kg
const PUISSANCE_MAX = 120000;   // W (≈ 163 ch)
const ADHERENCE = 0.9;          // coefficient de frottement pneu / route
const FORCE_ADHERENCE = ADHERENCE * MASSE * G;          // force max transmissible (N)
const COEF_TRAINEE = 0.5 * 1.2 * 0.32 * 2.2;            // ½ ρ Cx S  (N par (m/s)²)
const FORCE_ROULEMENT = 0.012 * MASSE * G;              // résistance au roulement (N)
const FORCE_FREIN_MAX = 0.8 * MASSE * G;                // freinage (N)

// Physique latérale (changement de voie) : ressort amorti
const RAIDEUR = 130;            // 1/s²
const AMORTISSEMENT = 19;       // 1/s
const ACCEL_LATERALE_MAX = 2600;// px/s²

// Vitesses (km/h)
const VITESSE_DEPART_KMH = 90;
const VITESSE_MAX_KMH = 180;
const VITESSE_TRAFIC_KMH = 50;

// Pas de temps fixe pour une physique identique sur tous les écrans
const PAS_PHYSIQUE = 1 / 120;

// Nitro : puissance multipliée pendant quelques secondes
const NITRO_DUREE = 3;              // s
const NITRO_PUISSANCE = 2.2;        // multiplicateur de puissance du moteur
const NITRO_BONUS_KMH = 70;         // vitesse visée en plus
const NITRO_RECHARGE = 0.03;        // jauge regagnée par seconde (0 à 1)

// Frôlement : passer très près d'une voiture sans la toucher
const SEUIL_FROLEMENT = 16;         // écart latéral max entre carrosseries (px)
const GAIN_JAUGE_FROLEMENT = 0.34;
const POINTS_FROLEMENT = 2;
const DUREE_RALENTI = 0.35;         // s (temps réel)
const ECHELLE_RALENTI = 0.35;       // le temps s'écoule 3 fois moins vite

// Combos : le multiplicateur monte toutes les 5 voitures évitées
const VOITURES_PAR_NIVEAU = 5;
const MULTIPLICATEUR_MAX = 5;
const ZONE_DANGER = 480;            // un changement de voie est utile si une voiture arrive dans sa voie

// Cycle jour → coucher de soleil → nuit → aube (en mètres parcourus)
const LONGUEUR_CYCLE_M = 3600;

/* Conversions d'unités */
function kmhVersPx(kmh) {
  return (kmh / 3.6) * PX_PAR_METRE;
}
function pxVersKmh(px) {
  return (px / PX_PAR_METRE) * 3.6;
}
function limiter(valeur, min, max) {
  return Math.max(min, Math.min(max, valeur));
}

/* ---------- 3. Images ---------- */
const imageRoute = chargerImage("images/route.jpg");
const imageJoueur = chargerImage("images/voiture-rouge.png");
const imagesAdverses = [
  chargerImage("images/voiture-verte.png"),
  chargerImage("images/voiture-jaune.png"),
  chargerImage("images/voiture-bleue.png")
];
let imagesRestantes = 5;

function chargerImage(chemin) {
  const image = new Image();
  image.addEventListener("load", imageChargee);
  image.addEventListener("error", function () {
    console.error("Image introuvable :", chemin);
    imageChargee();
  });
  image.src = chemin;
  return image;
}

function imageChargee() {
  imagesRestantes--;
  if (imagesRestantes === 0) {
    dessinerScene(); // on ne dessine qu'une fois toutes les images prêtes
  }
}

function imagePrete(image) {
  return image.complete && image.naturalWidth > 0;
}

/* ---------- 4. Sons (Web Audio) ---------- */
const son = {
  contexte: null,
  general: null,       // volume général
  moteur: null,        // { osc1, osc2, filtre, gain }
  pneus: null,         // crissement des pneus (voir creerSonPneus)
  vent: null,          // { filtre, gain }
  bruitBlanc: null,
  actif: lireStockage("sonActif", "1") === "1",
  rapport: 1           // rapport de boîte de vitesses
};

// Le navigateur n'autorise le son qu'après une action de l'utilisateur
function initialiserSon() {
  if (son.contexte) {
    if (son.contexte.state === "suspended") son.contexte.resume();
    return;
  }
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const ac = new AudioCtx();
  son.contexte = ac;
  son.general = ac.createGain();
  son.general.gain.value = son.actif ? 0.8 : 0;
  son.general.connect(ac.destination);

  // Bruit blanc réutilisable (2 s)
  const tampon = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const donnees = tampon.getChannelData(0);
  for (let i = 0; i < donnees.length; i++) donnees[i] = Math.random() * 2 - 1;
  son.bruitBlanc = tampon;

  creerSonMoteur(ac);
  son.pneus = creerSonPneus(ac);
  son.vent = creerBruitContinu(ac, "lowpass", 500, 0.7);
}

function creerSonMoteur(ac) {
  const osc1 = ac.createOscillator();
  const osc2 = ac.createOscillator();
  const filtre = ac.createBiquadFilter();
  const gain = ac.createGain();
  osc1.type = "sawtooth";
  osc2.type = "square";
  osc2.detune.value = -1200; // une octave plus bas : son plus « gras »
  filtre.type = "lowpass";
  filtre.frequency.value = 400;
  filtre.Q.value = 4;
  gain.gain.value = 0;
  osc1.connect(filtre);
  osc2.connect(filtre);
  filtre.connect(gain);
  gain.connect(son.general);
  osc1.start();
  osc2.start();
  son.moteur = { osc1, osc2, filtre, gain };
}

function creerBruitContinu(ac, typeFiltre, frequence, q) {
  const source = ac.createBufferSource();
  source.buffer = son.bruitBlanc;
  source.loop = true;
  const filtre = ac.createBiquadFilter();
  filtre.type = typeFiltre;
  filtre.frequency.value = frequence;
  filtre.Q.value = q;
  const gain = ac.createGain();
  gain.gain.value = 0;
  source.connect(filtre);
  filtre.connect(gain);
  gain.connect(son.general);
  source.start();
  return { filtre, gain };
}

/* Régime moteur calculé à partir de la vitesse et d'une boîte à 6 rapports.
   vitesse (m/s) atteinte à 6500 tr/min pour chaque rapport : */
const VITESSES_RAPPORTS = [0, 14, 23, 32, 41, 50, 60];

function mettreAJourSonContinu(vitesseMs, accelerateur, accelLaterale, enMarche) {
  if (!son.contexte) return;
  const t = son.contexte.currentTime;

  // Changement de rapport automatique
  let regime = 6500 * vitesseMs / VITESSES_RAPPORTS[son.rapport];
  if (regime > 6200 && son.rapport < 6) son.rapport++;
  if (regime < 2600 && son.rapport > 1) son.rapport--;
  regime = Math.max(900, 6500 * vitesseMs / VITESSES_RAPPORTS[son.rapport]);

  // Moteur 4 cylindres : 2 explosions par tour  →  fréquence = régime / 30
  const frequence = regime / 30;
  const m = son.moteur;
  m.osc1.frequency.setTargetAtTime(frequence, t, 0.03);
  m.osc2.frequency.setTargetAtTime(frequence, t, 0.03);
  m.filtre.frequency.setTargetAtTime(250 + regime * 0.25 + accelerateur * 600 + (nitro.actif ? 1400 : 0), t, 0.05);
  m.gain.gain.setTargetAtTime(enMarche ? 0.10 + accelerateur * 0.07 : 0, t, 0.08);

  // Bruit du vent : la traînée aérodynamique varie comme v²
  const vent = limiter((vitesseMs / 50) ** 2, 0, 1);
  son.vent.gain.gain.setTargetAtTime(enMarche ? vent * 0.12 : 0, t, 0.2);
}

function couperSonsContinus() {
  mettreAJourSonContinu(0, 0, 0, false);
}

/* ---------- Crissement réaliste des pneus ----------
   Dans la réalité, un pneu qui dérape « accroche » et « décroche » des centaines
   de fois par seconde (phénomène d'adhérence-glissement, « stick-slip »).
   Cela produit un sifflement presque musical (une note autour de 700-1500 Hz
   avec ses harmoniques) qui tremble sans arrêt, mêlé à un bruit de frottement.
   On le reproduit avec :
     1. un bruit blanc passé dans 3 filtres très sélectifs (note + 2 harmoniques) ;
     2. un oscillateur dont la hauteur vibre irrégulièrement (le « stick-slip ») ;
     3. un bruit de frottement large (gomme sur l'asphalte) ;
     4. un grondement grave (la carrosserie qui vibre).
   Deux oscillateurs lents (LFO) font trembler la hauteur de façon irrégulière. */
function creerSonPneus(ac) {
  const sortie = ac.createGain();
  sortie.gain.value = 1;
  // Légère saturation, comme un son enregistré de près
  const saturation = ac.createWaveShaper();
  const courbe = new Float32Array(1024);
  for (let i = 0; i < courbe.length; i++) {
    const x = i / 512 - 1;
    courbe[i] = Math.tanh(2.2 * x);
  }
  saturation.curve = courbe;
  sortie.connect(saturation);
  saturation.connect(son.general);

  // Vibrato irrégulier : deux LFO de fréquences sans rapport simple
  const lfo1 = ac.createOscillator();
  const lfo2 = ac.createOscillator();
  lfo1.frequency.value = 13.7;
  lfo2.frequency.value = 4.3;
  const profondeur1 = ac.createGain();
  const profondeur2 = ac.createGain();
  profondeur1.gain.value = 45;
  profondeur2.gain.value = 70;
  lfo1.connect(profondeur1);
  lfo2.connect(profondeur2);
  lfo1.start();
  lfo2.start();

  // 1. Sifflement : bruit filtré sur la note et ses harmoniques
  const sifflement = ac.createGain();
  sifflement.gain.value = 0;
  sifflement.connect(sortie);
  const bruit = ac.createBufferSource();
  bruit.buffer = son.bruitBlanc;
  bruit.loop = true;
  bruit.start();
  const harmoniques = [];
  const volumes = [1, 0.55, 0.25];
  for (let h = 0; h < 3; h++) {
    const filtre = ac.createBiquadFilter();
    filtre.type = "bandpass";
    filtre.Q.value = 38;
    filtre.frequency.value = 900 * (h + 1);
    profondeur1.connect(filtre.frequency);
    profondeur2.connect(filtre.frequency);
    const gain = ac.createGain();
    gain.gain.value = volumes[h] * 9; // un filtre très sélectif laisse passer peu d'énergie
    bruit.connect(filtre);
    filtre.connect(gain);
    gain.connect(sifflement);
    harmoniques.push(filtre);
  }

  // 2. Stick-slip : oscillateur à la même note, hauteur tremblante
  const oscillateur = ac.createOscillator();
  oscillateur.type = "sawtooth";
  oscillateur.frequency.value = 900;
  profondeur1.connect(oscillateur.frequency);
  profondeur2.connect(oscillateur.frequency);
  const filtreOsc = ac.createBiquadFilter();
  filtreOsc.type = "bandpass";
  filtreOsc.frequency.value = 1400;
  filtreOsc.Q.value = 1.5;
  const gainOsc = ac.createGain();
  gainOsc.gain.value = 0;
  oscillateur.connect(filtreOsc);
  filtreOsc.connect(gainOsc);
  gainOsc.connect(sortie);
  oscillateur.start();

  // 3. Frottement de la gomme
  const filtreFrottement = ac.createBiquadFilter();
  filtreFrottement.type = "bandpass";
  filtreFrottement.frequency.value = 2500;
  filtreFrottement.Q.value = 0.7;
  const gainFrottement = ac.createGain();
  gainFrottement.gain.value = 0;
  bruit.connect(filtreFrottement);
  filtreFrottement.connect(gainFrottement);
  gainFrottement.connect(sortie);

  // 4. Grondement grave
  const filtreGrave = ac.createBiquadFilter();
  filtreGrave.type = "lowpass";
  filtreGrave.frequency.value = 160;
  const gainGrave = ac.createGain();
  gainGrave.gain.value = 0;
  bruit.connect(filtreGrave);
  filtreGrave.connect(gainGrave);
  gainGrave.connect(sortie);

  return { sifflement, harmoniques, oscillateur, gainOsc, gainFrottement, gainGrave, lfo1, lfo2 };
}

/* glisse : 0 (le pneu adhère) à 1 (dérapage complet)
   vitesseMs : vitesse de glissement → plus on glisse vite, plus la note est aiguë */
function mettreAJourSonPneus(glisse, vitesseMs) {
  if (!son.contexte || !son.pneus) return;
  const p = son.pneus;
  const t = son.contexte.currentTime;
  const g = limiter(glisse, 0, 1);

  // La note dépend de la vitesse de glissement, avec un tremblement aléatoire
  const note = (650 + 380 * g + vitesseMs * 6) * (0.97 + Math.random() * 0.06);
  p.harmoniques.forEach(function (filtre, h) {
    filtre.frequency.setTargetAtTime(note * (h + 1), t, 0.04);
  });
  p.oscillateur.frequency.setTargetAtTime(note, t, 0.04);
  p.lfo1.frequency.setTargetAtTime(10 + Math.random() * 8, t, 0.1);

  // Le volume « vacille » un peu, comme un vrai crissement
  const vacillement = 0.8 + Math.random() * 0.4;
  const fort = Math.pow(g, 1.4);
  // Attaque rapide quand le pneu décroche, extinction plus douce quand il raccroche
  const reaction = g > 0.02 ? 0.015 : 0.06;
  p.sifflement.gain.setTargetAtTime(0.16 * fort * vacillement, t, reaction);
  p.gainOsc.gain.setTargetAtTime(0.05 * fort * vacillement, t, reaction);
  p.gainFrottement.gain.setTargetAtTime(0.12 * g * vacillement, t, reaction);
  p.gainGrave.gain.setTargetAtTime(0.35 * g, t, 0.05);
}

// Bip simple (compte à rebours, point marqué…)
function jouerBip(frequence, duree, type, volume, debut) {
  if (!son.contexte) return;
  const ac = son.contexte;
  const t = ac.currentTime + (debut || 0);
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type || "sine";
  osc.frequency.value = frequence;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume || 0.25, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duree);
  osc.connect(gain);
  gain.connect(son.general);
  osc.start(t);
  osc.stop(t + duree + 0.05);
}

// Bruit filtré bref (souffle, choc…)
function jouerBruit(duree, typeFiltre, freqDebut, freqFin, volume) {
  if (!son.contexte) return;
  const ac = son.contexte;
  const t = ac.currentTime;
  const source = ac.createBufferSource();
  source.buffer = son.bruitBlanc;
  const filtre = ac.createBiquadFilter();
  filtre.type = typeFiltre;
  filtre.Q.value = 1.2;
  filtre.frequency.setValueAtTime(freqDebut, t);
  filtre.frequency.exponentialRampToValueAtTime(freqFin, t + duree);
  const gain = ac.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duree);
  source.connect(filtre);
  filtre.connect(gain);
  gain.connect(son.general);
  source.start(t);
  source.stop(t + duree + 0.05);
}

// Voiture dépassée : souffle dont la fréquence baisse (effet Doppler) + petit « ding »
function sonDepassement() {
  jouerBruit(0.35, "bandpass", 1400, 350, 0.35);
  jouerBip(1046, 0.18, "triangle", 0.12);
  jouerBip(1568, 0.25, "triangle", 0.10, 0.07);
}

// Nitro : souffle qui monte + grondement grave
function sonNitro() {
  if (!son.contexte) return;
  jouerBruit(0.9, "bandpass", 300, 3000, 0.5);
  const ac = son.contexte;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(55, t);
  osc.frequency.exponentialRampToValueAtTime(140, t + 0.8);
  gain.gain.setValueAtTime(0.25, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 1);
  osc.connect(gain);
  gain.connect(son.general);
  osc.start(t);
  osc.stop(t + 1.05);
}

// Frôlement : souffle aigu très proche + deux notes
function sonFrolement() {
  jouerBruit(0.45, "bandpass", 3200, 500, 0.6);
  jouerBip(1318, 0.15, "square", 0.08);
  jouerBip(1760, 0.3, "square", 0.08, 0.08);
}

// Nouveau palier de combo : arpège d'autant plus aigu que le multiplicateur est grand
function sonCombo(niveau) {
  const base = 440 * Math.pow(2, (niveau - 2) * 2 / 12);
  jouerBip(base, 0.12, "triangle", 0.15);
  jouerBip(base * 1.26, 0.12, "triangle", 0.15, 0.07);
  jouerBip(base * 1.5, 0.25, "triangle", 0.15, 0.14);
}

function sonComboPerdu() {
  jouerBip(392, 0.15, "sawtooth", 0.07);
  jouerBip(262, 0.3, "sawtooth", 0.07, 0.12);
}

function sonChangementVoie() {
  jouerBruit(0.12, "highpass", 3000, 1500, 0.05);
}

// Accident : choc sourd + fracas de tôle + bris de verre
function sonAccident(intensite) {
  if (!son.contexte) return;
  const ac = son.contexte;
  const t = ac.currentTime;
  const v = limiter(intensite, 0.3, 1);

  const choc = ac.createOscillator();
  const gainChoc = ac.createGain();
  choc.type = "sine";
  choc.frequency.setValueAtTime(110, t);
  choc.frequency.exponentialRampToValueAtTime(35, t + 0.4);
  gainChoc.gain.setValueAtTime(0.9 * v, t);
  gainChoc.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  choc.connect(gainChoc);
  gainChoc.connect(son.general);
  choc.start(t);
  choc.stop(t + 0.55);

  jouerBruit(0.9, "lowpass", 4000, 120, 0.9 * v);
  for (let i = 0; i < 6; i++) {
    jouerBip(2500 + Math.random() * 3000, 0.12 + Math.random() * 0.2, "square", 0.04, 0.05 + i * 0.06);
  }
}

function basculerSon() {
  son.actif = !son.actif;
  ecrireStockage("sonActif", son.actif ? "1" : "0");
  boutonSon.textContent = son.actif ? "🔊" : "🔇";
  boutonSon.setAttribute("aria-label", son.actif ? "Couper le son" : "Activer le son");
  initialiserSon();
  if (son.general) son.general.gain.setTargetAtTime(son.actif ? 0.8 : 0, son.contexte.currentTime, 0.05);
}

/* ---------- Stockage local (meilleur score, son) ---------- */
function lireStockage(cle, valeurParDefaut) {
  try {
    const valeur = localStorage.getItem(cle);
    return valeur === null ? valeurParDefaut : valeur;
  } catch (e) {
    return valeurParDefaut;
  }
}
function ecrireStockage(cle, valeur) {
  try {
    localStorage.setItem(cle, valeur);
  } catch (e) {
    /* stockage indisponible : on ignore */
  }
}

/* ---------- 5. État du jeu ---------- */
// États possibles : "attente", "compte", "jeu", "accident", "fini"
let etat = "attente";
let score = 0;
let record = parseInt(lireStockage("recordVoiture", "0"), 10) || 0;
let idAnimation = null;
let tempsPrecedent = 0;
let reservoirTemps = 0;
let compteARebours = 0;
let dureeAccident = 0;
let defilement = 0;           // distance parcourue (px) pour faire défiler la route
let distanceDepuisVague = 0;  // distance relative depuis la dernière vague de voitures
let tremblement = 0;          // amplitude du tremblement de l'écran
let derniereVitesseAffichee = -1;

let voituresEvitees = 0;      // sert à régler la difficulté
let serie = 0;                // voitures évitées d'affilée (combo)
let multiplicateurMaxPartie = 1;
let nbFrolements = 0;
let ralentiRestant = 0;       // durée restante du ralenti (temps réel)
let animationCombo = 0;       // effet « pop » quand le multiplicateur augmente
let derniereChargeAffichee = -1;
let textesFlottants = [];

const nitro = {
  jauge: 1,          // 0 à 1 ; pleine au départ pour l'essayer tout de suite
  actif: false,
  restant: 0         // secondes de boost restantes
};

const joueur = {
  voie: 1,
  x: 0,              // centre horizontal (px)
  y: JOUEUR_Y,       // bord haut (px)
  vx: 0,             // vitesse latérale (px/s)
  ax: 0,             // accélération latérale (px/s²)
  vitesse: 0,        // vitesse d'avancement (px/s)
  accelerateur: 0,   // 0 à 1
  angle: 0,          // orientation (rad)
  rotation: 0,       // vitesse de rotation pendant un accident (rad/s)
  glisse: 0          // 0 = les pneus adhèrent, 1 = dérapage complet
};

let traces = [];     // traces de pneus laissées sur la route

let obstacles = [];
let particules = [];

affichageRecord.textContent = record;
boutonSon.textContent = son.actif ? "🔊" : "🔇";

function centreVoie(numeroVoie) {
  return ROUTE_GAUCHE + LARGEUR_VOIE * numeroVoie + LARGEUR_VOIE / 2;
}

function reinitialiserPartie() {
  score = 0;
  affichageScore.textContent = score;
  joueur.voie = 1;
  joueur.x = centreVoie(1);
  joueur.y = JOUEUR_Y;
  joueur.vx = 0;
  joueur.ax = 0;
  joueur.angle = 0;
  joueur.rotation = 0;
  joueur.accelerateur = 0;
  joueur.vitesse = kmhVersPx(VITESSE_DEPART_KMH); // départ lancé
  obstacles = [];
  particules = [];
  traces = [];
  joueur.glisse = 0;
  distanceDepuisVague = 0;
  tremblement = 0;
  dureeAccident = 0;
  son.rapport = 1;
  voituresEvitees = 0;
  serie = 0;
  multiplicateurMaxPartie = 1;
  nbFrolements = 0;
  ralentiRestant = 0;
  animationCombo = 0;
  textesFlottants = [];
  nitro.jauge = 1;
  nitro.actif = false;
  nitro.restant = 0;
  zoneMessage.classList.remove("perdu");
}
reinitialiserPartie();

/* ---------- 6. Commandes ---------- */
function allerAGauche() {
  if (etat !== "jeu" && etat !== "compte") return;
  if (joueur.voie > 0) {
    verifierChangementUtile();
    joueur.voie--;
    sonChangementVoie();
  }
}

function allerADroite() {
  if (etat !== "jeu" && etat !== "compte") return;
  if (joueur.voie < NB_VOIES - 1) {
    verifierChangementUtile();
    joueur.voie++;
    sonChangementVoie();
  }
}

document.addEventListener("keydown", function (evenement) {
  const touche = evenement.key;
  if (touche === "ArrowLeft" || touche === "ArrowRight" || touche === "ArrowUp" || touche === " ") {
    evenement.preventDefault();
  }
  if (evenement.repeat) return;

  if (touche === "ArrowLeft" || touche === "q" || touche === "a") allerAGauche();
  else if (touche === "ArrowRight" || touche === "d") allerADroite();
  else if ((touche === " " || touche === "Enter") && (etat === "attente" || etat === "fini")) lancerPartie();
  else if (touche === "ArrowUp" || touche === "z" || touche === "w" || touche === "Shift") activerNitro();
  else if (touche === "m") basculerSon();
});

// Les boutons appellent les MÊMES fonctions que le clavier
boutonGauche.addEventListener("click", function () {
  allerAGauche();
  boutonGauche.blur();
});
boutonDroite.addEventListener("click", function () {
  allerADroite();
  boutonDroite.blur();
});
boutonRecommencer.addEventListener("click", function () {
  lancerPartie();
  boutonRecommencer.blur();
});
boutonNitro.addEventListener("click", function () {
  activerNitro();
  boutonNitro.blur();
});
boutonSon.addEventListener("click", function () {
  basculerSon();
  boutonSon.blur();
});

/* Écran tactile (et souris) — n'importe où sur l'écran, sauf sur les boutons :
   - glisser le doigt vers la gauche / la droite : change de voie dès que le
     doigt a parcouru SEUIL_SWIPE pixels (un long swipe peut enchaîner 2 voies) ;
   - toucher brièvement le Canvas : moitié gauche → gauche, moitié droite → droite ;
   - avant / après une partie, un toucher lance la partie. */
const SEUIL_SWIPE = 28;      // px parcourus pour valider un swipe
const SEUIL_TOUCHER = 12;    // au-delà, ce n'est plus un simple toucher
const DUREE_TOUCHER = 350;   // ms

let geste = null;

document.addEventListener("pointerdown", function (evenement) {
  if (evenement.target.closest("button")) return; // les boutons gardent leur rôle
  if (geste !== null) return;                      // un seul doigt suivi à la fois
  evenement.preventDefault();
  geste = {
    id: evenement.pointerId,
    departX: evenement.clientX,
    departY: evenement.clientY,
    referenceX: evenement.clientX, // point de départ du prochain swipe
    debut: performance.now(),
    aGlisse: false,
    surCanvas: evenement.target === canvas,
    nitroFait: false
  };
}, { passive: false });

document.addEventListener("pointermove", function (evenement) {
  if (geste === null || evenement.pointerId !== geste.id) return;
  evenement.preventDefault();
  const dx = evenement.clientX - geste.referenceX;
  const dy = evenement.clientY - geste.departY;
  if (Math.abs(dx) >= SEUIL_SWIPE && Math.abs(dx) > Math.abs(dy) * 0.7) {
    if (dx < 0) allerAGauche();
    else allerADroite();
    geste.aGlisse = true;
    geste.referenceX = evenement.clientX;
  } else if (!geste.nitroFait && dy <= -SEUIL_SWIPE * 1.4 && Math.abs(dy) > Math.abs(dx) * 1.2) {
    // Swipe vers le haut : nitro
    activerNitro();
    geste.nitroFait = true;
    geste.aGlisse = true;
  }
}, { passive: false });

document.addEventListener("pointerup", function (evenement) {
  if (geste === null || evenement.pointerId !== geste.id) return;
  const distance = Math.hypot(evenement.clientX - geste.departX, evenement.clientY - geste.departY);
  const duree = performance.now() - geste.debut;
  const simpleToucher = !geste.aGlisse && distance < SEUIL_TOUCHER && duree < DUREE_TOUCHER;

  if (simpleToucher) {
    if (etat === "attente" || etat === "fini") {
      lancerPartie();
    } else if (geste.surCanvas) {
      const rect = canvas.getBoundingClientRect();
      if (evenement.clientX - rect.left < rect.width / 2) allerAGauche();
      else allerADroite();
    }
  }
  geste = null;
});

document.addEventListener("pointercancel", function () {
  geste = null;
});

// Empêche le menu « appui long » sur l'image du Canvas
canvas.addEventListener("contextmenu", function (evenement) {
  evenement.preventDefault();
});

/* ---------- Taille d'affichage et netteté ----------
   Le jeu calcule toujours dans un repère de 360 x 540.
   On affiche le Canvas aussi grand que possible dans sa zone (rapport 2:3 conservé),
   puis on adapte le nombre réel de pixels à la densité de l'écran
   (devicePixelRatio) pour que l'image reste nette sur téléphone. */
const zoneCanvas = canvas.parentElement;

// Calque hors écran utilisé pour dessiner l'obscurité et y « découper » les phares
const calqueNuit = document.createElement("canvas");
const ctxNuit = calqueNuit.getContext("2d");

function ajusterTailleCanvas() {
  const largeurZone = zoneCanvas.clientWidth;
  const hauteurZone = zoneCanvas.clientHeight;
  if (largeurZone === 0 || hauteurZone === 0) return;

  const largeurAffichee = Math.floor(Math.min(largeurZone, hauteurZone * LARGEUR / HAUTEUR));
  const hauteurAffichee = Math.floor(largeurAffichee * HAUTEUR / LARGEUR);
  canvas.style.width = largeurAffichee + "px";
  canvas.style.height = hauteurAffichee + "px";

  const densite = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(largeurAffichee * densite);
  canvas.height = Math.round(hauteurAffichee * densite);
  // Changer width/height réinitialise le contexte : on remet l'échelle 360 x 540
  ctx.setTransform(canvas.width / LARGEUR, 0, 0, canvas.height / HAUTEUR, 0, 0);
  ctx.imageSmoothingQuality = "high";

  calqueNuit.width = canvas.width;
  calqueNuit.height = canvas.height;
  ctxNuit.setTransform(canvas.width / LARGEUR, 0, 0, canvas.height / HAUTEUR, 0, 0);

  if (imagesRestantes === 0) dessinerScene();
}

if (window.ResizeObserver) {
  new ResizeObserver(ajusterTailleCanvas).observe(zoneCanvas);
}
window.addEventListener("resize", ajusterTailleCanvas);
window.addEventListener("orientationchange", ajusterTailleCanvas);
ajusterTailleCanvas();

/* ---------- 7. Physique ---------- */
function mettreAJour(dt) {
  if (etat === "compte" || etat === "jeu") {
    mettreAJourMoteur(dt);
    mettreAJourDirection(dt);
  } else if (etat === "accident") {
    mettreAJourAccident(dt);
  }

  defilement += joueur.vitesse * dt;
  deplacerObstacles(dt);
  mettreAJourNitro(dt);
  mesurerEcartsLateraux();
  mettreAJourParticules(dt);
  mettreAJourTextesFlottants(dt);
  animationCombo *= Math.exp(-5 * dt);
  tremblement *= Math.exp(-6 * dt);

  if (etat === "compte") {
    mettreAJourCompteARebours(dt);
  } else if (etat === "jeu") {
    creerVaguesDeTrafic(dt);
    verifierObstaclesEvites();
    verifierCollisions();
  }
}

/* Moteur : principe fondamental de la dynamique  m·a = F_moteur − F_traînée − F_roulement
   La force du moteur est limitée par la puissance (F = P / v) et par l'adhérence des pneus. */
function mettreAJourMoteur(dt) {
  const v = joueur.vitesse / PX_PAR_METRE;                       // m/s
  let vitesseCibleKmh = Math.min(VITESSE_MAX_KMH, VITESSE_DEPART_KMH + voituresEvitees * 2.5);
  if (nitro.actif) vitesseCibleKmh += NITRO_BONUS_KMH;
  const vCible = vitesseCibleKmh / 3.6;
  const puissance = PUISSANCE_MAX * (nitro.actif ? NITRO_PUISSANCE : 1);

  const forceTrainee = COEF_TRAINEE * v * v;

  // « Régulateur de vitesse » : la puissance juste nécessaire pour compenser les
  // résistances, plus un supplément si l'on est en dessous de la vitesse visée.
  const puissanceMaintien = (forceTrainee + FORCE_ROULEMENT) * v / puissance;
  const accelerateur = limiter(puissanceMaintien + (vCible - v) * 0.5, 0, 1);
  joueur.accelerateur = accelerateur;

  let forceMoteur = accelerateur * Math.min(FORCE_ADHERENCE, puissance / Math.max(v, 1));
  if (v > vCible + 1) forceMoteur = -Math.min(FORCE_FREIN_MAX, (v - vCible) * 2000);

  const acceleration = (forceMoteur - forceTrainee - FORCE_ROULEMENT) / MASSE;
  const nouvelleVitesse = Math.max(0, v + acceleration * dt);

  joueur.vitesse = nouvelleVitesse * PX_PAR_METRE;
}

/* Direction : la voiture est attirée vers le centre de sa voie comme par un ressort amorti.
   L'accélération latérale est limitée (adhérence), et l'angle de la voiture suit la
   direction réelle de sa vitesse : angle = atan(vitesse latérale / vitesse d'avancement). */
function mettreAJourDirection(dt) {
  const cible = centreVoie(joueur.voie);
  let ax = RAIDEUR * (cible - joueur.x) - AMORTISSEMENT * joueur.vx;
  ax = limiter(ax, -ACCEL_LATERALE_MAX, ACCEL_LATERALE_MAX);
  joueur.ax = ax;
  joueur.vx += ax * dt;
  joueur.x += joueur.vx * dt;
  joueur.angle = limiter(Math.atan2(joueur.vx, Math.max(joueur.vitesse, 1)), -0.5, 0.5);

  // Glissement latéral : un virage serré dépasse l'adhérence des pneus
  const glisseLaterale = limiter((Math.abs(ax) - 800) / 1500, 0, 1);
  // Patinage : la force demandée au moteur approche la limite d'adhérence μ·m·g
  const v = Math.max(joueur.vitesse / PX_PAR_METRE, 1);
  const puissance = PUISSANCE_MAX * (nitro.actif ? NITRO_PUISSANCE : 1);
  const forceDemandee = joueur.accelerateur * puissance / v;
  const patinage = limiter((forceDemandee / FORCE_ADHERENCE - 0.8) / 0.25, 0, 1);
  lisserGlisse(Math.max(glisseLaterale, patinage), dt);
  laisserTraces(dt);
}

function lisserGlisse(cible, dt) {
  joueur.glisse += (cible - joueur.glisse) * Math.min(1, dt * 25);
}

/* Traces de pneus : on mémorise la position des roues arrière quand la voiture glisse.
   Les traces sont « collées » à la route : elles descendent avec le défilement. */
function laisserTraces(dt) {
  if (joueur.glisse < 0.3) return;
  const cosA = Math.cos(joueur.angle);
  const sinA = Math.sin(joueur.angle);
  const centreY = joueur.y + VOITURE_HAUTEUR / 2;
  for (const cote of [-1, 1]) {
    const lx = cote * (VOITURE_LARGEUR / 2 - 8);
    const ly = VOITURE_HAUTEUR / 2 - 16;
    traces.push({
      x: joueur.x + lx * cosA - ly * sinA,
      y: centreY + lx * sinA + ly * cosA,
      defilementDepart: defilement,
      opacite: 0.2 + 0.45 * joueur.glisse
    });
  }
  if (traces.length > 1500) traces.splice(0, traces.length - 1500);
}

function dessinerTraces() {
  ctx.fillStyle = "#141414";
  for (const t of traces) {
    const y = t.y + (defilement - t.defilementDepart);
    if (y > HAUTEUR + 5) continue;
    ctx.globalAlpha = t.opacite;
    ctx.fillRect(t.x - 2.5, y - 2.5, 5, 5);
  }
  ctx.globalAlpha = 1;
  traces = traces.filter(function (t) {
    return t.y + (defilement - t.defilementDepart) < HAUTEUR + 5;
  });
}

function mettreAJourCompteARebours(dt) {
  const avant = Math.ceil(compteARebours);
  compteARebours -= dt;
  const apres = Math.ceil(compteARebours);
  if (apres !== avant) {
    if (apres > 0) {
      jouerBip(523, 0.25, "square", 0.12);
    } else {
      jouerBip(1046, 0.5, "square", 0.14);
      etat = "jeu";
      afficherMessage("C'est parti ! Évitez les voitures.");
    }
  }
}

/* Trafic : toutes les voitures adverses roulent à la même vitesse (dans le même sens).
   À l'écran, elles descendent à la vitesse RELATIVE  v_joueur − v_trafic. */
function vitesseRelativeTrafic() {
  return joueur.vitesse - kmhVersPx(VITESSE_TRAFIC_KMH);
}

function creerVaguesDeTrafic(dt) {
  const vRel = vitesseRelativeTrafic();
  if (vRel <= 0) return;
  distanceDepuisVague += vRel * dt;

  // Écart entre deux vagues : au moins ≈ 0,85 s pour pouvoir changer de voie
  const ecart = VOITURE_HAUTEUR + Math.max(160, vRel * 0.85);
  if (distanceDepuisVague >= ecart) {
    distanceDepuisVague = 0;
    creerVague();
  }
}

function creerVague() {
  // Une ou deux voitures : il reste toujours au moins une voie libre
  const probaDeux = Math.min(0.55, 0.2 + voituresEvitees * 0.015);
  const nombre = Math.random() < probaDeux ? 2 : 1;
  const voieLibre = Math.floor(Math.random() * NB_VOIES);

  const voies = [];
  for (let v = 0; v < NB_VOIES; v++) {
    if (v !== voieLibre) voies.push(v);
  }
  if (nombre === 1) voies.splice(Math.floor(Math.random() * 2), 1);

  for (const voie of voies) {
    creerObstacle(voie);
  }
}

function creerObstacle(voie) {
  obstacles.push({
    voie: voie,
    x: centreVoie(voie),
    y: -VOITURE_HAUTEUR - 10 - Math.random() * 40, // juste au-dessus du Canvas
    vitesse: kmhVersPx(VITESSE_TRAFIC_KMH),
    vx: 0,
    angle: 0,
    rotation: 0,
    accidente: false,
    compte: false,
    ecartMin: Infinity, // plus petit écart latéral avec le joueur (frôlement)
    image: imagesAdverses[Math.floor(Math.random() * imagesAdverses.length)]
  });
}

function deplacerObstacles(dt) {
  for (const o of obstacles) {
    o.y += (joueur.vitesse - o.vitesse) * dt;
    if (o.accidente) {
      // Glissade avec frottement après le choc
      o.vitesse = ralentirParFrottement(o.vitesse, dt);
      o.vx = ralentirParFrottement(o.vx, dt);
      o.x += o.vx * dt;
      o.angle += o.rotation * dt;
      o.rotation *= Math.exp(-2.5 * dt);
    }
  }
  // On supprime les voitures sorties de l'écran (en bas, ou en haut si le joueur est arrêté)
  obstacles = obstacles.filter(function (o) {
    return o.y < HAUTEUR + 20 && o.y > -HAUTEUR;
  });
}

// Un obstacle est évité quand il est entièrement passé sous la voiture du joueur
function verifierObstaclesEvites() {
  for (const o of obstacles) {
    if (!o.compte && !o.accidente && o.y > joueur.y + VOITURE_HAUTEUR) {
      o.compte = true; // un seul passage compté par obstacle
      voituresEvitees++;
      augmenterSerie();
      // Points = 1 × multiplicateur de combo, doublés pendant le nitro
      let points = multiplicateur() * (nitro.actif ? 2 : 1);
      if (o.ecartMin < SEUIL_FROLEMENT) {
        points += POINTS_FROLEMENT * (nitro.actif ? 2 : 1);
        declencherFrolement(o);
      } else {
        sonDepassement();
      }
      ajouterPoints(points, joueur.x, joueur.y - 10);
    }
  }
}

/* Collision de deux rectangles : ils se touchent si aucun n'est entièrement
   à gauche, à droite, au-dessus ou en dessous de l'autre. */
function rectangle(voiture) {
  const margeX = 5;
  const margeY = 4;
  return {
    gauche: voiture.x - VOITURE_LARGEUR / 2 + margeX,
    droite: voiture.x + VOITURE_LARGEUR / 2 - margeX,
    haut: voiture.y + margeY,
    bas: voiture.y + VOITURE_HAUTEUR - margeY
  };
}

function seChevauchent(a, b) {
  return !(a.droite < b.gauche || a.gauche > b.droite || a.bas < b.haut || a.haut > b.bas);
}

function verifierCollisions() {
  const rectJoueur = rectangle(joueur);
  for (const o of obstacles) {
    if (seChevauchent(rectJoueur, rectangle(o))) {
      declencherAccident(o);
      return;
    }
  }
}

/* Choc : conservation de la quantité de mouvement (masses égales) avec un
   coefficient de restitution e (choc partiellement élastique). */
function declencherAccident(obstacle) {
  const e = 0.3;
  const v1 = joueur.vitesse;
  const v2 = obstacle.vitesse;
  const vitesseImpact = v1 - v2;

  joueur.vitesse = (v1 + v2 - e * vitesseImpact) / 2;
  obstacle.vitesse = (v1 + v2 + e * vitesseImpact) / 2;

  // Un choc décentré fait tourner les deux voitures (moment de la force)
  const decalage = (joueur.x - obstacle.x) / VOITURE_LARGEUR; // entre -1 et 1
  const sens = decalage === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(decalage);
  const force = vitesseImpact / 200;
  joueur.rotation = sens * (1.5 + Math.abs(decalage) * 3) * force;
  obstacle.rotation = -joueur.rotation * 0.8;
  joueur.vx = joueur.vx * 0.5 + sens * 60 * force;
  obstacle.vx = -sens * 50 * force;
  obstacle.accidente = true;

  tremblement = 10;
  vibrer([60, 40, 120]);
  nitro.actif = false;
  ralentiRestant = 0.6;
  creerEtincelles(joueur.x - decalage * 10, obstacle.y + VOITURE_HAUTEUR - 4, 40);
  sonAccident(vitesseImpact / 500);
  couperSonsContinus();

  etat = "accident";
  dureeAccident = 0;
  zoneMessage.classList.add("perdu");
  afficherMessage("Partie terminée !");
}

// Frottement de glissement : décélération constante μ·g, jusqu'à l'arrêt
function ralentirParFrottement(vitesse, dt) {
  const deceleration = ADHERENCE * G * PX_PAR_METRE * dt;
  if (Math.abs(vitesse) <= deceleration) return 0;
  return vitesse - Math.sign(vitesse) * deceleration;
}

function mettreAJourAccident(dt) {
  dureeAccident += dt;
  // Toute la voiture glisse : le crissement suit la vitesse de glissement
  const vitesseGlissement = Math.hypot(joueur.vitesse, joueur.vx) + Math.abs(joueur.rotation) * 40;
  lisserGlisse(limiter(vitesseGlissement / kmhVersPx(45), 0, 1), dt);
  if (joueur.vitesse > 1 || Math.abs(joueur.rotation) > 0.2) laisserTraces(dt);
  joueur.vitesse = ralentirParFrottement(joueur.vitesse, dt);
  joueur.vx = ralentirParFrottement(joueur.vx, dt);
  joueur.x += joueur.vx * dt;
  joueur.angle += joueur.rotation * dt;
  joueur.rotation *= Math.exp(-2.5 * dt);

  // Rebond sur les bords de la route
  const minX = ROUTE_GAUCHE + VOITURE_LARGEUR / 2;
  const maxX = ROUTE_GAUCHE + ROUTE_LARGEUR - VOITURE_LARGEUR / 2;
  if (joueur.x < minX || joueur.x > maxX) {
    joueur.x = limiter(joueur.x, minX, maxX);
    joueur.vx = -joueur.vx * 0.3;
  }

  if (Math.random() < 0.5) creerFumee(joueur.x, joueur.y + VOITURE_HAUTEUR * 0.3);

  const arrete = joueur.vitesse < 5 && Math.abs(joueur.rotation) < 0.3;
  if ((arrete && dureeAccident > 1.2) || dureeAccident > 3) {
    terminerPartie();
  }
}

/* Particules (étincelles et fumée) : mouvement uniformément accéléré */
function creerEtincelles(x, y, nombre) {
  for (let i = 0; i < nombre; i++) {
    const angle = Math.random() * Math.PI * 2;
    const v = 80 + Math.random() * 260;
    particules.push({
      x, y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      vie: 0.4 + Math.random() * 0.5,
      age: 0,
      taille: 1.5 + Math.random() * 2,
      type: "etincelle"
    });
  }
}

function creerFumee(x, y) {
  particules.push({
    x: x + (Math.random() - 0.5) * 20,
    y: y,
    vx: (Math.random() - 0.5) * 20,
    vy: -20 - Math.random() * 20,
    vie: 1 + Math.random() * 0.6,
    age: 0,
    taille: 8 + Math.random() * 6,
    type: "fumee"
  });
}

function mettreAJourParticules(dt) {
  for (const p of particules) {
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.type === "etincelle") {
      p.vx *= Math.exp(-3 * dt); // frottement de l'air
      p.vy *= Math.exp(-3 * dt);
    } else if (p.type === "flamme") {
      p.taille *= Math.exp(-4 * dt);
    } else if (p.type === "fumee") {
      p.taille += 14 * dt;      // la fumée se dilate
    }
  }
  particules = particules.filter(function (p) {
    return p.age < p.vie;
  });
}

/* ---------- Bonus : score, combos, frôlements, nitro ---------- */
function ajouterPoints(points, x, y) {
  score += points;
  affichageScore.textContent = score;
  ajouterTexteFlottant("+" + points, x, y, "#ffffff", 20);
}

function multiplicateur() {
  return Math.min(MULTIPLICATEUR_MAX, 1 + Math.floor(serie / VOITURES_PAR_NIVEAU));
}

function augmenterSerie() {
  const avant = multiplicateur();
  serie++;
  const apres = multiplicateur();
  if (apres > avant) {
    animationCombo = 1;
    multiplicateurMaxPartie = Math.max(multiplicateurMaxPartie, apres);
    ajouterTexteFlottant("COMBO ×" + apres, LARGEUR / 2, HAUTEUR * 0.35, "#ffd23f", 34);
    sonCombo(apres);
  }
}

// Un changement de voie est « inutile » si aucune voiture n'arrive dans la voie quittée
function verifierChangementUtile() {
  if (etat !== "jeu" || serie === 0) return;
  for (const o of obstacles) {
    const arrive = o.y + VOITURE_HAUTEUR > joueur.y - ZONE_DANGER && o.y < joueur.y + VOITURE_HAUTEUR;
    if (!o.compte && o.voie === joueur.voie && arrive) return; // utile
  }
  if (multiplicateur() > 1) {
    ajouterTexteFlottant("Combo perdu", joueur.x, joueur.y - 30, "#ff7a7a", 18);
    sonComboPerdu();
  }
  serie = 0;
}

/* Écart latéral entre les carrosseries tant que les deux voitures sont côte à côte.
   On garde le minimum : s'il est très petit quand la voiture est dépassée, c'est un frôlement. */
function mesurerEcartsLateraux() {
  if (etat !== "jeu") return;
  for (const o of obstacles) {
    const coteACote = o.y < joueur.y + VOITURE_HAUTEUR && o.y + VOITURE_HAUTEUR > joueur.y;
    if (!o.compte && coteACote) {
      const ecart = Math.abs(o.x - joueur.x) - VOITURE_LARGEUR;
      o.ecartMin = Math.min(o.ecartMin, ecart);
    }
  }
}

function declencherFrolement(obstacle) {
  nbFrolements++;
  serie++; // un frôlement compte double dans la série
  nitro.jauge = Math.min(1, nitro.jauge + GAIN_JAUGE_FROLEMENT);
  ralentiRestant = DUREE_RALENTI;
  tremblement = Math.max(tremblement, 3);
  ajouterTexteFlottant("FRÔLÉ !", (joueur.x + obstacle.x) / 2, joueur.y - 40, "#5ee7ff", 30);
  creerEtincelles((joueur.x + obstacle.x) / 2, joueur.y + VOITURE_HAUTEUR / 2, 10);
  sonFrolement();
  vibrer(25);
}

function activerNitro() {
  if (etat !== "jeu" || nitro.actif || nitro.jauge < 1) return;
  nitro.actif = true;
  nitro.restant = NITRO_DUREE;
  nitro.jauge = 0;
  tremblement = Math.max(tremblement, 4);
  ajouterTexteFlottant("NITRO !", LARGEUR / 2, HAUTEUR * 0.45, "#ff9a3c", 36);
  sonNitro();
  vibrer(40);
}

function mettreAJourNitro(dt) {
  if (nitro.actif) {
    nitro.restant -= dt;
    nitro.jauge = Math.max(0, nitro.restant / NITRO_DUREE); // la jauge se vide
    if (nitro.restant <= 0) {
      nitro.actif = false;
      nitro.jauge = 0;
    }
    // Flammes à l'échappement et lignes de vitesse
    if (Math.random() < 0.6) creerFlamme();
    if (Math.random() < 0.35) creerLigneVent();
  } else if (etat === "jeu") {
    nitro.jauge = Math.min(1, nitro.jauge + NITRO_RECHARGE * dt);
  }
}

function creerFlamme() {
  const cote = Math.random() < 0.5 ? -1 : 1;
  particules.push({
    x: joueur.x + cote * 9 + (Math.random() - 0.5) * 3,
    y: joueur.y + VOITURE_HAUTEUR - 2,
    vx: (Math.random() - 0.5) * 30 - joueur.vx * 0.3,
    vy: 260 + Math.random() * 120,
    vie: 0.18 + Math.random() * 0.1,
    age: 0,
    taille: 5 + Math.random() * 3,
    type: "flamme"
  });
}

function creerLigneVent() {
  particules.push({
    x: Math.random() * LARGEUR,
    y: -40,
    vx: 0,
    vy: 1400 + Math.random() * 400,
    vie: 0.5,
    age: 0,
    taille: 30 + Math.random() * 40,
    type: "vent"
  });
}

function ajouterTexteFlottant(texte, x, y, couleur, taille) {
  textesFlottants.push({ texte, x, y, couleur, taille, age: 0, vie: 0.9 });
}

function mettreAJourTextesFlottants(dt) {
  for (const t of textesFlottants) {
    t.age += dt;
    t.y -= 45 * dt;
  }
  textesFlottants = textesFlottants.filter(function (t) {
    return t.age < t.vie;
  });
}

function mettreAJourBoutonNitro() {
  const charge = Math.round(nitro.jauge * 100);
  if (charge === derniereChargeAffichee) return;
  derniereChargeAffichee = charge;
  boutonNitro.style.setProperty("--charge", charge + "%");
  boutonNitro.classList.toggle("pret", charge >= 100 && !nitro.actif);
}

/* ---------- 8. Dessin ---------- */
function dessinerScene() {
  ctx.clearRect(0, 0, LARGEUR, HAUTEUR);
  ctx.save();
  if (tremblement > 0.3) {
    ctx.translate((Math.random() - 0.5) * tremblement, (Math.random() - 0.5) * tremblement);
  }
  dessinerRoute();
  dessinerTraces();
  for (const o of obstacles) {
    dessinerVoiture(o.image, o.x, o.y, o.angle);
  }
  dessinerVoiture(imageJoueur, joueur.x, joueur.y, joueur.angle);
  dessinerParticules();
  dessinerAmbiance();
  dessinerTextesFlottants();
  ctx.restore();
  dessinerInterfaceJeu();
  dessinerTexteSurCanvas();
  mettreAJourCompteurVitesse();
}

/* Cycle jour / nuit : position dans le cycle selon la distance parcourue.
   Renvoie l'obscurité (0 = plein jour, 1 = nuit) et une teinte de ciel. */
function ambiance() {
  const position = ((defilement / PX_PAR_METRE) / LONGUEUR_CYCLE_M) % 1;
  const lisser = function (k) {
    return k * k * (3 - 2 * k);
  };
  if (position < 0.25) return { obscurite: 0, teinte: null };
  if (position < 0.4) {
    const k = (position - 0.25) / 0.15;           // coucher de soleil
    return { obscurite: lisser(k), teinte: [255, 110, 30, 0.28 * Math.sin(Math.PI * k)] };
  }
  if (position < 0.75) return { obscurite: 1, teinte: null };
  if (position < 0.9) {
    const k = (position - 0.75) / 0.15;           // aube
    return { obscurite: 1 - lisser(k), teinte: [255, 120, 170, 0.22 * Math.sin(Math.PI * k)] };
  }
  return { obscurite: 0, teinte: null };
}

function dessinerAmbiance() {
  const { obscurite, teinte } = ambiance();

  if (teinte) {
    ctx.fillStyle = "rgba(" + teinte[0] + ", " + teinte[1] + ", " + teinte[2] + ", " + teinte[3] + ")";
    ctx.fillRect(-20, -20, LARGEUR + 40, HAUTEUR + 40);
  }
  if (obscurite < 0.02) return;

  // 1. Obscurité sur un calque séparé
  ctxNuit.globalCompositeOperation = "source-over";
  ctxNuit.clearRect(0, 0, LARGEUR, HAUTEUR);
  ctxNuit.fillStyle = "rgba(3, 6, 24, " + 0.9 * obscurite + ")";
  ctxNuit.fillRect(0, 0, LARGEUR, HAUTEUR);

  // 2. On « efface » l'obscurité là où les phares éclairent
  ctxNuit.globalCompositeOperation = "destination-out";
  decouperPhares(joueur.x, joueur.y, joueur.angle, 1);
  for (const o of obstacles) {
    decouperPhares(o.x, o.y, o.angle, 0.75);
  }
  ctxNuit.globalCompositeOperation = "source-over";
  ctx.drawImage(calqueNuit, 0, 0, LARGEUR, HAUTEUR);

  // 3. Halos lumineux : feux arrière rouges et ampoules des phares
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  dessinerFeux(joueur.x, joueur.y, joueur.angle, obscurite);
  for (const o of obstacles) {
    dessinerFeux(o.x, o.y, o.angle, obscurite);
  }
  ctx.restore();
}

// Deux cônes de lumière devant la voiture + une faible lueur autour d'elle
function decouperPhares(x, y, angle, intensite) {
  const c = ctxNuit;
  c.save();
  c.translate(x, y + VOITURE_HAUTEUR / 2);
  c.rotate(angle);
  const avant = -VOITURE_HAUTEUR / 2 + 6;
  const portee = 230;

  const degrade = c.createLinearGradient(0, avant, 0, avant - portee);
  degrade.addColorStop(0, "rgba(0, 0, 0, " + intensite + ")");
  degrade.addColorStop(0.6, "rgba(0, 0, 0, " + 0.55 * intensite + ")");
  degrade.addColorStop(1, "rgba(0, 0, 0, 0)");
  c.fillStyle = degrade;
  for (const cote of [-1, 1]) {
    c.beginPath();
    c.moveTo(cote * 12 - 5, avant);
    c.lineTo(cote * 12 + 5, avant);
    c.lineTo(cote * 12 + 48, avant - portee);
    c.lineTo(cote * 12 - 48, avant - portee);
    c.closePath();
    c.fill();
  }

  const lueur = c.createRadialGradient(0, 0, 10, 0, 0, VOITURE_HAUTEUR * 0.75);
  lueur.addColorStop(0, "rgba(0, 0, 0, " + 0.55 * intensite + ")");
  lueur.addColorStop(1, "rgba(0, 0, 0, 0)");
  c.fillStyle = lueur;
  c.beginPath();
  c.arc(0, 0, VOITURE_HAUTEUR * 0.75, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function dessinerFeux(x, y, angle, obscurite) {
  ctx.save();
  ctx.translate(x, y + VOITURE_HAUTEUR / 2);
  ctx.rotate(angle);
  for (const cote of [-1, 1]) {
    halo(cote * 14, VOITURE_HAUTEUR / 2 - 6, 11, "255, 30, 30", 0.85 * obscurite);  // feu arrière
    halo(cote * 13, -VOITURE_HAUTEUR / 2 + 7, 9, "255, 245, 200", 0.9 * obscurite); // phare
  }
  ctx.restore();
}

function halo(x, y, rayon, rgb, alpha) {
  const degrade = ctx.createRadialGradient(x, y, 0, x, y, rayon);
  degrade.addColorStop(0, "rgba(" + rgb + ", " + alpha + ")");
  degrade.addColorStop(1, "rgba(" + rgb + ", 0)");
  ctx.fillStyle = degrade;
  ctx.beginPath();
  ctx.arc(x, y, rayon, 0, Math.PI * 2);
  ctx.fill();
}

// roundRect n'existe pas sur les navigateurs anciens : simple rectangle à la place
function rectangleArrondi(x, y, largeur, hauteur, rayon) {
  if (ctx.roundRect) ctx.roundRect(x, y, largeur, hauteur, rayon);
  else ctx.rect(x, y, largeur, hauteur);
}

function dessinerTextesFlottants() {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const t of textesFlottants) {
    const restant = 1 - t.age / t.vie;
    const grossissement = 1 + 0.4 * Math.max(0, 1 - t.age / 0.15);
    ctx.font = "900 " + Math.round(t.taille * grossissement) + "px Arial";
    ctx.globalAlpha = restant;
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.7)";
    ctx.strokeText(t.texte, t.x, t.y);
    ctx.fillStyle = t.couleur;
    ctx.fillText(t.texte, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

// Multiplicateur de combo (herbe à gauche) et jauge de nitro (herbe à droite)
function dessinerInterfaceJeu() {
  if (etat !== "jeu" && etat !== "accident") return;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Combo
  const mult = multiplicateur();
  const xCombo = ROUTE_GAUCHE / 2;
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.beginPath();
  rectangleArrondi(5, 8, ROUTE_GAUCHE - 10, 62, 10);
  ctx.fill();
  ctx.font = "900 " + Math.round(24 * (1 + 0.5 * animationCombo)) + "px Arial";
  ctx.fillStyle = mult > 1 ? "#ffd23f" : "#ffffff";
  ctx.fillText("×" + mult, xCombo, 32);
  const progression = mult >= MULTIPLICATEUR_MAX ? 1 : (serie % VOITURES_PAR_NIVEAU) / VOITURES_PAR_NIVEAU;
  ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
  ctx.fillRect(12, 56, ROUTE_GAUCHE - 24, 5);
  ctx.fillStyle = "#ffd23f";
  ctx.fillRect(12, 56, (ROUTE_GAUCHE - 24) * progression, 5);

  // Nitro
  const xJauge = LARGEUR - ROUTE_GAUCHE / 2;
  const hauteurJauge = 110;
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.beginPath();
  rectangleArrondi(LARGEUR - ROUTE_GAUCHE + 5, 8, ROUTE_GAUCHE - 10, hauteurJauge + 34, 10);
  ctx.fill();
  ctx.font = "bold 10px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("NITRO", xJauge, 20);
  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.fillRect(xJauge - 7, 30, 14, hauteurJauge);
  const plein = nitro.jauge >= 1 && !nitro.actif;
  const clignote = plein && Math.floor(performance.now() / 250) % 2 === 0;
  ctx.fillStyle = nitro.actif ? "#5ee7ff" : (clignote ? "#ffffff" : "#ff9a3c");
  const h = hauteurJauge * nitro.jauge;
  ctx.fillRect(xJauge - 7, 30 + hauteurJauge - h, 14, h);
}

function dessinerRoute() {
  // L'image de route (360 x 1080) se raccorde parfaitement en haut et en bas
  const hauteurTuile = 1080;
  const decalage = defilement % hauteurTuile;
  if (imagePrete(imageRoute)) {
    ctx.drawImage(imageRoute, 0, decalage - hauteurTuile, LARGEUR, hauteurTuile);
    ctx.drawImage(imageRoute, 0, decalage, LARGEUR, hauteurTuile);
  } else {
    ctx.fillStyle = "#3d8c2a";
    ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
    ctx.fillStyle = "#333";
    ctx.fillRect(ROUTE_GAUCHE, 0, ROUTE_LARGEUR, HAUTEUR);
  }

  // Marquages des 3 voies (pointillés qui défilent avec la route)
  const longueurTrait = 32;
  const periode = 64;
  const decalageTraits = defilement % periode;
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  for (let i = 1; i < NB_VOIES; i++) {
    const x = ROUTE_GAUCHE + LARGEUR_VOIE * i - 2;
    for (let y = decalageTraits - periode; y < HAUTEUR; y += periode) {
      ctx.fillRect(x, y, 4, longueurTrait);
    }
  }
}

function dessinerVoiture(image, xCentre, yHaut, angle) {
  ctx.save();
  ctx.translate(xCentre, yHaut + VOITURE_HAUTEUR / 2);
  ctx.rotate(angle);
  // Ombre portée
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.beginPath();
  ctx.ellipse(4, 6, VOITURE_LARGEUR / 2, VOITURE_HAUTEUR / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  if (imagePrete(image)) {
    ctx.drawImage(image, -VOITURE_LARGEUR / 2, -VOITURE_HAUTEUR / 2, VOITURE_LARGEUR, VOITURE_HAUTEUR);
  } else {
    ctx.fillStyle = image === imageJoueur ? "red" : "royalblue";
    ctx.fillRect(-VOITURE_LARGEUR / 2, -VOITURE_HAUTEUR / 2, VOITURE_LARGEUR, VOITURE_HAUTEUR);
  }
  ctx.restore();
}

function dessinerParticules() {
  for (const p of particules) {
    const restant = 1 - p.age / p.vie;
    if (p.type === "etincelle") {
      ctx.fillStyle = "rgba(255, " + Math.floor(160 + 90 * restant) + ", 60, " + restant + ")";
      ctx.fillRect(p.x, p.y, p.taille, p.taille);
    } else if (p.type === "flamme") {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const vert = Math.floor(120 + 120 * restant);
      const bleu = restant > 0.75 ? 255 : 40;
      ctx.fillStyle = "rgba(255, " + vert + ", " + bleu + ", " + 0.8 * restant + ")";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.taille, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (p.type === "vent") {
      ctx.strokeStyle = "rgba(255, 255, 255, " + 0.35 * restant + ")";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, p.y - p.taille);
      ctx.stroke();
    } else {
      ctx.fillStyle = "rgba(90, 90, 90, " + 0.45 * restant + ")";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.taille, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function dessinerTexteSurCanvas() {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (etat === "compte") {
    const nombre = Math.ceil(compteARebours);
    const progression = compteARebours - Math.floor(compteARebours);
    ctx.font = "bold " + Math.round(60 + 40 * progression) + "px Arial";
    ctx.fillStyle = "rgba(255, 210, 63, " + (0.4 + 0.6 * progression) + ")";
    ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
    ctx.lineWidth = 6;
    ctx.strokeText(nombre, LARGEUR / 2, HAUTEUR / 2 - 40);
    ctx.fillText(nombre, LARGEUR / 2, HAUTEUR / 2 - 40);
  } else if (etat === "attente" || etat === "fini") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, HAUTEUR / 2 - 90, LARGEUR, etat === "fini" ? 175 : 150);
    ctx.fillStyle = etat === "fini" ? "#ff5a5a" : "#ffd23f";
    ctx.font = "bold 30px Arial";
    ctx.fillText(etat === "fini" ? "Partie terminée" : "Prêt ?", LARGEUR / 2, HAUTEUR / 2 - 55);
    ctx.fillStyle = "#ffffff";
    ctx.font = "18px Arial";
    if (etat === "fini") {
      ctx.fillText("Score : " + score + "   •   Record : " + record, LARGEUR / 2, HAUTEUR / 2 - 18);
      ctx.font = "15px Arial";
      ctx.fillStyle = "#ffd23f";
      ctx.fillText("Combo max ×" + multiplicateurMaxPartie + "   •   Frôlements : " + nbFrolements, LARGEUR / 2, HAUTEUR / 2 + 12);
      ctx.fillStyle = "#ffffff";
      ctx.font = "16px Arial";
      ctx.fillText("Touchez l'écran ou appuyez sur Espace", LARGEUR / 2, HAUTEUR / 2 + 50);
    } else {
      ctx.fillText("Glissez ← → pour changer de voie", LARGEUR / 2, HAUTEUR / 2 - 18);
      ctx.fillText("Glissez ↑ pour le NITRO", LARGEUR / 2, HAUTEUR / 2 + 8);
      ctx.font = "16px Arial";
      ctx.fillText("Touchez l'écran ou appuyez sur Espace", LARGEUR / 2, HAUTEUR / 2 + 40);
    }
  }
}

function mettreAJourCompteurVitesse() {
  const kmh = Math.round(pxVersKmh(joueur.vitesse));
  if (kmh !== derniereVitesseAffichee) {
    derniereVitesseAffichee = kmh;
    affichageVitesse.textContent = kmh;
  }
}

/* ---------- 9. Boucle d'animation ---------- */
function boucle(temps) {
  // Temps écoulé depuis l'image précédente, limité si l'onglet était caché
  let dt = (temps - tempsPrecedent) / 1000;
  tempsPrecedent = temps;
  dt = Math.min(dt, 0.1);

  // Ralenti (frôlement, accident) : le temps du jeu s'écoule moins vite
  if (ralentiRestant > 0) {
    ralentiRestant -= dt;
    dt *= ECHELLE_RALENTI;
  }

  // Pas fixe : la physique est la même à 60 Hz, 120 Hz ou 144 Hz
  reservoirTemps += dt;
  while (reservoirTemps >= PAS_PHYSIQUE) {
    mettreAJour(PAS_PHYSIQUE);
    reservoirTemps -= PAS_PHYSIQUE;
  }

  if (etat === "compte" || etat === "jeu") {
    mettreAJourSonContinu(joueur.vitesse / PX_PAR_METRE, joueur.accelerateur, joueur.ax, true);
  }
  if (etat === "compte" || etat === "jeu" || etat === "accident") {
    mettreAJourSonPneus(joueur.glisse, Math.hypot(joueur.vitesse, joueur.vx) / PX_PAR_METRE);
  } else {
    mettreAJourSonPneus(0, 0);
  }
  mettreAJourBoutonNitro();

  dessinerScene();

  if (etat === "fini") {
    idAnimation = null; // la boucle s'arrête
  } else {
    idAnimation = requestAnimationFrame(boucle);
  }
}

function lancerPartie() {
  initialiserSon();

  // Une seule boucle à la fois : on annule l'éventuelle boucle précédente
  if (idAnimation !== null) {
    cancelAnimationFrame(idAnimation);
    idAnimation = null;
  }

  reinitialiserPartie();
  etat = "compte";
  compteARebours = 3;
  jouerBip(523, 0.25, "square", 0.12);
  afficherMessage("Préparez-vous…");
  boutonRecommencer.textContent = "Recommencer";

  reservoirTemps = 0;
  idAnimation = requestAnimationFrame(function (temps) {
    tempsPrecedent = temps;
    boucle(temps);
  });
}

function terminerPartie() {
  etat = "fini";
  couperSonsContinus();
  if (score > record) {
    record = score;
    ecrireStockage("recordVoiture", String(record));
    affichageRecord.textContent = record;
    afficherMessage("Partie terminée — nouveau record : " + score + " !");
    jouerBip(784, 0.2, "triangle", 0.15);
    jouerBip(1046, 0.3, "triangle", 0.15, 0.15);
    jouerBip(1318, 0.5, "triangle", 0.15, 0.3);
  } else {
    afficherMessage("Partie terminée — score : " + score + ". Appuyez sur Recommencer.");
  }
}

// Vibration du téléphone (si le navigateur l'autorise)
function vibrer(motif) {
  try {
    if (navigator.vibrate) navigator.vibrate(motif);
  } catch (e) {
    /* non disponible : on ignore */
  }
}

function afficherMessage(texte) {
  zoneMessage.textContent = texte;
}

// Couper le son quand l'onglet est caché
document.addEventListener("visibilitychange", function () {
  if (!son.contexte) return;
  if (document.hidden) son.contexte.suspend();
  else son.contexte.resume();
});
