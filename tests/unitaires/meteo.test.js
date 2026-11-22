import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { G } from '../../src/config/constantes.js';
import {
  adherence,
  deriveVerglas,
  facteurMeteo,
  forceAdherence,
} from '../../src/meteo/conditions.js';
import { changerMeteo, mettreAJourMeteo } from '../../src/meteo/meteo.js';
import { PHASES } from '../../src/etat/jeu.js';
import { creerAleaAvecGraine } from '../../src/utilitaires/alea.js';
import { avancer, demarrerPartie, espionner, nouveauJeu } from '../aide.js';

const proche = (a, b, tolerance = 1e-9) => Math.abs(a - b) <= tolerance;

describe('adhérence selon la météo', () => {
  it('vaut μ = 0,90 sur route sèche, 0,55 sous la pluie, 0,20 sur le verglas', () => {
    const { meteo } = nouveauJeu();
    assert.equal(adherence(meteo), 0.9);
    meteo.intensitePluie = 1;
    assert.equal(adherence(meteo), 0.55);
    meteo.intensitePluie = 0;
    meteo.intensiteVerglas = 1;
    assert.ok(proche(adherence(meteo), 0.2));
  });

  it('varie progressivement pendant une transition', () => {
    const { meteo } = nouveauJeu();
    meteo.intensitePluie = 0.5;
    assert.ok(proche(adherence(meteo), (0.9 + 0.55) / 2));
    assert.ok(proche(facteurMeteo(meteo, 'vitesseMax'), (1 + 0.82) / 2));
  });

  it('chute sur une flaque (aquaplaning, μ = 0,10) et sur une plaque de verglas (μ = 0,06)', () => {
    const { meteo } = nouveauJeu();
    meteo.surDanger = 'flaque';
    assert.equal(adherence(meteo), 0.1);
    meteo.surDanger = 'verglas';
    assert.equal(adherence(meteo), 0.06);
  });

  it('ne dépasse jamais l’adhérence du danger, même quand la météo est déjà pire', () => {
    const { meteo } = nouveauJeu();
    meteo.intensiteVerglas = 1;
    meteo.surDanger = 'flaque';
    assert.equal(adherence(meteo), 0.1);
  });

  it('donne la force maximale transmissible μ·m·g', () => {
    const { meteo, joueur } = nouveauJeu();
    assert.ok(proche(forceAdherence(meteo, joueur.caracteristiques), 0.9 * 1200 * G));
    meteo.intensiteVerglas = 1;
    assert.ok(proche(forceAdherence(meteo, joueur.caracteristiques), 0.2 * 1200 * G));
  });

  it('ne fait dériver la voiture que sur le verglas', () => {
    const { meteo } = nouveauJeu();
    assert.equal(deriveVerglas(meteo, 5000), 0);
    meteo.intensiteVerglas = 1;
    assert.notEqual(deriveVerglas(meteo, 5000), 0);
  });
});

describe('évolution de la météo', () => {
  it('passe du sec à la pluie ou au verglas, puis revient au sec, en annonçant chaque changement', () => {
    const jeu = nouveauJeu();
    const evenements = espionner(jeu, ['meteo']);
    changerMeteo(jeu);
    assert.ok(['pluie', 'verglas'].includes(jeu.meteo.actuelle));
    assert.ok(jeu.meteo.annonce > 0);
    assert.match(jeu.message.texte, /—/);
    changerMeteo(jeu);
    assert.equal(jeu.meteo.actuelle, 'sec');
    assert.deepEqual(
      evenements.map((e) => e.nom),
      ['meteo', 'meteo'],
    );
    assert.equal(evenements[1].donnees.type, 'sec');
  });

  it('choisit pluie ou verglas selon le hasard du jeu (graine → même résultat)', () => {
    const resultats = new Set();
    for (let graine = 1; graine <= 40; graine++) {
      const jeu = nouveauJeu({ alea: creerAleaAvecGraine(graine) });
      changerMeteo(jeu);
      resultats.add(jeu.meteo.actuelle);
    }
    assert.deepEqual([...resultats].sort(), ['pluie', 'verglas']);
  });

  it('fait monter l’intensité de la pluie en ≈ 2 s (transition douce)', () => {
    const jeu = nouveauJeu();
    jeu.meteo.actuelle = 'pluie';
    avancer(jeu, 1);
    assert.ok(
      proche(jeu.meteo.intensitePluie, 0.5, 0.02),
      `après 1 s : ${jeu.meteo.intensitePluie}`,
    );
    avancer(jeu, 1.5);
    assert.equal(jeu.meteo.intensitePluie, 1);
  });

  it('change de temps après la distance prévue, en phase de jeu seulement', () => {
    const jeu = nouveauJeu();
    jeu.meteo.distanceRestante = 5;
    mettreAJourMeteo(jeu, 0.1); // phase « attente » : rien ne se passe
    assert.equal(jeu.meteo.actuelle, 'sec');
    jeu.phase = PHASES.JEU;
    for (let i = 0; i < 20; i++) mettreAJourMeteo(jeu, 0.1);
    assert.notEqual(jeu.meteo.actuelle, 'sec');
  });
});

describe('dangers de la chaussée', () => {
  it('dépose des flaques sous la pluie et des plaques sur le verglas', () => {
    for (const [temps, type] of [
      ['pluie', 'flaque'],
      ['verglas', 'verglas'],
    ]) {
      const jeu = nouveauJeu();
      demarrerPartie(jeu);
      jeu.meteo.distanceRestante = 1e9; // pas de changement de temps pendant le test
      jeu.meteo.actuelle = temps;
      const typesVus = new Set();
      for (let i = 0; i < 8; i++) {
        avancer(jeu, 1);
        for (const d of jeu.dangers) typesVus.add(d.type);
      }
      assert.deepEqual([...typesVus], [type], `dangers vus avec ${temps}`);
    }
  });

  it('limite l’adhérence et signale l’événement quand les roues entrent sur une flaque', () => {
    const jeu = nouveauJeu();
    demarrerPartie(jeu);
    jeu.meteo.distanceRestante = 1e9;
    const evenements = espionner(jeu, ['danger']);
    jeu.dangers.push({
      type: 'flaque',
      x: jeu.joueur.x,
      y: jeu.joueur.y - 10,
      largeur: 70,
      hauteur: 80,
      touche: false,
    });
    mettreAJourMeteo(jeu, 1 / 120);
    assert.equal(jeu.meteo.surDanger, 'flaque');
    assert.equal(adherence(jeu.meteo), 0.1);
    assert.equal(evenements.length, 1);
    mettreAJourMeteo(jeu, 1 / 120);
    assert.equal(evenements.length, 1, 'un seul événement par flaque');
  });
});
