"use strict";

/* =====================================================================
   JEU DE VOITURE — Canvas 2D
   Organisation du fichier :
     1. Récupération des éléments HTML
     2. Constantes (dimensions, physique)
     3. Chargement des images
     4. Sons (Web Audio API, sons synthétisés : aucun fichier externe)
     5. État du jeu (joueur, obstacles, score…)
     5bis. Écrans HTML : accueil, choix du mode, règles, fin de partie
     6. Commandes : clavier, boutons, swipe et toucher (écran tactile)
     7. Physique : moteur, direction, trafic, collisions, accident
     8. Dessin de la scène
     9. Boucle d'animation, démarrage et fin de partie
   Bonus : nitro, frôlements, combos, cycle jour / nuit avec phares,
           météo (pluie, verglas) qui change l'adhérence des pneus,
           difficultés et records par joueur / mode
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

/* Écrans HTML (le designer fournit ce markup ; on reste tolérant s'il manque) */
const ecrans = document.getElementById("ecrans");
const ecranAccueil = document.getElementById("ecranAccueil");
const nomJoueurChamp = document.getElementById("nomJoueur");
const erreurNom = document.getElementById("erreurNom");
const boutonContinuer = document.getElementById("boutonContinuer");
const nomsRecents = document.getElementById("nomsRecents");
const ecranChoixMode = document.getElementById("ecranChoixMode");
const joueurActuel = document.getElementById("joueurActuel");
const boutonChangerJoueur = document.getElementById("boutonChangerJoueur");
const cartesModes = document.getElementById("cartesModes");
const ecranRegles = document.getElementById("ecranRegles");
const reglesTitre = document.getElementById("reglesTitre");
const reglesTexte = document.getElementById("reglesTexte");
const caseNePlusAfficher = document.getElementById("caseNePlusAfficher");
const boutonFermerRegles = document.getElementById("boutonFermerRegles");
const boutonLancerMode = document.getElementById("boutonLancerMode");
const ecranFin = document.getElementById("ecranFin");
const finTitre = document.getElementById("finTitre");
const finResultat = document.getElementById("finResultat");
const finDetails = document.getElementById("finDetails");
const finMessage = document.getElementById("finMessage");
const boutonRejouer = document.getElementById("boutonRejouer");
const boutonChangerMode = document.getElementById("boutonChangerMode");
const boutonChangerJoueurFin = document.getElementById("boutonChangerJoueurFin");
const radiosDifficulte = document.querySelectorAll('input[name="difficulte"]');


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
// Force max transmissible sur route sèche (N) ; en jeu on utilise forceAdherence()
const FORCE_ADHERENCE = ADHERENCE * MASSE * G;
const COEF_TRAINEE = 0.5 * 1.2 * 0.32 * 2.2;            // ½ ρ Cx S  (N par (m/s)²)
const FORCE_ROULEMENT = 0.012 * MASSE * G;              // résistance au roulement (N)
const FORCE_FREIN_MAX = 0.8 * MASSE * G;                // freinage (N)

// Physique latérale (changement de voie) : ressort amorti
const RAIDEUR = 130;            // 1/s²
const AMORTISSEMENT = 19;       // 1/s
const ACCEL_LATERALE_MAX = 2600;// px/s² sur route sèche (proportionnel à l'adhérence)

// Vitesse du trafic (km/h) : commune à tous les modes
const VITESSE_TRAFIC_KMH = 50;

/* Difficultés : un seul tableau à modifier pour régler le jeu.
   Les champs non encore utilisés (reflexeRivaux, tempsCheckpoint) sont prêts
   pour les modes à rivaux / chrono. */
const DIFFICULTES = {
  facile:    { nom: "Facile",    vitesseDepart: 70,  vitesseMax: 140, densiteTrafic: 0.7, probabiliteVerglas: 0.15, reflexeRivaux: 0.6, tempsCheckpoint: 20, multiplicateurScore: 0.8 },
  normal:    { nom: "Normal",    vitesseDepart: 90,  vitesseMax: 180, densiteTrafic: 1,   probabiliteVerglas: 0.3,  reflexeRivaux: 0.4, tempsCheckpoint: 15, multiplicateurScore: 1 },
  difficile: { nom: "Difficile", vitesseDepart: 110, vitesseMax: 220, densiteTrafic: 1.3, probabiliteVerglas: 0.5,  reflexeRivaux: 0.2, tempsCheckpoint: 10, multiplicateurScore: 1.3 }
};

/* Modes de jeu. Ajouter un mode = ajouter une entrée ici (+ d'éventuels
   réglages dans les crochets preparerMode / mettreAJourMode / verifierFinMode). */
const MODES = {
  esquive: {
    nom: "Esquive",
    icone: "🚗💨",
    but: "Évite le trafic",
    regles: [
      "Évite les voitures qui arrivent sur les 3 voies.",
      "Enchaîne les frôlements pour recharger le nitro et doubler tes points.",
      "Une collision termine la partie : bats ton record !"
    ],
    trafic: true,
    rivaux: false,
    collisionFatale: true,
    distanceCible: null,
    tempsLimite: null,
    score: "points",
    meteo: true,
    disponible: true
  },
  course: {
    nom: "Course",
    icone: "🏁",
    but: "Bats tes rivaux",
    regles: [
      "Affronte des rivaux sur la route.",
      "Franchis la ligne d'arrivée le premier.",
      "Bientôt disponible dans une prochaine version."
    ],
    trafic: true,
    rivaux: true,
    collisionFatale: true,
    distanceCible: 3000,
    tempsLimite: null,
    score: "position",
    meteo: true,
    disponible: true
  },
  chrono: {
    nom: "Chrono",
    icone: "⏱️",
    but: "Bats le chrono",
    regles: [
      "Parcours la distance le plus vite possible.",
      "Chaque seconde compte, sans sortir de la route.",
      "Bientôt disponible dans une prochaine version."
    ],
    trafic: true,
    rivaux: false,
    collisionFatale: true,
    distanceCible: 2000,
    tempsLimite: 90,
    score: "temps",
    meteo: true,
    disponible: false
  },
  zen: {
    nom: "Zen",
    icone: "🌿",
    but: "Roule sans pression",
    regles: [
      "Aucune collision fatale : roule à ton rythme.",
      "Parcours la plus grande distance possible.",
      "Bientôt disponible dans une prochaine version."
    ],
    trafic: true,
    rivaux: false,
    collisionFatale: false,
    distanceCible: null,
    tempsLimite: null,
    score: "distance",
    meteo: true,
    disponible: false
  },
  defi: {
    nom: "Défi",
    icone: "🎯",
    but: "Un objectif surprise",
    regles: [
      "Un défi différent à chaque partie.",
      "Remplis l'objectif avant la fin du temps.",
      "Bientôt disponible dans une prochaine version."
    ],
    trafic: true,
    rivaux: false,
    collisionFatale: true,
    distanceCible: 1500,
    tempsLimite: 60,
    score: "points",
    meteo: true,
    disponible: false
  }
};

/* ---------- Course : constantes et personnalités des pilotes ----------
   Tout ce qui règle la course est regroupé ici pour être expliqué à l'oral. */
const COURSE_DISTANCE_M = 3000;        // 3 km
const COURSE_DENSITE_TRAFIC = 0.6;     // trafic civil moins dense qu'en Esquive
const COURSE_PENALITE_S = 2;           // pénalité après un choc avec le trafic
const COURSE_DEMARRAGE_FEUX = 5;       // feux rouges de la grille

const PILOTES = {
  rapide:   { nom: "Rapide",   agressivite: 0.9, reflexes: 1.15, risque: 0.9,  nitro: true,  pluieFacteur: 1,    couleur: "#ff5b5b" },
  prudent:  { nom: "Prudent",  agressivite: 0.25, reflexes: 1.35, risque: 0.15, nitro: false, pluieFacteur: 0.9,  couleur: "#5b9dff" },
  regulier: { nom: "Régulier", agressivite: 0.55, reflexes: 1,    risque: 0.35, nitro: false, pluieFacteur: 1,    couleur: "#ffd23f" }
};

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

/* Météo : chaque temps change le coefficient d'adhérence μ des pneus.
   Valeurs réelles approximatives : asphalte sec 0,8-1 ; mouillé 0,5-0,6 ; verglas 0,1-0,2.
   - vitesseMax : un conducteur prudent (ici le régulateur) ralentit ;
   - crissement : un pneu crisse fort sur le sec, à peine sur le mouillé, pas sur la glace ;
   - traces : la gomme laisse des traces sur le sec, presque pas ailleurs. */
const METEOS = {
  sec:     { nom: "ROUTE SÈCHE", conseil: "Bonne adhérence",               adherence: 0.9,  vitesseMax: 1,    crissement: 1,    traces: 1 },
  pluie:   { nom: "PLUIE",       conseil: "Route mouillée : anticipez !",  adherence: 0.55, vitesseMax: 0.82, crissement: 0.35, traces: 0.3 },
  verglas: { nom: "VERGLAS",     conseil: "La voiture glisse : douceur !", adherence: 0.2,  vitesseMax: 0.65, crissement: 0.08, traces: 0.05 }
};
const DISTANCE_PREMIERE_METEO_M = 900;   // première averse après ≈ 25 s
const DISTANCE_ENTRE_METEOS_M = 1300;
const ADHERENCE_FLAQUE = 0.1;            // aquaplaning : les pneus flottent sur l'eau
const ADHERENCE_PLAQUE = 0.06;           // plaque de verglas

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

