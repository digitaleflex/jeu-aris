import { LARGEUR } from '../config/constantes.js';

/**
 * Particules (étincelles, fumée, flammes, gouttes…) et textes flottants.
 *
 * Ce sont des effets purement visuels : ils utilisent Math.random et
 * n'influencent jamais le déroulement de la partie.
 *
 * Types de particules : etincelle, fumee, flamme, vent, goutte, onde, gerbe,
 * flocon. Une particule « auSol » est collée à la route (dessinée sous les voitures).
 *
 * @typedef {object} Particule
 * @property {string} type
 * @property {number} x
 * @property {number} y
 * @property {number} vx
 * @property {number} vy
 * @property {number} vie     Durée de vie (s).
 * @property {number} age     Âge (s).
 * @property {number} taille
 * @property {boolean} [auSol]
 */

/**
 * Étincelles : mouvement balistique freiné par l'air.
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 */
export function creerEtincelles(jeu, x, y, nombre) {
  for (let i = 0; i < nombre; i++) {
    const angle = Math.random() * Math.PI * 2;
    const v = 80 + Math.random() * 260;
    jeu.particules.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      vie: 0.4 + Math.random() * 0.5,
      age: 0,
      taille: 1.5 + Math.random() * 2,
      type: 'etincelle',
    });
  }
}

/** @param {import('../etat/jeu.js').EtatJeu} jeu */
export function creerFumee(jeu, x, y) {
  jeu.particules.push({
    x: x + (Math.random() - 0.5) * 20,
    y,
    vx: (Math.random() - 0.5) * 20,
    vy: -20 - Math.random() * 20,
    vie: 1 + Math.random() * 0.6,
    age: 0,
    taille: 8 + Math.random() * 6,
    type: 'fumee',
  });
}

/** Flamme à l'échappement pendant le nitro. */
export function creerFlamme(jeu) {
  const { joueur } = jeu;
  const cote = Math.random() < 0.5 ? -1 : 1;
  jeu.particules.push({
    x: joueur.x + cote * 9 + (Math.random() - 0.5) * 3,
    y: joueur.y + joueur.hauteur - 2,
    vx: (Math.random() - 0.5) * 30 - joueur.vx * 0.3,
    vy: 260 + Math.random() * 120,
    vie: 0.18 + Math.random() * 0.1,
    age: 0,
    taille: 5 + Math.random() * 3,
    type: 'flamme',
  });
}

/** Ligne de vitesse pendant le nitro. */
export function creerLigneVent(jeu) {
  jeu.particules.push({
    x: Math.random() * LARGEUR,
    y: -40,
    vx: 0,
    vy: 1400 + Math.random() * 400,
    vie: 0.5,
    age: 0,
    taille: 30 + Math.random() * 40,
    type: 'vent',
  });
}

/** Gerbe d'eau soulevée par une roue. */
export function creerGerbe(jeu, x, y, vitesseDescente) {
  jeu.particules.push({
    x: x + (Math.random() - 0.5) * 10,
    y,
    vx: (Math.random() - 0.5) * 70,
    vy: vitesseDescente + 40 + Math.random() * 60,
    vie: 0.35 + Math.random() * 0.25,
    age: 0,
    taille: 4 + Math.random() * 4,
    type: 'gerbe',
  });
}

/**
 * Fait avancer toutes les particules et supprime les particules expirées.
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 * @param {number} dt
 */
export function mettreAJourParticules(jeu, dt) {
  for (const p of jeu.particules) {
    p.age += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.type === 'etincelle') {
      p.vx *= Math.exp(-3 * dt); // frottement de l'air
      p.vy *= Math.exp(-3 * dt);
    } else if (p.type === 'flamme') {
      p.taille *= Math.exp(-4 * dt);
    } else if (p.type === 'fumee') {
      p.taille += 14 * dt; // la fumée se dilate
    } else if (p.type === 'onde') {
      p.taille += 22 * dt; // le rond dans l'eau s'élargit
    } else if (p.type === 'gerbe') {
      p.taille += 30 * dt; // l'eau pulvérisée se disperse
    } else if (p.type === 'flocon') {
      p.vx += Math.sin(p.age * 3 + p.y) * 20 * dt;
    }
  }
  jeu.particules = jeu.particules.filter((p) => p.age < p.vie);
}

/**
 * Ajoute un texte qui monte et s'efface (« +3 », « COMBO ×2 »…).
 *
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 * @param {string} texte
 * @param {number} x
 * @param {number} y
 * @param {string} couleur
 * @param {number} taille
 */
export function ajouterTexteFlottant(jeu, texte, x, y, couleur, taille) {
  jeu.textesFlottants.push({ texte, x, y, couleur, taille, age: 0, vie: 0.9 });
}

/**
 * @param {import('../etat/jeu.js').EtatJeu} jeu
 * @param {number} dt
 */
export function mettreAJourTextesFlottants(jeu, dt) {
  for (const t of jeu.textesFlottants) {
    t.age += dt;
    t.y -= 45 * dt;
  }
  jeu.textesFlottants = jeu.textesFlottants.filter((t) => t.age < t.vie);
}
