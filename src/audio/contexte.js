import { lireStockage } from '../utilitaires/stockage.js';

/**
 * Contexte audio partagé (Web Audio API) et primitives de synthèse.
 *
 * Tous les sons du jeu sont synthétisés par le navigateur : aucun fichier
 * audio n'est nécessaire. Le navigateur n'autorise le son qu'après une action
 * de l'utilisateur ; `initialiserSon()` (audio.js) est donc appelé au
 * démarrage d'une partie.
 */

/**
 * État audio. Il n'existe qu'un contexte audio par page : l'objet est un
 * singleton, contrairement à l'état de la partie.
 */
export const son = {
  /** @type {AudioContext|null} */
  contexte: null,
  /** @type {GainNode|null} Volume général. */
  general: null,
  /** @type {object|null} Voir creerSonMoteur (sonsContinus.js). */
  moteur: null,
  /** @type {object|null} Voir creerSonPneus (sonsContinus.js). */
  pneus: null,
  /** @type {{filtre: BiquadFilterNode, gain: GainNode}|null} */
  vent: null,
  /** @type {{filtre: BiquadFilterNode, gain: GainNode}|null} */
  pluie: null,
  /** @type {{filtre: BiquadFilterNode, gain: GainNode}|null} */
  chausseeMouillee: null,
  /** @type {AudioBuffer|null} Bruit blanc réutilisable (2 s). */
  bruitBlanc: null,
  /** Son activé par le joueur (mémorisé). */
  actif: lireStockage('sonActif', '1') === '1',
  /** Rapport de boîte de vitesses courant (1 à 6). */
  rapport: 1,
};

/** Volume général quand le son est activé. */
export const VOLUME_GENERAL = 0.8;

/**
 * Bruit continu filtré (vent, pluie…), lu en boucle.
 *
 * @param {AudioContext} ac
 * @param {BiquadFilterType} typeFiltre
 * @param {number} frequence
 * @param {number} q
 */
export function creerBruitContinu(ac, typeFiltre, frequence, q) {
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

/**
 * Bip simple (compte à rebours, point marqué…).
 *
 * @param {number} frequence Hz.
 * @param {number} duree     s.
 * @param {OscillatorType} [type]
 * @param {number} [volume]
 * @param {number} [debut]   Délai avant le bip (s).
 */
export function jouerBip(frequence, duree, type, volume, debut) {
  if (!son.contexte) return;
  const ac = son.contexte;
  const t = ac.currentTime + (debut || 0);
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type || 'sine';
  osc.frequency.value = frequence;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volume || 0.25, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duree);
  osc.connect(gain);
  gain.connect(son.general);
  osc.start(t);
  osc.stop(t + duree + 0.05);
}

/**
 * Bruit filtré bref (souffle, choc…) dont la fréquence de coupure glisse de
 * `freqDebut` à `freqFin`.
 *
 * @param {number} duree
 * @param {BiquadFilterType} typeFiltre
 * @param {number} freqDebut
 * @param {number} freqFin
 * @param {number} volume
 */
export function jouerBruit(duree, typeFiltre, freqDebut, freqFin, volume) {
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