// Images secondaires (SVG) : le jeu fonctionne même si elles manquent
function chargerImageSecondaire(chemin) {
  const image = new Image();
  image.addEventListener("error", function () {
    console.warn("Image secondaire introuvable :", chemin);
  });
  image.src = chemin;
  return image;
}
const imagesMeteo = {
  sec: chargerImageSecondaire("images/meteo/soleil.svg"),
  pluie: chargerImageSecondaire("images/meteo/pluie.svg"),
  verglas: chargerImageSecondaire("images/meteo/verglas.svg")
};
const imagePanneauGlissant = chargerImageSecondaire("images/meteo/panneau-glissant.svg");
const imageFlaque = chargerImageSecondaire("images/meteo/flaque.svg");
const imagePlaqueVerglas = chargerImageSecondaire("images/meteo/plaque-verglas.svg");

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
  son.pluie = creerBruitContinu(ac, "highpass", 1800, 0.4);       // averse
  son.chausseeMouillee = creerBruitContinu(ac, "bandpass", 900, 0.6); // pneus dans l'eau
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

  // Pluie : bruit de l'averse + « chhhh » des pneus qui chassent l'eau (∝ vitesse)
  const pluie = meteo.intensitePluie;
  son.pluie.gain.gain.setTargetAtTime(enMarche ? 0.09 * pluie : 0, t, 0.3);
  son.chausseeMouillee.gain.gain.setTargetAtTime(enMarche ? 0.16 * pluie * limiter(vitesseMs / 40, 0, 1) : 0, t, 0.2);
}

/* Chaque rival a son propre moteur : hauteur différente, volume selon la distance. */
function mettreAJourSonRivaux() {
  if (!son.contexte || modeActuel !== "course" || !course) return;
  const ac = son.contexte;
  const t = ac.currentTime;
  if (!son.rivauxMoteurs) son.rivauxMoteurs = [];
  while (son.rivauxMoteurs.length < rivaux.length) {
    const osc = ac.createOscillator();
    osc.type = "sawtooth";
    const gain = ac.createGain();
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(son.general);
    osc.start();
    son.rivauxMoteurs.push({ osc: osc, gain: gain });
  }
  son.rivauxMoteurs.forEach(function (m, i) {
    const r = rivaux[i];
    if (!r) return;
    const hauteur = [0.92, 1, 1.12][i % 3];
    m.osc.frequency.setTargetAtTime(limiter((r.vitesse / PX_PAR_METRE) * 12 * hauteur, 60, 260), t, 0.05);
    const proche = limiter(1 - Math.abs(r.distance - course.distance) / 60, 0, 1);
    m.gain.gain.setTargetAtTime(proche * 0.035, t, 0.1);
  });
}

