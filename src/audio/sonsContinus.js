import { limiter } from '../utilitaires/maths.js';
import { creerBruitContinu, son } from './contexte.js';

/**
 * Sons continus : moteur, crissement des pneus, vent, pluie.
 * Leurs paramètres sont mis à jour à chaque image selon l'état de la voiture.
 */

/** Moteur : deux oscillateurs (dent de scie + carré une octave plus bas) filtrés. */
export function creerSonMoteur(ac) {
  const osc1 = ac.createOscillator();
  const osc2 = ac.createOscillator();
  const filtre = ac.createBiquadFilter();
  const gain = ac.createGain();
  osc1.type = 'sawtooth';
  osc2.type = 'square';
  osc2.detune.value = -1200; // une octave plus bas : son plus « gras »
  filtre.type = 'lowpass';
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

/**
 * Régime moteur calculé à partir de la vitesse et d'une boîte à 6 rapports.
 * Vitesse (m/s) atteinte à 6500 tr/min pour chaque rapport :
 */
const VITESSES_RAPPORTS = [0, 14, 23, 32, 41, 50, 60];

/**
 * @param {object} p
 * @param {number} p.vitesseMs      Vitesse du joueur (m/s).
 * @param {number} p.accelerateur   0 à 1.
 * @param {boolean} p.enMarche      Faux pour couper tous les sons continus.
 * @param {boolean} p.nitroActif
 * @param {number} p.intensitePluie 0 à 1.
 */
export function mettreAJourSonContinu({
  vitesseMs,
  accelerateur,
  enMarche,
  nitroActif,
  intensitePluie,
}) {
  if (!son.contexte) return;
  const t = son.contexte.currentTime;

  // Changement de rapport automatique
  let regime = (6500 * vitesseMs) / VITESSES_RAPPORTS[son.rapport];
  if (regime > 6200 && son.rapport < 6) son.rapport++;
  if (regime < 2600 && son.rapport > 1) son.rapport--;
  regime = Math.max(900, (6500 * vitesseMs) / VITESSES_RAPPORTS[son.rapport]);

  // Moteur 4 cylindres : 2 explosions par tour  →  fréquence = régime / 30
  const frequence = regime / 30;
  const m = son.moteur;
  m.osc1.frequency.setTargetAtTime(frequence, t, 0.03);
  m.osc2.frequency.setTargetAtTime(frequence, t, 0.03);
  m.filtre.frequency.setTargetAtTime(
    250 + regime * 0.25 + accelerateur * 600 + (nitroActif ? 1400 : 0),
    t,
    0.05,
  );
  m.gain.gain.setTargetAtTime(enMarche ? 0.1 + accelerateur * 0.07 : 0, t, 0.08);

  // Bruit du vent : la traînée aérodynamique varie comme v²
  const vent = limiter((vitesseMs / 50) ** 2, 0, 1);
  son.vent.gain.gain.setTargetAtTime(enMarche ? vent * 0.12 : 0, t, 0.2);

  // Pluie : bruit de l'averse + « chhhh » des pneus qui chassent l'eau (∝ vitesse)
  son.pluie.gain.gain.setTargetAtTime(enMarche ? 0.09 * intensitePluie : 0, t, 0.3);
  son.chausseeMouillee.gain.gain.setTargetAtTime(
    enMarche ? 0.16 * intensitePluie * limiter(vitesseMs / 40, 0, 1) : 0,
    t,
    0.2,
  );
}

/** Coupe moteur, vent et pluie (fin de partie, accident). */
export function couperSonsContinus() {
  mettreAJourSonContinu({
    vitesseMs: 0,
    accelerateur: 0,
    enMarche: false,
    nitroActif: false,
    intensitePluie: 0,
  });
}

/**
 * Crissement réaliste des pneus.
 *
 * Dans la réalité, un pneu qui dérape « accroche » et « décroche » des
 * centaines de fois par seconde (phénomène d'adhérence-glissement, ou
 * « stick-slip »). Cela produit un sifflement presque musical (une note
 * autour de 700-1500 Hz avec ses harmoniques) qui tremble sans arrêt, mêlé à
 * un bruit de frottement. On le reproduit avec :
 *   1. un bruit blanc passé dans 3 filtres très sélectifs (note + 2 harmoniques) ;
 *   2. un oscillateur dont la hauteur vibre irrégulièrement (le « stick-slip ») ;
 *   3. un bruit de frottement large (gomme sur l'asphalte) ;
 *   4. un grondement grave (la carrosserie qui vibre).
 * Deux oscillateurs lents (LFO) font trembler la hauteur de façon irrégulière.
 */
export function creerSonPneus(ac) {
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
    filtre.type = 'bandpass';
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
  oscillateur.type = 'sawtooth';
  oscillateur.frequency.value = 900;
  profondeur1.connect(oscillateur.frequency);
  profondeur2.connect(oscillateur.frequency);
  const filtreOsc = ac.createBiquadFilter();
  filtreOsc.type = 'bandpass';
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
  filtreFrottement.type = 'bandpass';
  filtreFrottement.frequency.value = 2500;
  filtreFrottement.Q.value = 0.7;
  const gainFrottement = ac.createGain();
  gainFrottement.gain.value = 0;
  bruit.connect(filtreFrottement);
  filtreFrottement.connect(gainFrottement);
  gainFrottement.connect(sortie);

  // 4. Grondement grave
  const filtreGrave = ac.createBiquadFilter();
  filtreGrave.type = 'lowpass';
  filtreGrave.frequency.value = 160;
  const gainGrave = ac.createGain();
  gainGrave.gain.value = 0;
  bruit.connect(filtreGrave);
  filtreGrave.connect(gainGrave);
  gainGrave.connect(sortie);

  return { sifflement, harmoniques, oscillateur, gainOsc, gainFrottement, gainGrave, lfo1, lfo2 };
}

/**
 * @param {number} glisse        0 (le pneu adhère) à 1 (dérapage complet).
 * @param {number} vitesseMs     Vitesse de glissement : plus on glisse vite, plus la note est aiguë.
 * @param {number} facteurMeteo  Facteur de volume selon la météo (peu de crissement sur le mouillé).
 */
export function mettreAJourSonPneus(glisse, vitesseMs, facteurMeteo) {
  if (!son.contexte || !son.pneus) return;
  const p = son.pneus;
  const t = son.contexte.currentTime;
  const g = limiter(glisse, 0, 1);

  // La note dépend de la vitesse de glissement, avec un tremblement aléatoire
  const note = (650 + 380 * g + vitesseMs * 6) * (0.97 + Math.random() * 0.06);
  p.harmoniques.forEach((filtre, h) => {
    filtre.frequency.setTargetAtTime(note * (h + 1), t, 0.04);
  });
  p.oscillateur.frequency.setTargetAtTime(note, t, 0.04);
  p.lfo1.frequency.setTargetAtTime(10 + Math.random() * 8, t, 0.1);

  // Le volume « vacille » un peu, comme un vrai crissement
  const vacillement = 0.8 + Math.random() * 0.4;
  const fort = Math.pow(g, 1.4);
  // Attaque rapide quand le pneu décroche, extinction plus douce quand il raccroche
  const reaction = g > 0.02 ? 0.015 : 0.06;
  p.sifflement.gain.setTargetAtTime(0.16 * fort * vacillement * facteurMeteo, t, reaction);
  p.gainOsc.gain.setTargetAtTime(0.05 * fort * vacillement * facteurMeteo, t, reaction);
  p.gainFrottement.gain.setTargetAtTime(0.12 * g * vacillement, t, reaction);
  p.gainGrave.gain.setTargetAtTime(0.35 * g, t, 0.05);
}

/** Création des bruits de fond (vent, pluie) à l'initialisation du son. */
export function creerBruitsDeFond(ac) {
  son.vent = creerBruitContinu(ac, 'lowpass', 500, 0.7);
  son.pluie = creerBruitContinu(ac, 'highpass', 1800, 0.4); // averse
  son.chausseeMouillee = creerBruitContinu(ac, 'bandpass', 900, 0.6); // pneus dans l'eau
}
