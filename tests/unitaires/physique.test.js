import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { G, PAS_PHYSIQUE, PX_PAR_METRE } from '../../src/config/constantes.js';
import { adherence } from '../../src/meteo/conditions.js';
import { mettreAJourDirection } from '../../src/physique/direction.js';
import { mettreAJourMoteur, vitesseCibleKmh } from '../../src/physique/moteur.js';
import { PHASES } from '../../src/etat/jeu.js';
import { kmhVersPx, pxVersKmh } from '../../src/utilitaires/maths.js';
import { nouveauJeu } from '../aide.js';

/** Fait tourner uniquement le moteur pendant `secondes`. */
function rouler(jeu, secondes) {
  jeu.phase = PHASES.JEU;
  const pas = Math.round(secondes / PAS_PHYSIQUE);
  let accelMax = 0;
  for (let i = 0; i < pas; i++) {
    const avant = jeu.joueur.vitesse / PX_PAR_METRE;
    mettreAJourMoteur(jeu, PAS_PHYSIQUE);
    accelMax = Math.max(accelMax, (jeu.joueur.vitesse / PX_PAR_METRE - avant) / PAS_PHYSIQUE);
  }
  return accelMax;
}

describe('moteur', () => {
  it('maintient la vitesse de départ (90 km/h) sans dériver', () => {
    const jeu = nouveauJeu();
    rouler(jeu, 20);
    assert.ok(Math.abs(pxVersKmh(jeu.joueur.vitesse) - 90) < 1);
  });

  it('accélère vers la vitesse visée, qui monte de 2,5 km/h par voiture évitée', () => {
    const jeu = nouveauJeu();
    jeu.voituresEvitees = 20; // visée : 90 + 20 × 2,5 = 140 km/h
    assert.equal(vitesseCibleKmh(jeu), 140);
    rouler(jeu, 40);
    const kmh = pxVersKmh(jeu.joueur.vitesse);
    assert.ok(Math.abs(kmh - 140) < 2, `vitesse : ${kmh}`);
  });

  it('plafonne la vitesse visée à 180 km/h', () => {
    const jeu = nouveauJeu();
    jeu.voituresEvitees = 1000;
    assert.equal(vitesseCibleKmh(jeu), 180);
  });

  it('ralentit sous la pluie (visée × 0,82) et sur le verglas (visée × 0,65)', () => {
    const pluie = nouveauJeu();
    pluie.meteo.intensitePluie = 1;
    rouler(pluie, 25);
    assert.ok(Math.abs(pxVersKmh(pluie.joueur.vitesse) - 90 * 0.82) < 1.5);

    const verglas = nouveauJeu();
    verglas.meteo.intensiteVerglas = 1;
    rouler(verglas, 25);
    assert.ok(Math.abs(pxVersKmh(verglas.joueur.vitesse) - 90 * 0.65) < 1.5);
  });

  it('freine quand la vitesse dépasse la visée, sans jamais devenir négative', () => {
    const jeu = nouveauJeu();
    jeu.joueur.vitesse = kmhVersPx(150);
    rouler(jeu, 30);
    assert.ok(jeu.joueur.vitesse >= 0);
    assert.ok(Math.abs(pxVersKmh(jeu.joueur.vitesse) - 90) < 1.5);
  });

  it('le nitro multiplie la puissance et relève la vitesse visée de 70 km/h', () => {
    const sans = nouveauJeu();
    const avec = nouveauJeu();
    avec.nitro.actif = true;
    assert.equal(vitesseCibleKmh(avec), vitesseCibleKmh(sans) + 70);
    rouler(sans, 3);
    rouler(avec, 3);
    assert.ok(avec.joueur.vitesse > sans.joueur.vitesse + kmhVersPx(20));
  });

  it('ne dépasse jamais l’adhérence des pneus : accélération ≤ μ·g', () => {
    for (const [nom, regler] of [
      ['sec', () => {}],
      ['pluie', (m) => (m.intensitePluie = 1)],
      ['verglas', (m) => (m.intensiteVerglas = 1)],
    ]) {
      const jeu = nouveauJeu();
      regler(jeu.meteo);
      jeu.joueur.vitesse = kmhVersPx(5); // départ presque arrêté : tout le couple est demandé
      jeu.voituresEvitees = 40;
      const accelMax = rouler(jeu, 6);
      const limite = adherence(jeu.meteo) * G;
      assert.ok(
        accelMax <= limite + 1e-6,
        `${nom} : ${accelMax.toFixed(2)} m/s² > ${limite.toFixed(2)}`,
      );
    }
  });

  it('est déterministe : mêmes entrées, même vitesse au bit près', () => {
    const a = nouveauJeu();
    const b = nouveauJeu();
    rouler(a, 10);
    rouler(b, 10);
    assert.equal(a.joueur.vitesse, b.joueur.vitesse);
  });
});