function couperSonsContinus() {
  if (son.contexte && son.rivauxMoteurs) {
    son.rivauxMoteurs.forEach(function (m) {
      m.gain.gain.setTargetAtTime(0, son.contexte.currentTime, 0.1);
    });
  }
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
  const meteoSon = facteurMeteo("crissement");
  p.sifflement.gain.setTargetAtTime(0.16 * fort * vacillement * meteoSon, t, reaction);
  p.gainOsc.gain.setTargetAtTime(0.05 * fort * vacillement * meteoSon, t, reaction);
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

// Tonnerre au début d'une averse : grondement grave et long
function sonTonnerre() {
  jouerBruit(2.8, "lowpass", 400, 40, 0.8);
  jouerBruit(0.4, "lowpass", 1500, 200, 0.35);
}

// Verglas : petits tintements cristallins
function sonGivre() {
  for (let i = 0; i < 5; i++) {
    jouerBip(2400 + Math.random() * 2200, 0.25, "sine", 0.05, i * 0.07);
  }
}

function sonRouteSeche() {
  jouerBip(660, 0.15, "triangle", 0.1);
  jouerBip(880, 0.25, "triangle", 0.1, 0.1);
}

// Roue dans une flaque : gros « splash »
function sonFlaque() {
  jouerBruit(0.5, "lowpass", 2500, 300, 0.6);
  jouerBruit(0.25, "bandpass", 1200, 600, 0.35);
}

// Roue sur une plaque de verglas : craquement sec
function sonPlaque() {
  jouerBruit(0.08, "highpass", 4000, 2500, 0.4);
  jouerBip(3200, 0.12, "square", 0.04, 0.03);
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

/* ---------- Préférences, noms et records par joueur / mode ---------- */
const CLE_ANCIEN_RECORD = "recordVoiture";
const CLE_DERNIER_NOM = "dernierNom";
const CLE_NOMS = "nomsJoueurs";
const CLE_DIFFICULTE = "difficulte";
const CLE_DERNIER_MODE = "dernierMode";
const CLE_NE_PLUS_AFFICHER = "nePlusAfficherRegles";

// Nom : 2 à 12 caractères, lettres (accents compris), chiffres, espace ou tiret
const REGEX_NOM = /^[\p{L}\p{N} -]{2,12}$/u;

function nomValide(texte) {
  return REGEX_NOM.test(texte.trim());
}

// Difficulté active (toujours un objet valide, même si le stockage est corrompu)
function difficulte() {
  return DIFFICULTES[difficulteActive] || DIFFICULTES.normal;
}

function cleRecord(mode, nom) {
  return "record." + mode + "." + nom;
}

function lireRecord(mode, nom) {
  if (!nom) return 0;
  return parseInt(lireStockage(cleRecord(mode, nom), "0"), 10) || 0;
}

function ecrireRecord(mode, nom, valeur) {
  if (!nom) return;
  ecrireStockage(cleRecord(mode, nom), String(valeur));
}

/* Migration : au premier nom validé, l'ancien record unique (recordVoiture)
   devient le record du mode Esquive pour ce joueur. */
function migrerAncienRecord(nom) {
  if (!nom) return;
  const cle = cleRecord("esquive", nom);
  if (lireStockage(cle, null) !== null) return;
  const ancien = parseInt(lireStockage(CLE_ANCIEN_RECORD, "0"), 10) || 0;
  if (ancien <= 0) return;
  ecrireRecord("esquive", nom, ancien);
  try {
    localStorage.removeItem(CLE_ANCIEN_RECORD);
  } catch (e) {
    /* stockage indisponible : on ignore */
  }
}

function lireNomsRecents() {
  try {
    const noms = JSON.parse(lireStockage(CLE_NOMS, "[]"));
    if (!Array.isArray(noms)) return [];
    return noms
      .filter(function (nom) { return typeof nom === "string" && nomValide(nom); })
      .slice(0, 3);
  } catch (e) {
    return [];
  }
}

// Mémorise le nom : dernier nom + 3 derniers noms distincts
function memoriserNom(nom) {
  ecrireStockage(CLE_DERNIER_NOM, nom);
  const noms = [nom].concat(lireNomsRecents().filter(function (n) { return n !== nom; })).slice(0, 3);
  ecrireStockage(CLE_NOMS, JSON.stringify(noms));
}

/* ---------- 5. État du jeu ---------- */
// États possibles : "accueil", "choixMode", "compte", "jeu", "accident", "fini"
let etat = "accueil";
let score = 0;
let record = 0;                // record du joueur courant pour le mode courant
let nomJoueur = "";            // nom validé ("" tant que l'accueil n'est pas franchi)
let modeActuel = lireStockage(CLE_DERNIER_MODE, "esquive");
if (!MODES[modeActuel] || !MODES[modeActuel].disponible) modeActuel = "esquive";
let modeEnAttente = null;      // mode dont on lit les règles
let difficulteActive = lireStockage(CLE_DIFFICULTE, "normal");
if (!DIFFICULTES[difficulteActive]) difficulteActive = "normal";
let derniereFinMode = null;    // résultat éventuel de verifierFinMode()
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

/* Météo : on passe progressivement d'un temps à l'autre.
   intensitePluie et intensiteVerglas vont de 0 à 1. */
const meteo = {
  actuelle: "sec",
  intensitePluie: 0,
  intensiteVerglas: 0,
  distanceRestante: DISTANCE_PREMIERE_METEO_M, // mètres avant le prochain changement
  annonce: 0,          // durée restante de l'annonce à l'écran (s)
  surDanger: null      // flaque ou plaque sous les roues (ou null)
};
let dangers = [];        // flaques et plaques de verglas collées à la route
let distanceDanger = 0;  // px parcourus depuis le dernier danger

let obstacles = [];
let particules = [];

/* État propre à la course : temps, pénalités, classement et rivaux. */
let course = null;
let rivaux = [];

affichageRecord.textContent = 0;
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
  joueur.vitesse = kmhVersPx(difficulte().vitesseDepart); // départ lancé
  obstacles = [];
  particules = [];
  traces = [];
  joueur.glisse = 0;
  meteo.actuelle = "sec";
  meteo.intensitePluie = 0;
  meteo.intensiteVerglas = 0;
  meteo.distanceRestante = DISTANCE_PREMIERE_METEO_M;
  meteo.annonce = 0;
  meteo.surDanger = null;
  dangers = [];
  distanceDanger = 0;
  distanceDepuisVague = 0;
  defilement = 0;
  tremblement = 0;
  dureeAccident = 0;
  derniereVitesseAffichee = -1;
  derniereChargeAffichee = -1;
  geste = null;
  son.rapport = 1;
  voituresEvitees = 0;
  serie = 0;
  multiplicateurMaxPartie = 1;
  nbFrolements = 0;
  ralentiRestant = 0;
  animationCombo = 0;
  textesFlottants = [];
  derniereFinMode = null;
  nitro.jauge = 1;
  nitro.actif = false;
  nitro.restant = 0;
  zoneMessage.classList.remove("perdu");
  preparerMode(modeActuel);
}

/* ---------- 5bis. Écrans HTML et navigation ----------
   Un seul point d'entrée par écran : afficherEcran() bascule les attributs
   hidden, les transitions de partie passent par demarrerMode / rejouer. */

// Vrai si un écran HTML recouvre le jeu
function interfaceOuverte() {
  return ecrans !== null && !ecrans.hidden;
}

// Vrai si le clavier doit aller au champ de saisie, pas au jeu
function saisieActive() {
  const actif = document.activeElement;
  return actif !== null && (actif.tagName === "INPUT" || actif.tagName === "TEXTAREA");
}

function afficherEcran(nom) {
  const cibles = { accueil: ecranAccueil, choixMode: ecranChoixMode, regles: ecranRegles, fin: ecranFin };
  const cible = cibles[nom] || null;
  [ecranAccueil, ecranChoixMode, ecranRegles, ecranFin].forEach(function (ecran) {
    if (ecran) ecran.hidden = ecran !== cible;
  });
  if (ecrans) ecrans.hidden = cible === null;
  // L'écran s'appelle « fin », l'état de la machine s'appelle « fini »
  if (nom === "fin") etat = "fini";
  else if (nom !== "regles") etat = nom;
}

function masquerEcrans() {
  // Évite qu'un bouton caché garde le focus (Espace/Entrée pendant la partie)
  const actif = document.activeElement;
  if (actif && actif !== document.body && typeof actif.blur === "function") actif.blur();
  [ecranAccueil, ecranChoixMode, ecranRegles, ecranFin].forEach(function (ecran) {
    if (ecran) ecran.hidden = true;
  });
  if (ecrans) ecrans.hidden = true;
}

// Format lisible mm:ss,centièmes pour les records de temps.
function formatTemps(secondes) {
  if (!secondes || secondes <= 0) return "—";
  const total = Math.round(secondes * 100);
  const centiemes = total % 100;
  const secondesPleines = Math.floor(total / 100);
  const minutes = Math.floor(secondesPleines / 60);
  const reste = secondesPleines % 60;
  return minutes + ":" + String(reste).padStart(2, "0") + "," + String(centiemes).padStart(2, "0");
}

function rafraichirRecordAffiche() {
  const nom = nomJoueur || lireStockage(CLE_DERNIER_NOM, "");
  record = lireRecord(modeActuel, nom);
  affichageRecord.textContent = modeActuel === "course" ? formatTemps(record) : record;
}

/* Fin de course : classement, temps total, pénalités et meilleur temps. */
function terminerCourse() {
  if (!course) return;
  const temps = course.temps + course.penalty;
  const ancien = lireRecord("course", nomJoueur);
  const nouveauRecord = ancien <= 0 || temps < ancien;
  if (nouveauRecord) {
    record = temps;
    ecrireRecord("course", nomJoueur, temps);
    affichageRecord.textContent = formatTemps(temps);
    jouerBip(784, 0.2, "triangle", 0.15);
    jouerBip(1046, 0.3, "triangle", 0.15, 0.15);
  } else {
    record = ancien;
    affichageRecord.textContent = formatTemps(ancien);
  }
  if (finTitre) finTitre.textContent = "Bien joué " + nomJoueur + " : " + course.position + (course.position === 1 ? "er" : "e") + " !";
  if (finResultat) finResultat.textContent = course.position + (course.position === 1 ? "er" : "e") + " / 4";
  if (finDetails) {
    finDetails.textContent = "Temps : " + formatTemps(temps)
      + " • Pénalités : +" + course.penalty.toFixed(0) + " s"
      + " • Distance : " + Math.round(Math.min(COURSE_DISTANCE_M, course.distance)) + " m";
  }
  if (finMessage) {
    finMessage.textContent = nouveauRecord
      ? "Bravo " + nomJoueur + ", nouveau record !"
      : "Meilleur temps : " + formatTemps(ancien);
  }
  afficherMessage("Course terminée — " + course.position + (course.position === 1 ? "er" : "e") + " place !");
  afficherEcran("fin");
  if (boutonRejouer) boutonRejouer.focus();
}

/* ---------- Accueil : saisie et validation du nom ---------- */
function validerChampNom() {
  const valeur = nomJoueurChamp ? nomJoueurChamp.value.trim() : "";
  const ok = nomValide(valeur);
  if (boutonContinuer) boutonContinuer.disabled = !ok;
  if (erreurNom) {
    const vide = valeur === "";
    erreurNom.textContent = ok || vide ? "" : "Ton nom doit faire entre 2 et 12 caractères";
    erreurNom.hidden = ok || vide;
  }
  return ok;
}

function afficherNomsRecents() {
  if (!nomsRecents) return;
  nomsRecents.textContent = "";
  const noms = lireNomsRecents();
  nomsRecents.hidden = noms.length === 0;
  noms.forEach(function (nom) {
    const bouton = document.createElement("button");
    bouton.type = "button";
    bouton.className = "nom-recent";
    bouton.textContent = nom;
    bouton.addEventListener("click", function () {
      if (!nomJoueurChamp) return;
      nomJoueurChamp.value = nom;
      validerChampNom();
      nomJoueurChamp.focus();
    });
    nomsRecents.appendChild(bouton);
  });
}

function continuerDepuisAccueil() {
  const valeur = nomJoueurChamp ? nomJoueurChamp.value.trim() : "";
  if (!nomValide(valeur)) {
    validerChampNom();
    if (nomJoueurChamp) nomJoueurChamp.focus();
    return;
  }
  nomJoueur = valeur;
  memoriserNom(nomJoueur);
  migrerAncienRecord(nomJoueur);
  rafraichirRecordAffiche();
  afficherMessage("Prêt, " + nomJoueur + " ?");
  afficherChoixMode();
}

function retourAccueil() {
  afficherEcran("accueil");
  if (nomJoueurChamp) nomJoueurChamp.value = nomJoueur || lireStockage(CLE_DERNIER_NOM, "");
  afficherNomsRecents();
  validerChampNom();
}

/* ---------- Choix du mode : cartes générées depuis MODES ---------- */
function afficherChoixMode() {
  if (joueurActuel) joueurActuel.textContent = nomJoueur ? "Salut " + nomJoueur + " !" : "";
  construireCartesModes();
  afficherEcran("choixMode");
  const carte = cartesModes ? cartesModes.querySelector(".carte-mode.selectionne:not([disabled])") : null;
  if (carte) carte.focus();
}

function construireCartesModes() {
  if (!cartesModes) return;
  cartesModes.textContent = "";
  const nom = nomJoueur || lireStockage(CLE_DERNIER_NOM, "");
  for (const cle in MODES) {
    if (!Object.prototype.hasOwnProperty.call(MODES, cle)) continue;
    const mode = MODES[cle];
    const carte = document.createElement("button");
    carte.type = "button";
    carte.className = "carte-mode";
    carte.dataset.mode = cle;
    if (cle === modeActuel) carte.classList.add("selectionne");
    if (!mode.disponible) carte.disabled = true;

    const icone = document.createElement("span");
    icone.className = "carte-icone";
    icone.setAttribute("aria-hidden", "true");
    icone.textContent = mode.icone;
    const nomCarte = document.createElement("span");
    nomCarte.className = "carte-nom";
    nomCarte.textContent = mode.nom;
    const but = document.createElement("span");
    but.className = "carte-but";
    but.textContent = mode.but;
    const recordCarte = document.createElement("span");
    recordCarte.className = "carte-record";
    recordCarte.textContent = "Record : " + lireRecord(cle, nom);

    carte.appendChild(icone);
    carte.appendChild(nomCarte);
    carte.appendChild(but);
    carte.appendChild(recordCarte);
    if (!mode.disponible) {
      const badge = document.createElement("span");
      badge.className = "bientot";
      badge.textContent = "Bientôt";
      carte.appendChild(badge);
    }
    carte.addEventListener("click", function () {
      ouvrirRegles(cle);
    });
    cartesModes.appendChild(carte);
  }
}

// Flèches / haut-bas : déplace le focus entre les cartes disponibles
function deplacerFocusCarte(touche) {
  if (!cartesModes) return;
  const cartes = Array.prototype.slice.call(cartesModes.querySelectorAll(".carte-mode:not([disabled])"));
  if (cartes.length === 0) return;
  const index = cartes.indexOf(document.activeElement);
  const arriere = touche === "ArrowLeft" || touche === "ArrowUp";
  const suivant = index === -1 ? 0 : (index + (arriere ? -1 : 1) + cartes.length) % cartes.length;
  cartes[suivant].focus();
}

/* ---------- Règles d'un mode ---------- */
function ouvrirRegles(cle) {
  const mode = MODES[cle];
  if (!mode || !mode.disponible) return;
  modeEnAttente = cle;
  if (reglesTitre) reglesTitre.textContent = "Règles du mode " + mode.nom;
  if (reglesTexte) {
    reglesTexte.textContent = "";
    mode.regles.forEach(function (ligne) {
      const li = document.createElement("li");
      li.textContent = ligne;
      reglesTexte.appendChild(li);
    });
  }
  const nePlusAfficher = lireStockage(CLE_NE_PLUS_AFFICHER, "0") === "1";
  if (caseNePlusAfficher) caseNePlusAfficher.checked = nePlusAfficher;
  if (nePlusAfficher) {
    demarrerMode(cle);
    return;
  }
  afficherEcran("regles");
  if (boutonLancerMode) boutonLancerMode.focus();
}

function fermerRegles() {
  afficherChoixMode();
}

/* ---------- Démarrage / fin de partie ---------- */
function demarrerMode(cle) {
  const mode = MODES[cle];
  if (!mode || !mode.disponible) return;
  modeActuel = cle;
  ecrireStockage(CLE_DERNIER_MODE, cle);
  rafraichirRecordAffiche();
  masquerEcrans();
  lancerPartie();
}

function rejouer() {
  if (!nomJoueur) {
    retourAccueil();
    return;
  }
  masquerEcrans();
  lancerPartie();
}

function remplirEcranFin(ancienRecord) {
  const scoreFinal = Math.round(score);
  const metres = Math.round(defilement / PX_PAR_METRE);
  if (finTitre) finTitre.textContent = "Bien joué " + nomJoueur + " : " + scoreFinal + " points !";
  if (finResultat) finResultat.textContent = scoreFinal + " points";
  if (finDetails) {
    finDetails.textContent = "Combo max ×" + multiplicateurMaxPartie
      + " • Frôlements : " + nbFrolements
      + " • Distance : " + metres + " m";
  }
  if (finMessage) {
    const ecart = ancienRecord - scoreFinal;
    if (scoreFinal > ancienRecord) {
      finMessage.textContent = "Bravo " + nomJoueur + ", nouveau record !";
    } else {
      finMessage.textContent = "Presque, " + nomJoueur + " : " + ecart
        + " point" + (ecart > 1 ? "s" : "") + " de ton record";
    }
  }
}

/* ---------- Crochets de mode ----------
   Esquive utilise exactement la boucle et le score historiques.
   Pour un nouveau mode : compléter ces quatre fonctions (et MODES). */
function preparerMode(mode) {
  if (mode === "course") preparerCourse();
  else {
    rivaux = [];
    course = null;
  }
}

function mettreAJourMode(dt) {
  if (modeActuel === "course") mettreAJourCourse(dt);
}

function verifierFinMode() {
  // Esquive se termine par la collision ; Course par la ligne d'arrivée.
  if (modeActuel === "course" && course && course.distance >= COURSE_DISTANCE_M) {
    etablirClassement();
    return { type: "position", valeur: course.position, message: course.position + "e place" };
  }
  return null;
}

function dessinerInterfaceMode() {
  if (modeActuel === "course") dessinerInterfaceCourse();
}

/* ---------- Course : grille de départ, rivaux et classement ---------- */
function preparerCourse() {
  course = {
    distance: 0,       // distance du joueur en mètres
    temps: 0,          // temps de course (s)
    penalty: 0,        // pénalités (s)
    position: 4,
    dernierePosition: 4,
    clignote: 0,
    classement: []
  };
  joueur.vitesse = 0;  // départ arrêté
  joueur.accelerateur = 0;
  nitro.jauge = 1;

  const grille = [
    { cle: "rapide",   voie: 0, avance: 10, image: imagesAdverses[0] },
    { cle: "regulier", voie: 2, avance: 8,  image: imagesAdverses[1] },
    { cle: "prudent",  voie: 1, avance: 6,  image: imagesAdverses[2] }
  ];
  rivaux = grille.map(function (place, i) {
    const p = PILOTES[place.cle];
    return {
      id: i,
      nom: p.nom,
      personnalite: place.cle,
      image: place.image,
      couleur: p.couleur,
      voie: place.voie,
      x: centreVoie(place.voie),
      y: JOUEUR_Y - place.avance * PX_PAR_METRE,
      vx: 0, ax: 0, angle: 0, rotation: 0, glisse: 0, accelerateur: 0,
      vitesse: 0,
      distance: place.avance,
      nitro: { jauge: 1, actif: false, restant: 0 },
      decision: null,
      prochaineDecision: 0,
      derniereCollision: 0,
      accidents: 0,
      termine: false
    };
  });
}

/* Mise à jour de la course : rivaux, contacts, aspiration, classement. */
function mettreAJourCourse(dt) {
  if (!course) return;
  course.clignote = Math.max(0, course.clignote - dt);
  mettreAJourRivaux(dt);
  verifierCollisionsCourse();
  mettreAJourAspiration(dt);
  etablirClassement();
}

function tempsReactionRival(p) {
  return difficulte().reflexeRivaux * p.reflexes;
}

/* Distance de sécurité : v·t_réaction + v²/(2μg), convertie en pixels. */
function distanceSecurite(p) {
  const v = Math.max(p.vitesse / PX_PAR_METRE, 1);
  const mu = Math.max(adherence(), 0.05);
  // La formule physique est plafonnée au champ de vision réel (un écran) :
  // sinon un pilote freinerait en voyant une voiture encore hors de l'écran.
  return Math.min(
    (v * tempsReactionRival(p) + (v * v) / (2 * mu * G)) * PX_PAR_METRE,
    HAUTEUR * 1.1
  );
}

// Une voie est libre si aucun obstacle ni rival n'occupe la zone devant le pilote.
function voieLibre(voie, pilot, distance) {
  if (voie < 0 || voie >= NB_VOIES) return false;
  for (const o of obstacles) {
    if (o.voie !== voie) continue;
    if (o.y + VOITURE_HAUTEUR > pilot.y - distance && o.y < pilot.y + VOITURE_HAUTEUR * 1.2) return false;
  }
  for (const r of rivaux) {
    if (r === pilot) continue;
    if (r.voie === voie && Math.abs(r.y - pilot.y) < VOITURE_HAUTEUR * 1.7) return false;
  }
  return true;
}

/* Décision d'un rival : regarder devant, choisir une voie libre, ou freiner. */
function decisionRival(r) {
  const p = PILOTES[r.personnalite];
  const zone = distanceSecurite(r);
  if (voieLibre(r.voie, r, zone)) {
    if (p.nitro && r.nitro.jauge >= 1 && zone > 260 && Math.random() < 0.03) {
      r.nitro.actif = true;
      r.nitro.restant = NITRO_DUREE;
      r.nitro.jauge = 0;
    }
    return null;
  }
  const candidats = [r.voie - 1, r.voie + 1].filter((v) => voieLibre(v, r, zone * 0.8));
  if (candidats.length === 0) {
    // Si l'obstacle est encore loin, on garde sa vitesse au lieu de freiner
    // à chaque cycle de décision (sinon le rival ne dépasse jamais 110 km/h).
    if (voieLibre(r.voie, r, 220)) return null;
    return { voie: r.voie, ralentir: true };
  }
  // Erreur volontaire : plus fréquente sur verglas, surtout pour le pilote prudent.
  const erreur = 0.02 + 0.12 * meteo.intensiteVerglas + (1 - p.risque) * 0.02;
  if (Math.random() < erreur) return { voie: r.voie, ralentir: true };
  const choix = Math.random() < p.agressivite ? candidats[candidats.length - 1] : candidats[0];
  return { voie: choix, ralentir: false };
}

function mettreAJourRivaux(dt) {
  const D = difficulte();
  for (const r of rivaux) {
    const p = PILOTES[r.personnalite];

    // La décision n'est appliquée qu'après le temps de réaction du pilote.
    if (course.temps >= r.prochaineDecision) {
      r.decision = decisionRival(r);
      r.prochaineDecision = course.temps + 0.25 + Math.random() * 0.1;
      if (r.decision && r.decision.voie !== r.voie) {
        r.executeA = course.temps + tempsReactionRival(p);
      }
    }
    if (r.executeA !== undefined && course.temps >= r.executeA) {
      r.voie = r.decision.voie;
      r.decision = null;
      r.executeA = undefined;
    }

    if (r.nitro.actif) {
      r.nitro.restant -= dt;
      if (r.nitro.restant <= 0) {
        r.nitro.actif = false;
        r.nitro.jauge = Math.min(r.nitro.jauge, 0.2);
      }
    } else {
      r.nitro.jauge = Math.min(1, r.nitro.jauge + NITRO_RECHARGE * 0.6 * dt);
    }

    // Élastique léger : désactivé en Difficile pour une course "propre".
    let facteur = 1;
    if (difficulteActive !== "difficile") {
      facteur = limiter(1 - (r.distance - course.distance) / 900, 0.9, 1.1);
    }
    const pluie = meteo.intensitePluie > 0.4 ? p.pluieFacteur : 1;
    let cible = Math.min(D.vitesseMax, D.vitesseDepart + 55) * facteur * pluie;
    if (r.nitro.actif) cible += NITRO_BONUS_KMH * 0.6;
    cible *= facteurMeteo("vitesseMax");

    appliquerMoteur(r, dt, {
      vitesseCibleKmh: cible,
      puissance: PUISSANCE_MAX * (r.nitro.actif ? NITRO_PUISSANCE * 0.8 : 0.95)
    });
    if (r.decision && r.decision.ralentir) {
      r.vitesse = ralentirParFrottement(r.vitesse, dt * 0.25);
    }
    appliquerDirection(r, dt, {
      puissance: PUISSANCE_MAX * (r.nitro.actif ? NITRO_PUISSANCE : 1)
    });
    if (r.glisse > 0.3) laisserTraces(dt, r);

    r.distance += (r.vitesse / PX_PAR_METRE) * dt;
    r.y = JOUEUR_Y - (r.distance - course.distance) * PX_PAR_METRE;
    garderSurLaRoute(r);
  }
  separerVoitures();
}

function garderSurLaRoute(v) {
  const min = ROUTE_GAUCHE + VOITURE_LARGEUR / 2;
  const max = ROUTE_GAUCHE + ROUTE_LARGEUR - VOITURE_LARGEUR / 2;
  if (v.x < min || v.x > max) {
    v.x = limiter(v.x, min, max);
    v.vx = -v.vx * 0.3;
  }
}

// Anti-chevauchement : on écarte doucement deux voitures qui se superposent.
function separerVoitures() {
  const toutes = [joueur].concat(rivaux);
  for (let i = 0; i < toutes.length; i++) {
    for (let j = i + 1; j < toutes.length; j++) {
      const a = toutes[i];
      const b = toutes[j];
      if (Math.abs(a.y - b.y) >= VOITURE_HAUTEUR * 0.95) continue;
      if (Math.abs(a.x - b.x) >= VOITURE_LARGEUR * 0.95) continue;
      const sens = a.x <= b.x ? -1 : 1;
      a.x += sens * 6;
      b.x -= sens * 6;
      a.vitesse *= 0.995;
      b.vitesse *= 0.995;
    }
  }
}

/* Aspiration : rester dans le sillage d'un rival recharge le nitro. */
function mettreAJourAspiration(dt) {
  for (const r of rivaux) {
    const ecart = r.distance - course.distance;
    if (ecart > 4 && ecart < 22 && Math.abs(r.x - joueur.x) < VOITURE_LARGEUR * 0.9) {
      nitro.jauge = Math.min(1, nitro.jauge + 0.12 * dt);
      r.nitro.jauge = Math.min(1, r.nitro.jauge + 0.06 * dt);
    }
  }
}

/* Contacts en course : rival = choc physique, trafic = vitesse perdue + pénalité. */
function verifierCollisionsCourse() {
  const rectJoueur = rectangle(joueur);
  for (const o of obstacles) {
    if (o.penalise || !seChevauchent(rectJoueur, rectangle(o))) continue;
    o.penalise = true;
    o.accidente = true;
    course.penalty += COURSE_PENALITE_S;
    joueur.vitesse *= 0.45;
    tremblement = Math.max(tremblement, 8);
    creerEtincelles(joueur.x, joueur.y + VOITURE_HAUTEUR / 2, 20);
    sonAccident(0.5);
    ajouterTexteFlottant("+" + COURSE_PENALITE_S + " s", joueur.x, joueur.y - 40, "#ff6b6b", 26);
    afficherMessage("Choc avec le trafic : +" + COURSE_PENALITE_S + " s");
  }
  for (const r of rivaux) {
    if (course.temps - r.derniereCollision < 0.8) continue;
    if (seChevauchent(rectJoueur, rectangle(r))) {
      chocVoitures(joueur, r);
      r.derniereCollision = course.temps;
    }
  }
  for (let i = 0; i < rivaux.length; i++) {
    for (let j = i + 1; j < rivaux.length; j++) {
      const a = rivaux[i];
      const b = rivaux[j];
      if (course.temps - a.derniereCollision < 0.8 || course.temps - b.derniereCollision < 0.8) continue;
      if (seChevauchent(rectangle(a), rectangle(b))) {
        chocVoitures(a, b);
        a.derniereCollision = b.derniereCollision = course.temps;
      }
    }
  }
}

// Choc partiellement élastique entre deux voitures, sans fin de partie.
function chocVoitures(a, b) {
  const e = 0.3;
  const v1 = a.vitesse;
  const v2 = b.vitesse;
  a.vitesse = Math.max(0, (v1 + v2 - e * (v1 - v2)) / 2);
  b.vitesse = Math.max(0, (v1 + v2 + e * (v1 - v2)) / 2);
  const decalage = (a.x - b.x) / VOITURE_LARGEUR;
  const sens = decalage === 0 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(decalage);
  a.vx += sens * 45;
  b.vx -= sens * 45;
  a.rotation = sens * 0.5;
  b.rotation = -sens * 0.5;
  tremblement = Math.max(tremblement, 5);
  creerEtincelles((a.x + b.x) / 2, (a.y + b.y) / 2 + VOITURE_HAUTEUR / 2, 12);
  sonAccident(0.3);
  if (a.accidents !== undefined) a.accidents++;
  if (b.accidents !== undefined) b.accidents++;
}

function etablirClassement() {
  if (!course) return;
  const liste = [{ nom: nomJoueur || "Vous", distance: course.distance, joueur: true }]
    .concat(rivaux.map(function (r) {
      return { nom: r.nom, distance: r.distance, joueur: false, reference: r };
    }));
  liste.sort(function (a, b) { return b.distance - a.distance; });
  course.classement = liste;
  const pos = liste.findIndex(function (e) { return e.joueur; }) + 1;
  if (pos !== course.position) {
    if (course.position < pos) sonPositionPerdue();
    else sonPositionGagnee();
    course.dernierePosition = course.position;
    course.position = pos;
    course.clignote = 1.2;
  }
}

function sonPositionGagnee() {
  jouerBip(880, 0.18, "triangle", 0.12);
  jouerBip(1175, 0.22, "triangle", 0.1, 0.12);
}
function sonPositionPerdue() {
  jouerBip(520, 0.18, "triangle", 0.1);
  jouerBip(350, 0.22, "triangle", 0.09, 0.12);
}

/* Affichage propre au mode Course : position, progression, écarts, mini-carte. */
function dessinerInterfaceCourse() {
  if (!course) return;
  const milieu = LARGEUR / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const clignote = course.clignote > 0 && Math.floor(performance.now() / 120) % 2 === 0;
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.beginPath();
  rectangleArrondi(milieu - 62, 6, 124, 48, 10);
  ctx.fill();
  ctx.font = "900 28px Arial";
  ctx.fillStyle = clignote ? "#ffd23f" : "#ffffff";
  ctx.fillText(course.position + (course.position === 1 ? "er" : "e"), milieu - 24, 30);
  ctx.font = "bold 14px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("/4", milieu + 30, 30);

  const km = Math.min(COURSE_DISTANCE_M, course.distance) / 1000;
  ctx.font = "bold 11px Arial";
  ctx.fillStyle = "#9fb3c8";
  ctx.fillText(km.toFixed(1).replace(".", ",") + " / 3 km", milieu, 68);
  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.fillRect(milieu - 70, 78, 140, 6);
  ctx.fillStyle = "#ffd23f";
  ctx.fillRect(milieu - 70, 78, 140 * limiter(course.distance / COURSE_DISTANCE_M, 0, 1), 6);

  const vJoueur = Math.max(joueur.vitesse / PX_PAR_METRE, 1);
  const devant = course.classement[course.position - 2];
  const derriere = course.classement[course.position];
  let ecart = "";
  if (devant) ecart = "−" + ((devant.distance - course.distance) / vJoueur).toFixed(1).replace(".", ",") + " s";
  else if (derriere) ecart = "+" + ((course.distance - derriere.distance) / vJoueur).toFixed(1).replace(".", ",") + " s";
  ctx.font = "bold 12px Arial";
  ctx.fillStyle = "#5ee7ff";
  ctx.fillText(ecart, milieu, 99);

  // Mini-carte verticale : un point par voiture, le joueur en blanc.
  const mx = LARGEUR - 22;
  const my0 = 170;
  const my1 = 380;
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.beginPath();
  rectangleArrondi(mx - 9, my0 - 12, 18, my1 - my0 + 24, 8);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
  ctx.fillRect(mx - 1, my0, 2, my1 - my0);
  const hauteurMini = function (d) {
    return my1 - (my1 - my0) * limiter(d / COURSE_DISTANCE_M, 0, 1);
  };
  for (const r of rivaux) {
    ctx.fillStyle = r.couleur;
    ctx.beginPath();
    ctx.arc(mx, hauteurMini(r.distance), 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(mx, hauteurMini(course.distance), 4, 0, Math.PI * 2);
  ctx.fill();

  // Rivaux hors écran : une flèche indique s'ils sont devant ou derrière.
  ctx.font = "bold 16px Arial";
  for (const r of rivaux) {
    if (r.y < 0) {
      ctx.fillStyle = r.couleur;
      ctx.fillText("▲", r.x, 148);
    } else if (r.y > HAUTEUR - VOITURE_HAUTEUR) {
      ctx.fillStyle = r.couleur;
      ctx.fillText("▼", r.x, HAUTEUR - 148);
    }
  }
}

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

  // Le champ de saisie garde la main (Espace et Entrée compris)
  if (saisieActive()) return;

  // Un écran HTML est ouvert : navigation seulement, aucune commande de jeu
  if (interfaceOuverte()) {
    const reglesOuvertes = ecranRegles !== null && !ecranRegles.hidden;
    if (touche === "Escape") {
      evenement.preventDefault();
      if (reglesOuvertes) fermerRegles();
      else if (etat === "choixMode") retourAccueil();
      return;
    }
    if (reglesOuvertes) return;
    if (touche === "Enter" && etat === "accueil") {
      const actif = document.activeElement;
      if (actif && actif.tagName === "BUTTON") return; // le bouton focalisé agit
      evenement.preventDefault();
      continuerDepuisAccueil();
      return;
    }
    if (etat === "choixMode" && (touche === "ArrowLeft" || touche === "ArrowRight" || touche === "ArrowUp" || touche === "ArrowDown")) {
      evenement.preventDefault();
      deplacerFocusCarte(touche);
      return;
    }
    if ((touche === " " || touche === "Enter") && etat === "fini") {
      const actif = document.activeElement;
      if (actif && actif.tagName === "BUTTON") return; // le bouton focalisé agit
      evenement.preventDefault();
      rejouer();
    }
    return;
  }

  if (touche === "ArrowLeft" || touche === "ArrowRight" || touche === "ArrowUp" || touche === " ") {
    evenement.preventDefault();
  }
  if (evenement.repeat) return;

  if (touche === "ArrowLeft" || touche === "q" || touche === "a") allerAGauche();
  else if (touche === "ArrowRight" || touche === "d") allerADroite();
  else if ((touche === " " || touche === "Enter") && etat === "fini") rejouer();
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
  if (etat === "accueil") {
    if (nomJoueurChamp) nomJoueurChamp.focus();
  } else if (etat === "choixMode") {
    afficherChoixMode();
  } else if (!nomJoueur) {
    retourAccueil();
  } else {
    rejouer();
  }
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
  if (evenement.target.closest("#ecrans")) return;  // les écrans HTML gèrent leurs propres touchers
  if (evenement.target.closest("button")) return;   // les boutons gardent leur rôle
  if (geste !== null) return;                       // un seul doigt suivi à la fois
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
    if (geste.surCanvas && (etat === "jeu" || etat === "compte")) {
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
  // Sur la grille de départ, personne ne bouge avant le feu vert
  const surGrille = modeActuel === "course" && etat === "compte";
  if ((etat === "compte" || etat === "jeu") && !surGrille) {
    mettreAJourMoteur(dt);
    mettreAJourDirection(dt);
  } else if (etat === "accident") {
    mettreAJourAccident(dt);
  }

  if (etat === "jeu" && modeActuel === "course" && course) {
    course.temps += dt;
    course.distance = defilement / PX_PAR_METRE;
  }

  defilement += joueur.vitesse * dt;
  deplacerObstacles(dt);
  mettreAJourNitro(dt);
  mettreAJourMeteo(dt);
  mesurerEcartsLateraux();
  mettreAJourParticules(dt);
  mettreAJourTextesFlottants(dt);
  animationCombo *= Math.exp(-5 * dt);
  tremblement *= Math.exp(-6 * dt);

  if (etat === "compte") {
    mettreAJourCompteARebours(dt);
  } else if (etat === "jeu") {
    creerVaguesDeTrafic(dt);
    verifierObstaclesEvites();      // scoring (points, combo, frôlements)
    mettreAJourMode(dt);            // crochet du mode actif
    const fin = verifierFinMode();  // crochet de fin (null pour Esquive)
    if (fin) {
      derniereFinMode = fin;
      terminerPartie();
      return;
    }
    verifierCollisions();
  }
}

/* Moteur : principe fondamental de la dynamique  m·a = F_moteur − F_traînée − F_roulement
   La force du moteur est limitée par la puissance (F = P / v) et par l'adhérence des pneus. */
/* Moteur générique : m·a = F_moteur − F_traînée − F_roulement.
   Le joueur ET les rivaux passent par cette même fonction : la course est juste. */
function appliquerMoteur(voiture, dt, reglage) {
  const v = voiture.vitesse / PX_PAR_METRE;                       // m/s
  const vCible = reglage.vitesseCibleKmh / 3.6;
  const puissance = reglage.puissance;

  const forceTrainee = COEF_TRAINEE * v * v;

  // « Régulateur de vitesse » : la puissance juste nécessaire pour compenser les
  // résistances, plus un supplément si l'on est en dessous de la vitesse visée.
  const puissanceMaintien = (forceTrainee + FORCE_ROULEMENT) * v / puissance;
  const accelerateur = limiter(puissanceMaintien + (vCible - v) * 0.5, 0, 1);
  voiture.accelerateur = accelerateur;

  let forceMoteur = accelerateur * Math.min(forceAdherence(), puissance / Math.max(v, 1));
  if (v > vCible + 1) forceMoteur = -Math.min(FORCE_FREIN_MAX, (v - vCible) * 2000);

  const acceleration = (forceMoteur - forceTrainee - FORCE_ROULEMENT) / MASSE;
  voiture.vitesse = Math.max(0, v + acceleration * dt) * PX_PAR_METRE;
}

function mettreAJourMoteur(dt) {
  const D = difficulte();
  let vitesseCibleKmh = Math.min(D.vitesseMax, D.vitesseDepart + voituresEvitees * 2.5);
  if (nitro.actif) vitesseCibleKmh += NITRO_BONUS_KMH;
  vitesseCibleKmh *= facteurMeteo("vitesseMax");
  appliquerMoteur(joueur, dt, {
    vitesseCibleKmh: vitesseCibleKmh,
    puissance: PUISSANCE_MAX * (nitro.actif ? NITRO_PUISSANCE : 1)
  });
}

/* Direction : la voiture est attirée vers le centre de sa voie comme par un ressort amorti.
   L'accélération latérale est limitée (adhérence), et l'angle de la voiture suit la
   direction réelle de sa vitesse : angle = atan(vitesse latérale / vitesse d'avancement). */
/* Direction générique : ressort amorti vers le centre de la voie, accélération
   latérale limitée par μ, angle = atan(vx / v). Même code pour tous les pilotes. */
function appliquerDirection(voiture, dt, reglage) {
  const cible = centreVoie(voiture.voie);
  let ax = RAIDEUR * (cible - voiture.x) - AMORTISSEMENT * voiture.vx;
  // Sur le verglas, de petites irrégularités de la glace font dériver la voiture
  ax += deriveVerglas();
  // Les pneus ne peuvent pas fournir plus que μ·g : sur route glissante la voiture
  // met plus de temps à changer de voie et dépasse sa cible (survirage)
  const accelMax = ACCEL_LATERALE_MAX * adherence() / ADHERENCE;
  ax = limiter(ax, -accelMax, accelMax);
  voiture.ax = ax;
  voiture.vx += ax * dt;
  voiture.x += voiture.vx * dt;
  voiture.angle = limiter(Math.atan2(voiture.vx, Math.max(voiture.vitesse, 1)), -0.5, 0.5);

  // Glissement latéral : un virage serré dépasse l'adhérence des pneus
  const k = adherence() / ADHERENCE;
  const glisseLaterale = limiter((Math.abs(ax) - 800 * k) / (1500 * k), 0, 1);
  // Patinage : la force demandée au moteur approche la limite d'adhérence μ·m·g
  const v = Math.max(voiture.vitesse / PX_PAR_METRE, 1);
  const forceDemandee = voiture.accelerateur * reglage.puissance / v;
  const patinage = limiter((forceDemandee / forceAdherence() - 0.8) / 0.25, 0, 1);
  voiture.glisse += (Math.max(glisseLaterale, patinage) - voiture.glisse) * Math.min(1, dt * 25);
}

function mettreAJourDirection(dt) {
  appliquerDirection(joueur, dt, {
    puissance: PUISSANCE_MAX * (nitro.actif ? NITRO_PUISSANCE : 1)
  });
  laisserTraces(dt);
}

function lisserGlisse(cible, dt) {
  joueur.glisse += (cible - joueur.glisse) * Math.min(1, dt * 25);
}

/* Traces de pneus : on mémorise la position des roues arrière quand la voiture glisse.
   Les traces sont « collées » à la route : elles descendent avec le défilement. */
function laisserTraces(dt, voiture = joueur) {
  if (voiture.glisse < 0.3 || facteurMeteo("traces") < 0.1) return;
  const cosA = Math.cos(voiture.angle);
  const sinA = Math.sin(voiture.angle);
  const centreY = voiture.y + VOITURE_HAUTEUR / 2;
  for (const cote of [-1, 1]) {
    const lx = cote * (VOITURE_LARGEUR / 2 - 8);
    const ly = VOITURE_HAUTEUR / 2 - 16;
    traces.push({
      x: voiture.x + lx * cosA - ly * sinA,
      y: centreY + lx * sinA + ly * cosA,
      defilementDepart: defilement,
      opacite: (0.2 + 0.45 * voiture.glisse) * facteurMeteo("traces")
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

/* Course : 5 feux rouges s'éteignent un par un avant le départ. */
function mettreAJourFeux(dt) {
  const avant = Math.ceil(compteARebours);
  compteARebours -= dt;
  const apres = Math.ceil(compteARebours);
  if (apres !== avant) {
    if (apres > 0) jouerBip(440, 0.2, "square", 0.1);
    else {
      jouerBip(1046, 0.5, "square", 0.14);
      etat = "jeu";
      afficherMessage("Feu vert ! Direction l'arrivée.");
    }
  }
}

function mettreAJourCompteARebours(dt) {
  if (modeActuel === "course") {
    mettreAJourFeux(dt);
    return;
  }
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
  const mode = MODES[modeActuel];
  if (!mode || !mode.trafic) return;
  const vRel = vitesseRelativeTrafic();
  if (vRel <= 0) return;
  distanceDepuisVague += vRel * dt;

  // Écart entre deux vagues : au moins ≈ 0,85 s pour pouvoir changer de voie
  // Sur route glissante, on laisse plus de temps pour changer de voie.
  // La densité de la difficulté resserre (ou desserre) les vagues.
  const tempsReaction = 0.85 + 0.7 * (1 - adherence() / ADHERENCE);
  const densite = difficulte().densiteTrafic * (modeActuel === "course" ? COURSE_DENSITE_TRAFIC : 1);
  const ecart = (VOITURE_HAUTEUR + Math.max(160, vRel * tempsReaction)) / densite;
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
    phase: Math.random() * 6.28, // pour le léger louvoiement sur le verglas
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
    } else {
      // Sur le verglas, les autres conducteurs louvoient un peu
      o.angle = meteo.intensiteVerglas * 0.07 * Math.sin(defilement * 0.004 + o.phase);
    }
    // Gerbe d'eau derrière les voitures sous la pluie
    if (meteo.intensitePluie > 0.3 && Math.random() < 0.25 * meteo.intensitePluie) {
      creerGerbe(o.x, o.y + VOITURE_HAUTEUR, joueur.vitesse - o.vitesse);
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
    if (modeActuel === "course") {
      // Pas de score en course, mais les frôlements rechargent toujours le nitro.
      if (!o.compte && !o.accidente && o.y > joueur.y + VOITURE_HAUTEUR) {
        o.compte = true;
        if (o.ecartMin < SEUIL_FROLEMENT) declencherFrolement(o);
      }
      continue;
    }
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
  const mode = MODES[modeActuel];
  if (!mode) return;
  if (mode.rivaux) {
    verifierCollisionsCourse();
    return;
  }
  if (!mode.collisionFatale) return;
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
  const deceleration = adherence() * G * PX_PAR_METRE * dt;
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
    } else if (p.type === "onde") {
      p.taille += 22 * dt;      // le rond dans l'eau s'élargit
    } else if (p.type === "gerbe") {
      p.taille += 30 * dt;      // l'eau pulvérisée se disperse
    } else if (p.type === "flocon") {
      p.vx += Math.sin(p.age * 3 + p.y) * 20 * dt;
    }
  }
  particules = particules.filter(function (p) {
    return p.age < p.vie;
  });
}

/* ---------- Bonus : score, combos, frôlements, nitro ---------- */
function ajouterPoints(points, x, y) {
  // Le score reste flottant en interne : le multiplicateur de difficulté
  // (0,8 / 1 / 1,3) s'applique sans arrondi cumulatif.
  const gagnes = points * difficulte().multiplicateurScore;
  score += gagnes;
  affichageScore.textContent = Math.round(score);
  ajouterTexteFlottant("+" + Math.round(gagnes), x, y, "#ffffff", 20);
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

/* ---------- Météo : pluie et verglas ---------- */

// Valeur d'une propriété de METEOS, mélangée selon l'intensité de la pluie et du verglas
function facteurMeteo(propriete) {
  const sec = METEOS.sec[propriete];
  return sec
    + (METEOS.pluie[propriete] - sec) * meteo.intensitePluie
    + (METEOS.verglas[propriete] - sec) * meteo.intensiteVerglas;
}

// Coefficient d'adhérence μ réellement disponible sous les roues
function adherence() {
  let mu = facteurMeteo("adherence");
  if (meteo.surDanger === "flaque") mu = Math.min(mu, ADHERENCE_FLAQUE);
  if (meteo.surDanger === "verglas") mu = Math.min(mu, ADHERENCE_PLAQUE);
  return Math.max(mu, 0.05);
}

function forceAdherence() {
  return adherence() * MASSE * G;
}

// Petite force latérale irrégulière sur la glace (somme de sinus de périodes différentes)
function deriveVerglas() {
  const t = defilement / PX_PAR_METRE;
  return meteo.intensiteVerglas * 160 * (Math.sin(t * 0.21) + 0.6 * Math.sin(t * 0.53 + 1.7));
}

function mettreAJourMeteo(dt) {
  // Transition douce (≈ 2 s) vers le temps visé
  const viserPluie = meteo.actuelle === "pluie" ? 1 : 0;
  const viserVerglas = meteo.actuelle === "verglas" ? 1 : 0;
  const vitesseTransition = 0.5 * dt;
  meteo.intensitePluie += limiter(viserPluie - meteo.intensitePluie, -vitesseTransition, vitesseTransition);
  meteo.intensiteVerglas += limiter(viserVerglas - meteo.intensiteVerglas, -vitesseTransition, vitesseTransition);
  meteo.annonce = Math.max(0, meteo.annonce - dt);

  if (etat === "jeu") {
    meteo.distanceRestante -= joueur.vitesse * dt / PX_PAR_METRE;
    if (meteo.distanceRestante <= 0) changerMeteo();
    creerDangers(dt);
  }
  deplacerDangers(dt);
  if (etat === "jeu" || etat === "compte") verifierDangersSousRoues();
  creerEffetsMeteo();
}

// Après le sec : pluie ou verglas selon la difficulté. Puis retour au sec.
function changerMeteo() {
  const mode = MODES[modeActuel];
  let suivante = "sec";
  if (meteo.actuelle === "sec" && mode && mode.meteo) {
    suivante = Math.random() < difficulte().probabiliteVerglas ? "verglas" : "pluie";
  }
  meteo.actuelle = suivante;
  meteo.distanceRestante = DISTANCE_ENTRE_METEOS_M * (0.8 + Math.random() * 0.4);
  meteo.annonce = 2.6;
  if (suivante === "pluie") sonTonnerre();
  else if (suivante === "verglas") sonGivre();
  else sonRouteSeche();
  afficherMessage(METEOS[suivante].nom.charAt(0) + METEOS[suivante].nom.slice(1).toLowerCase() + " — " + METEOS[suivante].conseil);
}

/* Flaques (pluie) et plaques de verglas : posées sur une voie, elles défilent avec la route */
function creerDangers(dt) {
  const intensite = Math.max(meteo.intensitePluie, meteo.intensiteVerglas);
  if (intensite < 0.6) return;
  distanceDanger += joueur.vitesse * dt;
  if (distanceDanger < 900 + Math.random() * 600) return;
  distanceDanger = 0;
  const voie = Math.floor(Math.random() * NB_VOIES);
  const estPluie = meteo.intensitePluie > meteo.intensiteVerglas;
  dangers.push({
    type: estPluie ? "flaque" : "verglas",
    x: centreVoie(voie) + (Math.random() - 0.5) * 16,
    y: -120,
    largeur: LARGEUR_VOIE * (0.8 + Math.random() * 0.25),
    hauteur: 55 + Math.random() * 35,
    touche: false
  });
}

function deplacerDangers(dt) {
  for (const d of dangers) {
    d.y += joueur.vitesse * dt; // collés à la route
  }
  dangers = dangers.filter(function (d) {
    return d.y < HAUTEUR + 20;
  });
}

// Les roues du joueur sont-elles sur une flaque ou une plaque ?
function verifierDangersSousRoues() {
  const roues = rectangle(joueur);
  meteo.surDanger = null;
  for (const d of dangers) {
    const zone = {
      gauche: d.x - d.largeur * 0.4,
      droite: d.x + d.largeur * 0.4,
      haut: d.y + d.hauteur * 0.15,
      bas: d.y + d.hauteur * 0.85
    };
    if (seChevauchent(roues, zone)) {
      meteo.surDanger = d.type;
      if (!d.touche) entrerSurDanger(d);
    }
  }
}

function entrerSurDanger(danger) {
  danger.touche = true;
  // Une roue freinée par l'eau d'un côté seulement fait dévier la voiture
  joueur.vx += (Math.random() < 0.5 ? -1 : 1) * (50 + Math.random() * 60);
  if (danger.type === "flaque") {
    ajouterTexteFlottant("AQUAPLANING !", joueur.x, joueur.y - 30, "#8fd3ff", 24);
    for (let i = 0; i < 18; i++) creerGerbe(joueur.x + (Math.random() - 0.5) * 40, joueur.y + VOITURE_HAUTEUR * 0.6, 250);
    sonFlaque();
  } else {
    ajouterTexteFlottant("PLAQUE DE GLACE !", joueur.x, joueur.y - 30, "#dff3ff", 22);
    sonPlaque();
  }
  vibrer(30);
}

/* Particules météo : gouttes, ronds dans l'eau, gerbes d'eau, flocons */
function creerEffetsMeteo() {
  const pluie = meteo.intensitePluie;
  const verglas = meteo.intensiteVerglas;
  // Gouttes de pluie : traits qui tombent vite, inclinés par le vent
  if (Math.random() < 1.3 * pluie) {
    particules.push({
      x: Math.random() * (LARGEUR + 60) - 30, y: -30,
      vx: -60, vy: 900 + joueur.vitesse * 0.4,
      vie: 0.8, age: 0, taille: 14 + Math.random() * 10, type: "goutte"
    });
  }
  // Ronds dans l'eau sur la chaussée (collés à la route)
  if (Math.random() < 0.18 * pluie) {
    particules.push({
      x: ROUTE_GAUCHE + Math.random() * ROUTE_LARGEUR, y: Math.random() * HAUTEUR,
      vx: 0, vy: joueur.vitesse,
      vie: 0.45, age: 0, taille: 1, type: "onde", auSol: true
    });
  }
  // Gerbe d'eau soulevée par les roues du joueur
  if (pluie > 0.3 && Math.random() < 0.5 * pluie * limiter(joueur.vitesse / kmhVersPx(100), 0, 1.5)) {
    const cote = Math.random() < 0.5 ? -1 : 1;
    creerGerbe(joueur.x + cote * (VOITURE_LARGEUR / 2 - 6), joueur.y + VOITURE_HAUTEUR - 6, joueur.vitesse * 0.3);
  }
  // Flocons légers sur le verglas
  if (Math.random() < 0.35 * verglas) {
    particules.push({
      x: Math.random() * LARGEUR, y: -10,
      vx: (Math.random() - 0.5) * 30, vy: 60 + joueur.vitesse * 0.35,
      vie: 3, age: 0, taille: 1.2 + Math.random() * 2, type: "flocon"
    });
  }
}

function creerGerbe(x, y, vitesseDescente) {
  particules.push({
    x: x + (Math.random() - 0.5) * 10, y: y,
    vx: (Math.random() - 0.5) * 70, vy: vitesseDescente + 40 + Math.random() * 60,
    vie: 0.35 + Math.random() * 0.25, age: 0, taille: 4 + Math.random() * 4, type: "gerbe"
  });
}

/* ---------- 8. Dessin ---------- */
function dessinerScene() {
  ctx.clearRect(0, 0, LARGEUR, HAUTEUR);
  ctx.save();
  if (tremblement > 0.3) {
    ctx.translate((Math.random() - 0.5) * tremblement, (Math.random() - 0.5) * tremblement);
  }
  dessinerRoute();
  dessinerChaussee();
  dessinerDangers();
  dessinerTraces();
  dessinerParticules(true);
  for (const o of obstacles) {
    dessinerVoiture(o.image, o.x, o.y, o.angle);
  }
  if (modeActuel === "course") {
    for (const r of rivaux) {
      if (r.y > -VOITURE_HAUTEUR && r.y < HAUTEUR) {
        dessinerVoiture(r.image, r.x, r.y, r.angle);
      }
    }
  }
  dessinerVoiture(imageJoueur, joueur.x, joueur.y, joueur.angle);
  dessinerParticules(false);
  dessinerAmbiance();
  dessinerGivre();
  dessinerTextesFlottants();
  ctx.restore();
  dessinerInterfaceJeu();
  dessinerAnnonceMeteo();
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

  // Météo : icône + adhérence μ (devient rouge sur une flaque ou une plaque)
  ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
  ctx.beginPath();
  rectangleArrondi(5, 78, ROUTE_GAUCHE - 10, 74, 10);
  ctx.fill();
  const icone = imagesMeteo[meteo.actuelle];
  if (imagePrete(icone)) ctx.drawImage(icone, xCombo - 16, 83, 32, 32);
  const mu = adherence();
  ctx.font = "bold 11px Arial";
  ctx.fillStyle = meteo.surDanger ? "#ff6b6b" : "#ffffff";
  ctx.fillText("μ " + mu.toFixed(2).replace(".", ","), xCombo, 126);
  ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
  ctx.fillRect(12, 138, ROUTE_GAUCHE - 24, 5);
  ctx.fillStyle = mu > 0.7 ? "#4ade80" : (mu > 0.35 ? "#facc15" : "#ff6b6b");
  ctx.fillRect(12, 138, (ROUTE_GAUCHE - 24) * Math.min(1, mu / ADHERENCE), 5);

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

  // Interface propre au mode actif (no-op pour Esquive)
  dessinerInterfaceMode();
}

// Route mouillée (plus sombre, reflets) ou givrée (voile bleuté)
function dessinerChaussee() {
  const pluie = meteo.intensitePluie;
  const verglas = meteo.intensiteVerglas;
  if (pluie > 0.01) {
    ctx.fillStyle = "rgba(10, 25, 50, " + 0.28 * pluie + ")";
    ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
    // Reflets allongés qui défilent avec la route
    const decalage = defilement % 180;
    ctx.fillStyle = "rgba(180, 210, 255, " + 0.07 * pluie + ")";
    for (let y = decalage - 180; y < HAUTEUR; y += 180) {
      ctx.fillRect(ROUTE_GAUCHE + 20, y, 14, 90);
      ctx.fillRect(ROUTE_GAUCHE + LARGEUR_VOIE + 30, y + 70, 10, 70);
      ctx.fillRect(ROUTE_GAUCHE + 2 * LARGEUR_VOIE + 24, y + 30, 12, 110);
    }
  }
  if (verglas > 0.01) {
    ctx.fillStyle = "rgba(200, 230, 255, " + 0.22 * verglas + ")";
    ctx.fillRect(0, 0, LARGEUR, HAUTEUR);
    // Herbe gelée
    ctx.fillStyle = "rgba(240, 250, 255, " + 0.35 * verglas + ")";
    ctx.fillRect(0, 0, ROUTE_GAUCHE - 4, HAUTEUR);
    ctx.fillRect(ROUTE_GAUCHE + ROUTE_LARGEUR + 4, 0, LARGEUR - ROUTE_GAUCHE - ROUTE_LARGEUR - 4, HAUTEUR);
  }
}

function dessinerDangers() {
  for (const d of dangers) {
    const image = d.type === "flaque" ? imageFlaque : imagePlaqueVerglas;
    if (imagePrete(image)) {
      ctx.drawImage(image, d.x - d.largeur / 2, d.y, d.largeur, d.hauteur);
    } else {
      ctx.fillStyle = d.type === "flaque" ? "rgba(60, 100, 150, 0.6)" : "rgba(220, 240, 255, 0.6)";
      ctx.beginPath();
      ctx.ellipse(d.x, d.y + d.hauteur / 2, d.largeur / 2, d.hauteur / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// Bords de l'écran givrés quand il gèle
function dessinerGivre() {
  const verglas = meteo.intensiteVerglas;
  if (verglas < 0.01) return;
  const degrade = ctx.createRadialGradient(LARGEUR / 2, HAUTEUR / 2, HAUTEUR * 0.35, LARGEUR / 2, HAUTEUR / 2, HAUTEUR * 0.75);
  degrade.addColorStop(0, "rgba(230, 245, 255, 0)");
  degrade.addColorStop(1, "rgba(230, 245, 255, " + 0.5 * verglas + ")");
  ctx.fillStyle = degrade;
  ctx.fillRect(-20, -20, LARGEUR + 40, HAUTEUR + 40);
}

// Annonce d'un changement de temps : bandeau compact en haut (ne cache pas la route)
function dessinerAnnonceMeteo() {
  if (meteo.annonce <= 0 || etat !== "jeu") return;
  const infos = METEOS[meteo.actuelle];
  const age = 2.6 - meteo.annonce;
  const entree = Math.min(1, age / 0.25);          // glisse depuis le haut
  const sortie = Math.min(1, meteo.annonce / 0.4);  // s'efface à la fin
  const x = ROUTE_GAUCHE + 6;
  const y = 8 - (1 - entree) * 80;
  ctx.save();
  ctx.globalAlpha = sortie;
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.beginPath();
  rectangleArrondi(x, y, ROUTE_LARGEUR - 12, 62, 12);
  ctx.fill();
  const image = meteo.actuelle === "sec" ? imagesMeteo.sec : imagePanneauGlissant;
  if (imagePrete(image)) {
    if (meteo.actuelle === "sec") ctx.drawImage(image, x + 8, y + 8, 46, 46);
    else ctx.drawImage(image, x + 6, y + 9, 52, 46);
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.font = "900 19px Arial";
  ctx.fillStyle = meteo.actuelle === "verglas" ? "#bfe6ff" : (meteo.actuelle === "pluie" ? "#8fd3ff" : "#ffd23f");
  ctx.fillText(infos.nom, x + 66, y + 17);
  ctx.font = "bold 11px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(infos.conseil, x + 66, y + 36);
  ctx.font = "11px Arial";
  ctx.fillStyle = "#cfd8e3";
  ctx.fillText("Adhérence μ = " + infos.adherence.toFixed(2).replace(".", ","), x + 66, y + 51);
  ctx.restore();
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

function dessinerParticules(auSol) {
  for (const p of particules) {
    if (Boolean(p.auSol) !== Boolean(auSol)) continue;
    const restant = 1 - p.age / p.vie;
    if (p.type === "goutte") {
      ctx.strokeStyle = "rgba(200, 220, 255, " + 0.5 * restant + ")";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + p.taille * 0.07, p.y - p.taille);
      ctx.stroke();
      continue;
    }
    if (p.type === "onde") {
      ctx.strokeStyle = "rgba(210, 230, 255, " + 0.5 * restant + ")";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.taille, p.taille * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();
      continue;
    }
    if (p.type === "gerbe") {
      ctx.fillStyle = "rgba(220, 235, 250, " + 0.35 * restant + ")";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.taille, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    if (p.type === "flocon") {
      ctx.fillStyle = "rgba(255, 255, 255, " + 0.85 * Math.min(1, restant * 3) + ")";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.taille, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
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

  // Le « Prêt ? » et l'écran de fin sont désormais des écrans HTML.
  if (etat === "compte") {
    if (modeActuel === "course") {
      const y = HAUTEUR * 0.35;
      const allumees = Math.max(0, Math.ceil(compteARebours));
      for (let i = 0; i < COURSE_DEMARRAGE_FEUX; i++) {
        const x = LARGEUR / 2 + (i - 2) * 34;
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fillStyle = i < allumees ? "#ff3b3b" : "#252525";
        ctx.fill();
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.font = "bold 18px Arial";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("GRILLE DE DÉPART", LARGEUR / 2, y - 40);
      return;
    }
    const nombre = Math.ceil(compteARebours);
    const progression = compteARebours - Math.floor(compteARebours);
    ctx.font = "bold " + Math.round(60 + 40 * progression) + "px Arial";
    ctx.fillStyle = "rgba(255, 210, 63, " + (0.4 + 0.6 * progression) + ")";
    ctx.strokeStyle = "rgba(0, 0, 0, 0.6)";
    ctx.lineWidth = 6;
    ctx.strokeText(nombre, LARGEUR / 2, HAUTEUR / 2 - 40);
    ctx.fillText(nombre, LARGEUR / 2, HAUTEUR / 2 - 40);
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
    mettreAJourSonRivaux();
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
  if (!nomJoueur) {
    retourAccueil();
    return;
  }
  initialiserSon();

  // Une seule boucle à la fois : on annule l'éventuelle boucle précédente
  if (idAnimation !== null) {
    cancelAnimationFrame(idAnimation);
    idAnimation = null;
  }

  reinitialiserPartie();
  masquerEcrans();
  etat = "compte";
  compteARebours = modeActuel === "course" ? COURSE_DEMARRAGE_FEUX : 3;
  jouerBip(523, 0.25, "square", 0.12);
  afficherMessage(modeActuel === "course" ? "Grille de départ…" : "Préparez-vous…");
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
  score = Math.round(score);

  if (modeActuel === "course") {
    terminerCourse();
    return;
  }

  // Record mis à jour AVANT l'affichage de l'écran de fin
  const ancienRecord = lireRecord(modeActuel, nomJoueur);
  if (score > ancienRecord) {
    record = score;
    ecrireRecord(modeActuel, nomJoueur, record);
    affichageRecord.textContent = record;
    afficherMessage("Partie terminée — nouveau record : " + score + " !");
    jouerBip(784, 0.2, "triangle", 0.15);
    jouerBip(1046, 0.3, "triangle", 0.15, 0.15);
    jouerBip(1318, 0.5, "triangle", 0.15, 0.3);
  } else {
    record = ancienRecord;
    affichageRecord.textContent = record;
    afficherMessage("Partie terminée — score : " + score + ".");
  }

  remplirEcranFin(ancienRecord);
  afficherEcran("fin");
  if (boutonRejouer) boutonRejouer.focus();
}

// Câblage unique des nouveaux écrans (le markup est fourni par le designer)
function initialiserInterface() {
  radiosDifficulte.forEach(function (radio) {
    radio.checked = radio.value === difficulteActive;
    radio.addEventListener("change", function () {
      if (!radio.checked) return;
      difficulteActive = radio.value;
      ecrireStockage(CLE_DIFFICULTE, difficulteActive);
    });
  });

  if (nomJoueurChamp) {
    nomJoueurChamp.addEventListener("input", validerChampNom);
    nomJoueurChamp.addEventListener("keydown", function (evenement) {
      if (evenement.key !== "Enter") return;
      evenement.preventDefault();
      continuerDepuisAccueil();
    });
  }
  if (boutonContinuer) boutonContinuer.addEventListener("click", continuerDepuisAccueil);
  if (boutonChangerJoueur) boutonChangerJoueur.addEventListener("click", retourAccueil);
  if (boutonFermerRegles) boutonFermerRegles.addEventListener("click", fermerRegles);
  if (boutonLancerMode) {
    boutonLancerMode.addEventListener("click", function () {
      if (modeEnAttente) demarrerMode(modeEnAttente);
    });
  }
  if (caseNePlusAfficher) {
    caseNePlusAfficher.addEventListener("change", function () {
      ecrireStockage(CLE_NE_PLUS_AFFICHER, caseNePlusAfficher.checked ? "1" : "0");
    });
  }
  if (boutonRejouer) boutonRejouer.addEventListener("click", rejouer);
  if (boutonChangerMode) boutonChangerMode.addEventListener("click", afficherChoixMode);
  if (boutonChangerJoueurFin) boutonChangerJoueurFin.addEventListener("click", retourAccueil);
  if (ecrans) {
    // Toucher l'écran de fin (hors boutons) = rejouer
    ecrans.addEventListener("click", function (evenement) {
      if (etat !== "fini") return;
      if (evenement.target.closest("button")) return;
      rejouer();
    });
  }

  reinitialiserPartie();
  rafraichirRecordAffiche();
  retourAccueil();
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

// Démarrage : tous les écrans sont câblés, on ouvre l'accueil
initialiserInterface();
