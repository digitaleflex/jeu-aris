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
async function ouvrir(options = devices['iPhone 13'], contexteExistant = null) {
  const contexte = contexteExistant ?? (await navigateur.newContext(options));
  const page = await contexte.newPage();
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && erreurs.push(m.text()));
  await page.goto(URL_JEU);
  await page.waitForFunction(() => window.jeuAris?.banque.pret, null, { timeout: 8000 });
  return { page, contexte, erreurs };
}

const phase = (page) => page.evaluate(() => window.jeuAris.jeu.phase);
const etat = (page) =>
  page.evaluate(() => ({
    phase: window.jeuAris.jeu.phase,
    voie: window.jeuAris.jeu.joueur.voie,
    nitro: window.jeuAris.jeu.nitro.actif,
    score: window.jeuAris.jeu.score,
  }));
const visible = (page, selecteur) => page.isVisible(selecteur);

/** Accueil → nom → carte Esquive → règles → « C'est parti ! » : la partie démarre. */
async function lancerPartie(page, nom = 'Léa') {
  await page.fill('#nomJoueur', nom);
  await page.click('#boutonContinuer');
  await page.click('.carte-mode[data-mode="esquive"]');
  await page.click('#boutonLancerMode');
  await page.waitForFunction(() => window.jeuAris.jeu.phase === 'jeu', null, { timeout: 6000 });
  // Pas de trafic gênant pendant les tests de commandes
  await page.evaluate(() => {
    window.jeuAris.jeu.obstacles = [];
    window.jeuAris.jeu.reglages = { ...window.jeuAris.jeu.reglages, vitesseTraficKmh: 89 };
  });
}

/** Provoque un accident en posant une voiture sur celle du joueur. */
async function provoquerAccident(page) {
  await page.evaluate(() => {
    const { jeu } = window.jeuAris;
    jeu.obstacles.push({
      voie: jeu.joueur.voie,
      x: jeu.joueur.x,
      y: jeu.joueur.y - 80,
      largeur: 48,
      hauteur: 89,
      vitesse: 0,
      vx: 0,
      angle: 0,
      rotation: 0,
      accidente: false,
      compte: false,
      ecartMin: Infinity,
      phase: 0,
      sprite: 'voiture-verte',
      couleurSecours: 'royalblue',
    });
  });
  await page.waitForFunction(() => window.jeuAris.jeu.phase === 'fini', null, { timeout: 8000 });
}

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

describe('accueil et saisie du nom', () => {
  it('s’ouvre sur l’accueil, sans erreur, avec les autres écrans cachés', async () => {
    const { page, contexte, erreurs } = await ouvrir();
    assert.equal(await phase(page), 'accueil');
    assert.equal(await visible(page, '#ecranAccueil'), true);
    for (const id of ['#ecranChoixMode', '#ecranRegles', '#ecranFin']) {
      assert.equal(await visible(page, id), false, id);
    }
    assert.deepEqual(erreurs, []);
    await contexte.close();
  });

  it('valide le nom en direct : trop court refusé, valide accepté', async () => {
    const { page, contexte } = await ouvrir();
    await page.fill('#nomJoueur', 'A');
    assert.equal(await page.isDisabled('#boutonContinuer'), true);
    assert.equal(await visible(page, '#erreurNom'), true);
    assert.match(await page.textContent('#erreurNom'), /entre 2 et 12 caractères/);
    await page.fill('#nomJoueur', 'Léa');
    assert.equal(await page.isDisabled('#boutonContinuer'), false);
    assert.equal(await visible(page, '#erreurNom'), false);
    await contexte.close();
  });

  it('Entrée valide le nom et ouvre le choix du mode', async () => {
    const { page, contexte } = await ouvrir();
    await page.fill('#nomJoueur', 'Léa');
    await page.press('#nomJoueur', 'Enter');
    assert.equal(await phase(page), 'choixMode');
    assert.match(await page.textContent('#joueurActuel'), /Léa/);
    assert.equal(await visible(page, '#ecranAccueil'), false);
    await contexte.close();
  });

  it('propose les 3 derniers noms en un clic après un rechargement', async () => {
    const { page, contexte } = await ouvrir();
    for (const nom of ['Léa', 'Tom', 'Inès', 'Max']) {
      await page.evaluate(() => window.jeuAris.jeu.evenements.emettre('navigation'));
      await page.fill('#nomJoueur', nom);
      await page.click('#boutonContinuer');
      await page.click('#boutonChangerJoueur');
    }
    await page.reload();
    await page.waitForFunction(() => window.jeuAris?.banque.pret);
    const noms = await page.locator('.nom-recent').allTextContents();
    assert.deepEqual(noms, ['Max', 'Inès', 'Tom']);
    await page.click('.nom-recent >> text=Tom');
    assert.equal(await page.inputValue('#nomJoueur'), 'Tom');
    assert.equal(await page.isDisabled('#boutonContinuer'), false);
    await contexte.close();
  });

  it('le champ de saisie garde le clavier : pas de commande de jeu pendant la frappe', async () => {
    const { page, contexte } = await ouvrir();
    await page.focus('#nomJoueur');
    for (const touche of ['ArrowLeft', 'ArrowUp', 'm', ' ']) await page.keyboard.press(touche);
    assert.equal(await phase(page), 'accueil');
    assert.equal((await etat(page)).nitro, false);
    await contexte.close();
  });
});

