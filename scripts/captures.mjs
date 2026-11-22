#!/usr/bin/env node
/**
 * Génère les captures d'écran de la documentation (docs/images/*.jpg).
 *
 *     npm start                       # dans un terminal
 *     node scripts/captures.mjs       # dans un autre
 *
 * Variables : URL_JEU (défaut http://localhost:8080/), PLAYWRIGHT_CHROMIUM_PATH.
 */
import { chromium, devices } from 'playwright';
import { fileURLToPath } from 'node:url';

const SORTIE = fileURLToPath(new URL('../docs/images/', import.meta.url));
const URL_JEU = process.env.URL_JEU ?? 'http://localhost:8080/';

const navigateur = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
});
const contexte = await navigateur.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2 });
const page = await contexte.newPage();
await page.goto(URL_JEU);
await page.waitForFunction(() => window.jeuAris?.banque.pret);

// Fige l'animation : on dessine nous-mêmes des états choisis.
await page.evaluate(() => {
  window.requestAnimationFrame = () => 0;
});

const scene = (reglages) =>
  page.evaluate((r) => {
    const { jeu, rendu, hud, commandes } = window.jeuAris;
    commandes.demarrer();
    jeu.phase = 'jeu';
    jeu.message.texte = jeu.mode.messageDepart;
    jeu.obstacles = [];
    jeu.joueur.voie = r.voie ?? 1;
    jeu.joueur.x = jeu.route.centreVoie(jeu.joueur.voie);
    jeu.defilement = r.defilement ?? 0;
    jeu.meteo.actuelle = r.meteo ?? 'sec';
    jeu.meteo.intensitePluie = r.meteo === 'pluie' ? 1 : 0;
    jeu.meteo.intensiteVerglas = r.meteo === 'verglas' ? 1 : 0;
    jeu.meteo.annonce = r.annonce ?? 0;
    jeu.serie = r.serie ?? 0;
    jeu.score = r.score ?? 0;
    jeu.voituresEvitees = r.score ?? 0;
    jeu.nitro.jauge = r.nitro ?? 1;
    jeu.nitro.actif = Boolean(r.nitroActif);
    for (const [voie, y, sprite] of r.voitures) {
      const o = {
        voie, x: jeu.route.centreVoie(voie), y, largeur: 48, hauteur: 89, vitesse: 0, vx: 0,
        angle: 0, rotation: 0, accidente: false, compte: false, ecartMin: Infinity, phase: 1,
        sprite, couleurSecours: 'royalblue',
      };
      jeu.obstacles.push(o);
    }
    if (r.particules) {
      for (let i = 0; i < 140; i++) {
        jeu.particules.push({
          type: 'goutte', x: Math.random() * 380 - 10, y: Math.random() * 540, vx: -60, vy: 900,
          vie: 0.8, age: Math.random() * 0.5, taille: 14 + Math.random() * 10,
        });
      }
    }
    rendu.dessiner(jeu);
    hud.rafraichir(jeu);
  }, reglages);

const capturer = async (nom) => {
  await page.screenshot({ path: `${SORTIE}${nom}.jpg`, type: 'jpeg', quality: 82 });
  console.log('✓', nom);
};

await scene({
  voie: 1, score: 42, serie: 12, nitro: 0.7,
  voitures: [[0, 60, 'voiture-verte'], [2, 210, 'voiture-jaune'], [1, -30, 'voiture-bleue']],
});
await capturer('jeu-jour');

await scene({
  voie: 2, score: 58, serie: 21, nitro: 1, defilement: 3600 * 20 * 0.55,
  voitures: [[0, 120, 'voiture-bleue'], [1, 10, 'voiture-verte']],
});
await capturer('jeu-nuit');

await scene({
  voie: 1, score: 31, serie: 6, meteo: 'pluie', annonce: 1.8, particules: true,
  voitures: [[0, 140, 'voiture-jaune'], [2, 40, 'voiture-verte']],
});
await capturer('jeu-pluie');

await navigateur.close();
