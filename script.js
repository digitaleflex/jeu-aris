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
  crissement: null,    // { filtre, gain }
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
  son.crissement = creerBruitContinu(ac, "bandpass", 1900, 6);
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
  m.filtre.frequency.setTargetAtTime(250 + regime * 0.25 + accelerateur * 600, t, 0.05);
  m.gain.gain.setTargetAtTime(enMarche ? 0.10 + accelerateur * 0.07 : 0, t, 0.08);

  // Crissement des pneus quand l'accélération latérale dépasse ~0,9 g
  const glisse = limiter((Math.abs(accelLaterale) - 900) / 1500, 0, 1);
  son.crissement.gain.gain.setTargetAtTime(enMarche ? glisse * 0.18 : 0, t, 0.03);

  // Bruit du vent : la traînée aérodynamique varie comme v²
  const vent = limiter((vitesseMs / 50) ** 2, 0, 1);
  son.vent.gain.gain.setTargetAtTime(enMarche ? vent * 0.12 : 0, t, 0.2);
}

function couperSonsContinus() {
  mettreAJourSonContinu(0, 0, 0, false);
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

const joueur = {
  voie: 1,
  x: 0,              // centre horizontal (px)
  y: JOUEUR_Y,       // bord haut (px)
  vx: 0,             // vitesse latérale (px/s)
  ax: 0,             // accélération latérale (px/s²)
  vitesse: 0,        // vitesse d'avancement (px/s)
  accelerateur: 0,   // 0 à 1
  angle: 0,          // orientation (rad)
  rotation: 0        // vitesse de rotation pendant un accident (rad/s)
};

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
  distanceDepuisVague = 0;
  tremblement = 0;
  dureeAccident = 0;
  son.rapport = 1;
  zoneMessage.classList.remove("perdu");
}
reinitialiserPartie();

/* ---------- 6. Commandes ---------- */
function allerAGauche() {
  if (etat !== "jeu" && etat !== "compte") return;
  if (joueur.voie > 0) {
    joueur.voie--;
    sonChangementVoie();
  }
}

function allerADroite() {
  if (etat !== "jeu" && etat !== "compte") return;
  if (joueur.voie < NB_VOIES - 1) {
    joueur.voie++;
    sonChangementVoie();
  }
}

document.addEventListener("keydown", function (evenement) {
  const touche = evenement.key;
  if (touche === "ArrowLeft" || touche === "ArrowRight" || touche === " ") {
    evenement.preventDefault();
  }
  if (evenement.repeat) return;

  if (touche === "ArrowLeft" || touche === "q" || touche === "a") allerAGauche();
  else if (touche === "ArrowRight" || touche === "d") allerADroite();
  else if ((touche === " " || touche === "Enter") && (etat === "attente" || etat === "fini")) lancerPartie();
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
    surCanvas: evenement.target === canvas
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
  mettreAJourParticules(dt);
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
  const vitesseCibleKmh = Math.min(VITESSE_MAX_KMH, VITESSE_DEPART_KMH + score * 3);
  const vCible = vitesseCibleKmh / 3.6;

  const forceTrainee = COEF_TRAINEE * v * v;

  // « Régulateur de vitesse » : la puissance juste nécessaire pour compenser les
  // résistances, plus un supplément si l'on est en dessous de la vitesse visée.
  const puissanceMaintien = (forceTrainee + FORCE_ROULEMENT) * v / PUISSANCE_MAX;
  const accelerateur = limiter(puissanceMaintien + (vCible - v) * 0.5, 0, 1);
  joueur.accelerateur = accelerateur;

  let forceMoteur = accelerateur * Math.min(FORCE_ADHERENCE, PUISSANCE_MAX / Math.max(v, 1));
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
  const probaDeux = Math.min(0.55, 0.2 + score * 0.015);
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
    if (!o.compte && o.y > joueur.y + VOITURE_HAUTEUR) {
      o.compte = true; // un seul point par obstacle
      score++;
      affichageScore.textContent = score;
      sonDepassement();
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
    } else {
      p.taille += 14 * dt;      // la fumée se dilate
    }
  }
  particules = particules.filter(function (p) {
    return p.age < p.vie;
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
  for (const o of obstacles) {
    dessinerVoiture(o.image, o.x, o.y, o.angle);
  }
  dessinerVoiture(imageJoueur, joueur.x, joueur.y, joueur.angle);
  dessinerParticules();
  ctx.restore();
  dessinerTexteSurCanvas();
  mettreAJourCompteurVitesse();
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
    ctx.fillRect(0, HAUTEUR / 2 - 90, LARGEUR, 150);
    ctx.fillStyle = etat === "fini" ? "#ff5a5a" : "#ffd23f";
    ctx.font = "bold 30px Arial";
    ctx.fillText(etat === "fini" ? "Partie terminée" : "Prêt ?", LARGEUR / 2, HAUTEUR / 2 - 55);
    ctx.fillStyle = "#ffffff";
    ctx.font = "18px Arial";
    if (etat === "fini") {
      ctx.fillText("Score : " + score + "   •   Record : " + record, LARGEUR / 2, HAUTEUR / 2 - 15);
    } else {
      ctx.fillText("Glissez le doigt ← → pour changer de voie", LARGEUR / 2, HAUTEUR / 2 - 15);
    }
    ctx.font = "16px Arial";
    ctx.fillText("Touchez l'écran ou appuyez sur Espace", LARGEUR / 2, HAUTEUR / 2 + 25);
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

  // Pas fixe : la physique est la même à 60 Hz, 120 Hz ou 144 Hz
  reservoirTemps += dt;
  while (reservoirTemps >= PAS_PHYSIQUE) {
    mettreAJour(PAS_PHYSIQUE);
    reservoirTemps -= PAS_PHYSIQUE;
  }

  if (etat === "compte" || etat === "jeu") {
    mettreAJourSonContinu(joueur.vitesse / PX_PAR_METRE, joueur.accelerateur, joueur.ax, true);
  }

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