describe('choix du mode et règles', () => {
  it('génère 5 cartes dont une seule jouable (Esquive), avec le record du joueur', async () => {
    const { page, contexte } = await ouvrir();
    await page.evaluate(() => localStorage.setItem('record.esquive.Léa', '31'));
    await page.fill('#nomJoueur', 'Léa');
    await page.click('#boutonContinuer');
    assert.equal(await page.locator('.carte-mode').count(), 5);
    assert.equal(await page.locator('.carte-mode:not([disabled])').count(), 1);
    assert.equal(await page.getAttribute('.carte-mode >> nth=0', 'data-mode'), 'esquive');
    assert.match(await page.textContent('.carte-mode >> nth=0'), /Record : 31/);
    assert.equal(await page.locator('.bientot').count(), 4);
    await contexte.close();
  });

  it('la carte ouvre les règles (3 lignes) ; Échap revient au choix puis à l’accueil', async () => {
    const { page, contexte } = await ouvrir();
    await page.fill('#nomJoueur', 'Léa');
    await page.click('#boutonContinuer');
    await page.click('.carte-mode[data-mode="esquive"]');
    assert.equal(await visible(page, '#ecranRegles'), true);
    assert.equal(await page.locator('#reglesTexte li').count(), 3);
    assert.equal(await phase(page), 'choixMode', 'les règles ne sont pas une phase');
    await page.keyboard.press('Escape');
    assert.equal(await visible(page, '#ecranChoixMode'), true);
    await page.keyboard.press('Escape');
    assert.equal(await phase(page), 'accueil');
    await contexte.close();
  });

  it('les flèches déplacent le focus entre les cartes jouables', async () => {
    const { page, contexte } = await ouvrir();
    await page.fill('#nomJoueur', 'Léa');
    await page.click('#boutonContinuer');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.mode), 'esquive');
    await contexte.close();
  });

  it('« Ne plus afficher » lance directement la partie la fois suivante', async () => {
    const { page, contexte } = await ouvrir();
    await page.fill('#nomJoueur', 'Léa');
    await page.click('#boutonContinuer');
    await page.click('.carte-mode[data-mode="esquive"]');
    await page.check('#caseNePlusAfficher');
    await page.click('#boutonLancerMode');
    await page.waitForFunction(() => window.jeuAris.jeu.phase === 'jeu', null, { timeout: 6000 });
    await page.evaluate(() => window.jeuAris.jeu.evenements.emettre('fin', {}));
    await provoquerAccident(page);
    await page.click('#boutonChangerMode');
    await page.click('.carte-mode[data-mode="esquive"]');
    assert.equal(await phase(page), 'compte', 'plus de règles : la partie démarre');
    await contexte.close();
  });

  it('applique la difficulté choisie au départ et la mémorise après rechargement', async () => {
    const { page, contexte } = await ouvrir();
    await page.fill('#nomJoueur', 'Léa');
    await page.click('#boutonContinuer');
    await page.check('#difficulteFacile');
    await page.click('.carte-mode[data-mode="esquive"]');
    await page.click('#boutonLancerMode');
    const vitesse = await page.evaluate(() => (window.jeuAris.jeu.joueur.vitesse / 20) * 3.6);
    assert.ok(Math.abs(vitesse - 70) < 1, `vitesse de départ : ${vitesse}`);
    await page.reload();
    await page.waitForFunction(() => window.jeuAris?.banque.pret);
    assert.equal(await page.evaluate(() => window.jeuAris.jeu.difficulteId), 'facile');
    await page.fill('#nomJoueur', 'Léa');
    await page.click('#boutonContinuer');
    assert.equal(await page.isChecked('#difficulteFacile'), true);
    await contexte.close();
  });
});

