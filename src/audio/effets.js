import { limiter } from '../utilitaires/maths.js';
import { jouerBip, jouerBruit, son } from './contexte.js';

/**
 * Sons ponctuels (effets), tous synthétisés. Chaque fonction correspond à un
 * événement du jeu (voir src/evenements.js et audio.js).
 */

/** Compte à rebours : un bip par seconde. */
export function sonCompteARebours() {
  jouerBip(523, 0.25, 'square', 0.12);
}

/** Départ de la partie : bip long et aigu. */
export function sonDepart() {
  jouerBip(1046, 0.5, 'square', 0.14);
}

/** Voiture dépassée : souffle dont la fréquence baisse (effet Doppler) + petit « ding ». */
export function sonDepassement() {
  jouerBruit(0.35, 'bandpass', 1400, 350, 0.35);
  jouerBip(1046, 0.18, 'triangle', 0.12);
  jouerBip(1568, 0.25, 'triangle', 0.1, 0.07);
}

/** Nitro : souffle qui monte + grondement grave. */
export function sonNitro() {
  if (!son.contexte) return;
  jouerBruit(0.9, 'bandpass', 300, 3000, 0.5);
  const ac = son.contexte;
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(55, t);
  osc.frequency.exponentialRampToValueAtTime(140, t + 0.8);
  gain.gain.setValueAtTime(0.25, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 1);
  osc.connect(gain);
  gain.connect(son.general);
  osc.start(t);
  osc.stop(t + 1.05);
}

/** Frôlement : souffle aigu très proche + deux notes. */
export function sonFrolement() {
  jouerBruit(0.45, 'bandpass', 3200, 500, 0.6);
  jouerBip(1318, 0.15, 'square', 0.08);
  jouerBip(1760, 0.3, 'square', 0.08, 0.08);
}

/** Nouveau palier de combo : arpège d'autant plus aigu que le multiplicateur est grand. */
export function sonCombo(niveau) {
  const base = 440 * Math.pow(2, ((niveau - 2) * 2) / 12);
  jouerBip(base, 0.12, 'triangle', 0.15);
  jouerBip(base * 1.26, 0.12, 'triangle', 0.15, 0.07);
  jouerBip(base * 1.5, 0.25, 'triangle', 0.15, 0.14);
}

export function sonComboPerdu() {
  jouerBip(392, 0.15, 'sawtooth', 0.07);
  jouerBip(262, 0.3, 'sawtooth', 0.07, 0.12);
}

/** Tonnerre au début d'une averse : grondement grave et long. */
export function sonTonnerre() {
  jouerBruit(2.8, 'lowpass', 400, 40, 0.8);
  jouerBruit(0.4, 'lowpass', 1500, 200, 0.35);
}

/** Verglas : petits tintements cristallins. */
export function sonGivre() {
  for (let i = 0; i < 5; i++) {
    jouerBip(2400 + Math.random() * 2200, 0.25, 'sine', 0.05, i * 0.07);
  }
}

export function sonRouteSeche() {
  jouerBip(660, 0.15, 'triangle', 0.1);
  jouerBip(880, 0.25, 'triangle', 0.1, 0.1);
}

/** Roue dans une flaque : gros « splash ». */
export function sonFlaque() {
  jouerBruit(0.5, 'lowpass', 2500, 300, 0.6);
  jouerBruit(0.25, 'bandpass', 1200, 600, 0.35);
}

/** Roue sur une plaque de verglas : craquement sec. */
export function sonPlaque() {
  jouerBruit(0.08, 'highpass', 4000, 2500, 0.4);
  jouerBip(3200, 0.12, 'square', 0.04, 0.03);
}

export function sonChangementVoie() {
  jouerBruit(0.12, 'highpass', 3000, 1500, 0.05);
}

/**
 * Accident : choc sourd + fracas de tôle + bris de verre.
 * @param {number} intensite Proportionnelle à la vitesse d'impact.
 */
export function sonAccident(intensite) {
  if (!son.contexte) return;
  const ac = son.contexte;
  const t = ac.currentTime;
  const v = limiter(intensite, 0.3, 1);

  const choc = ac.createOscillator();
  const gainChoc = ac.createGain();
  choc.type = 'sine';
  choc.frequency.setValueAtTime(110, t);
  choc.frequency.exponentialRampToValueAtTime(35, t + 0.4);
  gainChoc.gain.setValueAtTime(0.9 * v, t);
  gainChoc.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
  choc.connect(gainChoc);
  gainChoc.connect(son.general);
  choc.start(t);
  choc.stop(t + 0.55);

  jouerBruit(0.9, 'lowpass', 4000, 120, 0.9 * v);
  for (let i = 0; i < 6; i++) {
    jouerBip(
      2500 + Math.random() * 3000,
      0.12 + Math.random() * 0.2,
      'square',
      0.04,
      0.05 + i * 0.06,
    );
  }
}

/** Nouveau record : petite mélodie montante. */
export function sonNouveauRecord() {
  jouerBip(784, 0.2, 'triangle', 0.15);
  jouerBip(1046, 0.3, 'triangle', 0.15, 0.15);
  jouerBip(1318, 0.5, 'triangle', 0.15, 0.3);
}
