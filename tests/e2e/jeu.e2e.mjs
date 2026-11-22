/**
 * Tests de bout en bout : le vrai jeu dans un vrai navigateur (Playwright).
 *
 * Prérequis : `npx playwright install chromium` (une fois). Dans un
 * environnement où Chromium est déjà installé, indiquez son chemin avec
 * PLAYWRIGHT_CHROMIUM_PATH.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';

const RACINE = fileURLToPath(new URL('../../', import.meta.url));
const PORT = 8123;
const URL_JEU = `http://localhost:${PORT}/`;

let serveur;
let navigateur;

before(async () => {
  serveur = spawn(process.execPath, ['scripts/serve.mjs', String(PORT)], { cwd: RACINE });
  await new Promise((resolve, reject) => {
    serveur.stdout.on('data', (d) => String(d).includes('disponible') && resolve());
    serveur.on('error', reject);
    setTimeout(() => reject(new Error('le serveur ne démarre pas')), 5000);
  });
  navigateur = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
  });
});

after(async () => {
  await navigateur?.close();
  serveur?.kill();
});

/** Ouvre une page, et collecte les erreurs de la console. */
async function ouvrir(options = devices['iPhone 13']) {
  const contexte = await navigateur.newContext(options);
  const page = await contexte.newPage();
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && erreurs.push(m.text()));
  await page.goto(URL_JEU);
  await page.waitForFunction(() => window.jeuAris?.banque.pret, null, { timeout: 8000 });
  return { page, contexte, erreurs };
}

const etat = (page) =>
  page.evaluate(() => ({
    phase: window.jeuAris.jeu.phase,
    voie: window.jeuAris.jeu.joueur.voie,
    nitro: window.jeuAris.jeu.nitro.actif,
    score: window.jeuAris.jeu.score,
  }));

/** Envoie un vrai geste tactile (CDP) : un doigt qui glisse de (x0, y0) à (x1, y1). */
async function glisser(page, contexte, x0, y0, x1, y1) {
  const cdp = await contexte.newCDPSession(page);
  const toucher = (type, x, y) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
    });
  await toucher('touchStart', x0, y0);
  for (let i = 1; i <= 8; i++) {
    await toucher('touchMove', x0 + ((x1 - x0) * i) / 8, y0 + ((y1 - y0) * i) / 8);
    await page.waitForTimeout(15);
  }
  await toucher('touchEnd');
}