describe('partie', () => {
  it('« C’est parti ! » cache les écrans et lance le compte à rebours puis le jeu', async () => {
    const { page, contexte } = await ouvrir();
    await page.fill('#nomJoueur', 'Léa');
    await page.click('#boutonContinuer');
    await page.click('.carte-mode[data-mode="esquive"]');
    await page.click('#boutonLancerMode');
    assert.equal(await phase(page), 'compte');
    assert.equal(await visible(page, '#ecrans'), false);
    await page.waitForFunction(() => window.jeuAris.jeu.phase === 'jeu', null, { timeout: 6000 });
    assert.equal(await page.textContent('#boutonRecommencer'), 'Recommencer');
    await contexte.close();
  });

  it('change de voie au clavier, avec les boutons et par swipe (mêmes commandes)', async () => {
    const { page, contexte } = await ouvrir();
    await lancerPartie(page);
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
    await lancerPartie(page);
    await glisser(page, contexte, 195, 480, 195, 300);
    assert.equal((await etat(page)).nitro, true);
    await contexte.close();
  });

  it('un toucher sur un écran ne déclenche pas de geste de jeu', async () => {
    const { page, contexte } = await ouvrir();
    await page.fill('#nomJoueur', 'Léa');
    await page.click('#boutonContinuer');
    await glisser(page, contexte, 120, 300, 300, 300);
    assert.equal(await phase(page), 'choixMode');
    assert.equal((await etat(page)).voie, 1);
    await contexte.close();
  });

  it('le bouton « Démarrer » (atteint au clavier) suit l’écran : nom, choix du mode, nouvelle partie', async () => {
    const { page, contexte } = await ouvrir();
    // Les écrans recouvrent le bouton : seul le clavier (Tab / focus + Entrée) l'atteint
    const activer = async () => {
      await page.focus('#boutonRecommencer');
      await page.keyboard.press('Enter');
    };
    await activer();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'nomJoueur');
    await page.fill('#nomJoueur', 'Léa');
    await page.click('#boutonContinuer');
    await activer();
    assert.equal(await visible(page, '#ecranChoixMode'), true);
    await contexte.close();
  });
});

