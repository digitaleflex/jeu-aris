const { test, expect } = require('@playwright/test');

const URL = '/index.html?test=1';

async function ouvrir(page) {
  const erreurs = [];
  page.on('pageerror', (e) => erreurs.push(String(e)));
  await page.goto(URL);
  return erreurs;
}

async function entrerNom(page, nom) {
  await page.locator('#nomJoueur').fill(nom);
  await page.locator('#boutonContinuer').click();
}

test('nom invalide refusé, nom valide mémorisé', async ({ page }) => {
  await ouvrir(page);
  await page.locator('#nomJoueur').fill('A');
  await expect(page.locator('#boutonContinuer')).toBeDisabled();
  await expect(page.locator('#erreurNom')).toBeVisible();
  await entrerNom(page, 'Léa');
  await expect(page.locator('#ecranChoixMode')).toBeVisible();
  await expect(page.locator('#joueurActuel')).toContainText('Léa');
  await page.reload();
  await expect(page.locator('#nomJoueur')).toHaveValue('Léa');
});

test('chaque mode se lance, se termine et se relance 5 fois', async ({ page }) => {
  const erreurs = await ouvrir(page);
  await entrerNom(page, 'Léa');
  const modes = ['esquive', 'course', 'chrono', 'zen', 'defi'];
  for (let tour = 0; tour < 5; tour++) {
    for (const mode of modes) {
      await page.evaluate((m) => window.__jeu.demarrerMode(m), mode);
      await expect(page.locator('#ecrans')).toBeHidden();
      await page.evaluate(() => window.__jeu.terminerPartie());
      await expect(page.locator('#ecranFin')).toBeVisible();
      await page.locator('#boutonRejouer').click();
      await expect(page.locator('#ecrans')).toBeHidden();
      await page.evaluate(() => window.__jeu.afficherChoixMode());
    }
  }
  expect(erreurs).toEqual([]);
});

test('changer de mode sans recharger la page', async ({ page }) => {
  await ouvrir(page);
  await entrerNom(page, 'Léa');
  await page.locator('.carte-mode[data-mode="esquive"]').click();
  await page.locator('#boutonLancerMode').click();
  await expect(page.locator('#ecrans')).toBeHidden();
  await page.evaluate(() => window.__jeu.afficherChoixMode());
  await page.locator('.carte-mode[data-mode="course"]').click();
  await expect(page.locator('#ecranRegles')).toBeVisible();
  await expect(page.locator('#reglesTitre')).toContainText('Course');
});

test('navigation au clavier puis au doigt', async ({ page, browserName }) => {
  await ouvrir(page);
  await page.locator('#nomJoueur').fill('Léa');
  await page.locator('#nomJoueur').press('Enter');
  await expect(page.locator('#ecranChoixMode')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await expect(page.locator('#ecranRegles')).toBeVisible();
  await page.locator('#boutonLancerMode').click();
  const canvas = page.locator('#canvasJeu');
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 60, box.y + box.height / 2, { steps: 5 });
  await page.mouse.up();
  // Le swipe n doit provoquer aucune erreur et laisser le jeu actif.
  expect(await page.evaluate(() => window.__jeu.etat)).not.toBe('fini');
});

test('stockage indisponible : aucun plantage', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() { throw new Error('stockage indisponible'); },
    });
  });
  const erreurs = await ouvrir(page);
  await entrerNom(page, 'Léa');
  await expect(page.locator('#ecranChoixMode')).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('portrait et paysage : aucun débordement horizontal', async ({ page }) => {
  await ouvrir(page);
  await entrerNom(page, 'Léa');
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    const large = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(large).toBe(false);
    await expect(page.locator('#ecranChoixMode')).toBeVisible();
  }
});

test('classement accessible et effacement confirmé', async ({ page }) => {
  await ouvrir(page);
  await entrerNom(page, 'Léa');
  await page.locator('#boutonClassement').click();
  await expect(page.locator('#ecranClassement')).toBeVisible();
  await page.locator('#boutonEffacerScores').click();
  await expect(page.locator('#confirmationEffacement')).toBeVisible();
  await page.locator('#boutonAnnulerEffacement').click();
  await expect(page.locator('#confirmationEffacement')).toBeHidden();
});