describe('jeu dans le navigateur', () => {
  it('se charge sans erreur et affiche l’écran d’attente', async () => {
    const { page, contexte, erreurs } = await ouvrir();
    assert.equal((await etat(page)).phase, 'attente');
    assert.deepEqual(erreurs, []);
    await contexte.close();
  });

  it('ne déborde pas de l’écran sur un téléphone, en portrait comme en paysage', async () => {
    for (const appareil of ['iPhone 13', 'iPhone SE', 'iPhone 13 landscape', 'Pixel 7']) {
      const { page, contexte } = await ouvrir(devices[appareil]);
      const mesures = await page.evaluate(() => ({
        largeurPage: document.documentElement.scrollWidth,
        hauteurPage: document.documentElement.scrollHeight,
        largeurFenetre: innerWidth,
        hauteurFenetre: innerHeight,
        canvas: document.getElementById('canvasJeu').getBoundingClientRect().toJSON(),
        recommencer: document.getElementById('boutonRecommencer').getBoundingClientRect().toJSON(),
      }));
      assert.ok(mesures.largeurPage <= mesures.largeurFenetre, `${appareil} : défilement horizontal`);
      assert.ok(mesures.hauteurPage <= mesures.hauteurFenetre, `${appareil} : défilement vertical`);
      assert.ok(mesures.canvas.right <= mesures.largeurFenetre && mesures.canvas.left >= 0);
      assert.ok(mesures.recommencer.bottom <= mesures.hauteurFenetre, `${appareil} : bouton coupé`);
      await contexte.close();
    }
  });

  it('adapte la netteté du Canvas à la densité de l’écran, sans changer son repère logique', async () => {
    const { page, contexte } = await ouvrir(devices['iPhone 13']); // facteur 3
    const { largeurPixels, largeurCss } = await page.evaluate(() => {
      const c = document.getElementById('canvasJeu');
      return { largeurPixels: c.width, largeurCss: parseFloat(c.style.width) };
    });
    assert.ok(largeurPixels >= largeurCss * 2.9, `${largeurPixels} px pour ${largeurCss} px CSS`);
    await contexte.close();
  });

  it('démarre une partie avec le bouton : compte à rebours puis jeu', async () => {
    const { page, contexte } = await ouvrir();
    await page.click('#boutonRecommencer');
    assert.equal((await etat(page)).phase, 'compte');
    await page.waitForFunction(() => window.jeuAris.jeu.phase === 'jeu', null, { timeout: 6000 });
    assert.equal(await page.textContent('#boutonRecommencer'), 'Recommencer');
    await contexte.close();
  });

  it('change de voie au clavier, avec les boutons et par swipe (mêmes commandes)', async () => {
    const { page, contexte } = await ouvrir();
    await page.click('#boutonRecommencer');
    await page.waitForFunction(() => window.jeuAris.jeu.phase === 'jeu', null, { timeout: 6000 });
    await page.evaluate(() => {
      window.jeuAris.jeu.obstacles = [];
      window.jeuAris.jeu.reglages.vitesseTraficKmh = 89; // pas de trafic gênant pendant le test
    });

    await page.keyboard.press('ArrowLeft');
    assert.equal((await etat(page)).voie, 0, 'clavier ←');
    await page.keyboard.press('ArrowLeft');
    assert.equal((await etat(page)).voie, 0, 'bord gauche : pas de sortie de route');
    await page.click('#boutonDroite');
    assert.equal((await etat(page)).voie, 1, 'bouton Droite');
    await glisser(page, contexte, 120, 400, 300, 400);
    assert.equal((await etat(page)).voie, 2, 'swipe vers la droite');
    await glisser(page, contexte, 300, 400, 100, 400);
    assert.equal((await etat(page)).voie, 0, 'long swipe vers la gauche : 2 voies');
    await contexte.close();
  });

  it('active le nitro par un swipe vers le haut', async () => {
    const { page, contexte } = await ouvrir();
    await page.click('#boutonRecommencer');
    await page.waitForFunction(() => window.jeuAris.jeu.phase === 'jeu', null, { timeout: 6000 });
    await glisser(page, contexte, 195, 480, 195, 300);
    assert.equal((await etat(page)).nitro, true);
    await contexte.close();
  });

  it('affiche un message d’aide si le jeu est ouvert depuis un fichier (file://)', async () => {
    const contexte = await navigateur.newContext();
    const page = await contexte.newPage();
    await page.goto(`file://${RACINE}index.html`);
    await page.waitForTimeout(300);
    assert.equal(await page.isVisible('#erreurChargement'), true);
    assert.match(await page.textContent('#erreurChargement'), /npm start/);
    await contexte.close();
  });

  it('une partie complète se termine par un accident et se relance proprement', async () => {
    const { page, contexte, erreurs } = await ouvrir();
    for (let manche = 0; manche < 2; manche++) {
      await page.click('#boutonRecommencer');
      await page.waitForFunction(() => window.jeuAris.jeu.phase === 'jeu', null, { timeout: 6000 });
      await page.evaluate(() => {
        const { jeu } = window.jeuAris;
        jeu.obstacles.push({
          voie: jeu.joueur.voie, x: jeu.joueur.x, y: jeu.joueur.y - 80, largeur: 48, hauteur: 89,
          vitesse: 0, vx: 0, angle: 0, rotation: 0, accidente: false, compte: false,
          ecartMin: Infinity, phase: 0, sprite: 'voiture-verte', couleurSecours: 'royalblue',
        });
      });
      await page.waitForFunction(() => window.jeuAris.jeu.phase === 'fini', null, { timeout: 8000 });
      assert.match(await page.textContent('#message'), /Partie terminée/);
    }
    assert.equal(await page.evaluate(() => window.jeuAris.boucle.active), false, 'boucle arrêtée à la fin');
    assert.deepEqual(erreurs, []);
    await contexte.close();
  });
});