describe('direction', () => {
  /** Change de voie et renvoie { temps pour 90 % du trajet, accélération latérale max, dépassement }. */
  function changerDeVoie(reglerMeteo) {
    const jeu = nouveauJeu();
    reglerMeteo(jeu.meteo);
    jeu.phase = PHASES.JEU;
    const joueur = jeu.joueur;
    const depart = joueur.x;
    const cible = jeu.route.centreVoie(2);
    joueur.voie = 2;
    let temps90 = null;
    let accelMax = 0;
    let depassement = 0;
    for (let i = 0; i < 360; i++) {
      mettreAJourDirection(jeu, PAS_PHYSIQUE);
      const t = (i + 1) * PAS_PHYSIQUE;
      if (temps90 === null && joueur.x - depart >= 0.9 * (cible - depart)) temps90 = t;
      accelMax = Math.max(accelMax, Math.abs(joueur.ax));
      depassement = Math.max(depassement, joueur.x - cible);
    }
    return { temps90, accelMax, depassement, jeu };
  }

  it('change de voie en ≈ 0,3 s sur route sèche, sans téléportation', () => {
    const { temps90, jeu } = changerDeVoie(() => {});
    assert.ok(temps90 > 0.25 && temps90 < 0.45, `temps : ${temps90}`);
    assert.ok(Math.abs(jeu.joueur.x - jeu.route.centreVoie(2)) < 0.5, 'la voiture finit centrée');
  });

  it('met plus de temps et dépasse sa voie sur le verglas', () => {
    const sec = changerDeVoie(() => {});
    const verglas = changerDeVoie((m) => (m.intensiteVerglas = 1));
    assert.ok(verglas.temps90 > sec.temps90 * 1.3, `${verglas.temps90} vs ${sec.temps90}`);
    assert.ok(verglas.depassement > 5 && sec.depassement < 2);
  });

  it('limite l’accélération latérale selon l’adhérence', () => {
    const sec = changerDeVoie(() => {});
    const pluie = changerDeVoie((m) => (m.intensitePluie = 1));
    assert.ok(sec.accelMax <= 2600 + 1e-6);
    assert.ok(pluie.accelMax <= (2600 * 0.55) / 0.9 + 1e-6);
  });

  it('incline la voiture dans le sens du mouvement, sans dépasser 0,5 rad', () => {
    const jeu = nouveauJeu();
    jeu.phase = PHASES.JEU;
    jeu.joueur.voie = 2;
    let angleMax = 0;
    for (let i = 0; i < 120; i++) {
      mettreAJourDirection(jeu, PAS_PHYSIQUE);
      angleMax = Math.max(angleMax, jeu.joueur.angle);
    }
    assert.ok(angleMax > 0.05 && angleMax <= 0.5);
  });

  it('reste centrée sur sa voie sur route sèche', () => {
    const jeu = nouveauJeu();
    jeu.phase = PHASES.JEU;
    for (let i = 0; i < 600; i++) mettreAJourDirection(jeu, PAS_PHYSIQUE);
    assert.ok(Math.abs(jeu.joueur.x - jeu.route.centreVoie(1)) < 1e-6);
  });

  it('dérive sur le verglas même sans toucher au volant', () => {
    const jeu = nouveauJeu();
    jeu.meteo.intensiteVerglas = 1;
    jeu.phase = PHASES.JEU;
    let ecartMax = 0;
    for (let i = 0; i < 600; i++) {
      jeu.defilement += kmhVersPx(60) * PAS_PHYSIQUE;
      mettreAJourDirection(jeu, PAS_PHYSIQUE);
      ecartMax = Math.max(ecartMax, Math.abs(jeu.joueur.x - jeu.route.centreVoie(1)));
    }
    assert.ok(ecartMax > 0.5, `écart max : ${ecartMax}`);
  });

  it('marque des traces de pneus quand la voiture glisse, pas sur le verglas où la gomme ne marque pas', () => {
    const jeu = nouveauJeu();
    jeu.phase = PHASES.JEU;
    jeu.joueur.voie = 2;
    for (let i = 0; i < 120; i++) mettreAJourDirection(jeu, PAS_PHYSIQUE);
    assert.ok(jeu.traces.length > 0, 'traces sur le sec');

    const glace = nouveauJeu();
    glace.meteo.intensiteVerglas = 1;
    glace.phase = PHASES.JEU;
    glace.joueur.voie = 2;
    for (let i = 0; i < 120; i++) mettreAJourDirection(glace, PAS_PHYSIQUE);
    assert.equal(glace.traces.length, 0);
  });
});