describe('fin de partie', () => {
  it('affiche l’écran de fin, mémorise le record par joueur et par mode, et propose 3 choix', async () => {
    const { page, contexte, erreurs } = await ouvrir();
    await lancerPartie(page, 'Léa');
    await page.evaluate(() => {
      window.jeuAris.jeu.score = 42;
    });
    await provoquerAccident(page);
    assert.equal(await visible(page, '#ecranFin'), true);
    assert.match(await page.textContent('#finTitre'), /Bien joué Léa : 42 points/);
    assert.equal(await page.textContent('#finResultat'), '42 points');
    assert.match(
      await page.textContent('#finDetails'),
      /Combo max ×1 • Frôlements : 0 • Distance : \d+ m/,
    );
    assert.match(await page.textContent('#finMessage'), /Bravo Léa, nouveau record/);
    assert.equal(await page.evaluate(() => localStorage.getItem('record.esquive.Léa')), '42');
    assert.equal(await page.textContent('#record'), '42');
    for (const id of ['#boutonRejouer', '#boutonChangerMode', '#boutonChangerJoueurFin']) {
      assert.equal(await visible(page, id), true, id);
    }
    assert.equal(await page.evaluate(() => window.jeuAris.boucle.active), false, 'boucle arrêtée');
    assert.deepEqual(erreurs, []);
    await contexte.close();
  });

  it('dit combien de points il manque quand le record n’est pas battu', async () => {
    const { page, contexte } = await ouvrir();
    await page.evaluate(() => localStorage.setItem('record.esquive.Léa', '50'));
    await lancerPartie(page, 'Léa');
    await page.evaluate(() => {
      window.jeuAris.jeu.score = 47;
    });
    await provoquerAccident(page);
    assert.match(await page.textContent('#finMessage'), /Presque, Léa : 3 points de ton record/);
    assert.equal(await page.evaluate(() => localStorage.getItem('record.esquive.Léa')), '50');
    await contexte.close();
  });

  it('« Rejouer » relance une partie avec une seule boucle, sans rien dupliquer', async () => {
    const { page, contexte, erreurs } = await ouvrir();
    await lancerPartie(page);
    for (let manche = 0; manche < 3; manche++) {
      await provoquerAccident(page);
      await page.click('#boutonRejouer');
      assert.equal(await phase(page), 'compte');
      await page.waitForFunction(() => window.jeuAris.jeu.phase === 'jeu', null, { timeout: 6000 });
      await page.evaluate(() => {
        window.jeuAris.jeu.obstacles = [];
      });
    }
    assert.equal(await page.evaluate(() => window.jeuAris.boucle.active), true);
    assert.equal(await page.evaluate(() => window.jeuAris.jeu.score), 0, 'score remis à zéro');
    assert.deepEqual(erreurs, []);
    await contexte.close();
  });

  it('Espace, ou un toucher hors des boutons, rejoue', async () => {
    const { page, contexte } = await ouvrir();
    await lancerPartie(page);
    await provoquerAccident(page);
    await page.evaluate(() => document.activeElement.blur());
    await page.keyboard.press(' ');
    assert.equal(await phase(page), 'compte');
    await page.waitForFunction(() => window.jeuAris.jeu.phase === 'jeu', null, { timeout: 6000 });
    await provoquerAccident(page);
    await page.click('#finMessage');
    assert.equal(await phase(page), 'compte');
    await contexte.close();
  });

  it('« Changer de mode » et « Changer de joueur » ramènent aux bons écrans', async () => {
    const { page, contexte } = await ouvrir();
    await lancerPartie(page, 'Léa');
    await provoquerAccident(page);
    await page.click('#boutonChangerMode');
    assert.equal(await phase(page), 'choixMode');
    assert.equal(await visible(page, '#ecranChoixMode'), true);
    await page.click('.carte-mode[data-mode="esquive"]');
    await page.click('#boutonLancerMode');
    await page.waitForFunction(() => window.jeuAris.jeu.phase === 'jeu', null, { timeout: 6000 });
    await provoquerAccident(page);
    await page.click('#boutonChangerJoueurFin');
    assert.equal(await phase(page), 'accueil');
    assert.equal(await page.inputValue('#nomJoueur'), 'Léa');
    await contexte.close();
  });

  it('reprend l’ancien record unique pour le premier joueur', async () => {
    const { page, contexte } = await ouvrir();
    await page.evaluate(() => localStorage.setItem('recordVoiture', '77'));
    await page.fill('#nomJoueur', 'Tom');
    await page.click('#boutonContinuer');
    assert.equal(await page.textContent('#record'), '77');
    assert.equal(await page.evaluate(() => localStorage.getItem('recordVoiture')), null);
    assert.equal(await page.evaluate(() => localStorage.getItem('record.esquive.Tom')), '77');
    await contexte.close();
  });
});

describe('affichage', () => {
  it('ne déborde pas de l’écran sur un téléphone, jeu et écrans compris', async () => {
    for (const appareil of ['iPhone 13', 'iPhone SE', 'iPhone 13 landscape', 'Pixel 7']) {
      const { page, contexte } = await ouvrir(devices[appareil]);
      const mesurer = () =>
        page.evaluate(() => ({
          largeurPage: document.documentElement.scrollWidth,
          hauteurPage: document.documentElement.scrollHeight,
          largeurFenetre: innerWidth,
          hauteurFenetre: innerHeight,
          canvas: document.getElementById('canvasJeu').getBoundingClientRect().toJSON(),
        }));
      for (const [ecran, preparer] of [
        ['accueil', async () => {}],
        [
          'choix du mode',
          async () => {
            await page.fill('#nomJoueur', 'Léa');
            await page.click('#boutonContinuer');
          },
        ],
      ]) {
        await preparer();
        const m = await mesurer();
        assert.ok(
          m.largeurPage <= m.largeurFenetre,
          `${appareil} / ${ecran} : défilement horizontal`,
        );
        assert.ok(
          m.hauteurPage <= m.hauteurFenetre,
          `${appareil} / ${ecran} : défilement vertical`,
        );
        assert.ok(m.canvas.right <= m.largeurFenetre && m.canvas.left >= 0);
      }
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

  it('affiche un message d’aide si le jeu est ouvert depuis un fichier (file://)', async () => {
    const contexte = await navigateur.newContext();
    const page = await contexte.newPage();
    await page.goto(`file://${RACINE}index.html`);
    await page.waitForTimeout(300);
    assert.equal(await page.isVisible('#erreurChargement'), true);
    assert.match(await page.textContent('#erreurChargement'), /npm start/);
    await contexte.close();
  });
});
