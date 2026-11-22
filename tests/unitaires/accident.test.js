import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PHASES } from '../../src/etat/jeu.js';
import {
  detecterCollision,
  declencherAccident,
  mettreAJourAccident,
} from '../../src/systemes/accident.js';
import { creerObstacle } from '../../src/systemes/trafic.js';
import { kmhVersPx } from '../../src/utilitaires/maths.js';
import { avancer, demarrerPartie, espionner, nouveauJeu } from '../aide.js';

function jeuAvecVoitureDevant(voie) {
  const jeu = nouveauJeu();
  demarrerPartie(jeu);
  jeu.obstacles = [];
  const o = creerObstacle(jeu, voie);
  o.y = jeu.joueur.y - 60;
  return { jeu, o };
}

describe('détection de collision', () => {
  it('détecte une voiture qui chevauche celle du joueur', () => {
    const { jeu, o } = jeuAvecVoitureDevant(1);
    assert.equal(detecterCollision(jeu), o);
  });

  it('ignore les voitures des autres voies', () => {
    const { jeu } = jeuAvecVoitureDevant(0);
    assert.equal(detecterCollision(jeu), null);
  });

  it('ignore les voitures encore trop loin', () => {
    const { jeu, o } = jeuAvecVoitureDevant(1);
    o.y = jeu.joueur.y - 200;
    assert.equal(detecterCollision(jeu), null);
  });
});

describe('choc', () => {
  it('conserve la quantité de mouvement (masses égales) avec un coefficient de restitution de 0,3', () => {
    const { jeu, o } = jeuAvecVoitureDevant(1);
    const v1 = kmhVersPx(120);
    const v2 = o.vitesse;
    jeu.joueur.vitesse = v1;
    declencherAccident(jeu, o);
    assert.ok(
      Math.abs(jeu.joueur.vitesse + o.vitesse - (v1 + v2)) < 1e-9,
      'somme des vitesses conservée',
    );
    assert.ok(
      Math.abs(o.vitesse - jeu.joueur.vitesse - 0.3 * (v1 - v2)) < 1e-9,
      'vitesse de séparation = e × vitesse d’approche',
    );
    assert.ok(o.vitesse > jeu.joueur.vitesse, 'la voiture percutée repart plus vite');
  });

  it('fait passer la partie en phase « accident » et prévient l’interface', () => {
    const { jeu, o } = jeuAvecVoitureDevant(1);
    const evenements = espionner(jeu, ['accident', 'vibration']);
    jeu.nitro.actif = true;
    declencherAccident(jeu, o);
    assert.equal(jeu.phase, PHASES.ACCIDENT);
    assert.equal(jeu.nitro.actif, false);
    assert.equal(jeu.message.perdu, true);
    assert.equal(jeu.message.texte, 'Partie terminée !');
    assert.ok(o.accidente);
    assert.ok(jeu.tremblement > 0 && jeu.ralentiRestant > 0);
    assert.deepEqual(evenements.map((e) => e.nom).sort(), ['accident', 'vibration']);
    assert.ok(evenements.find((e) => e.nom === 'accident').donnees.intensite > 0);
  });

  it('un choc décentré fait tourner les voitures', () => {
    const { jeu, o } = jeuAvecVoitureDevant(1);
    o.x += 20;
    declencherAccident(jeu, o);
    assert.notEqual(jeu.joueur.rotation, 0);
    assert.ok(jeu.joueur.rotation * o.rotation < 0, 'sens de rotation opposés');
  });
});

describe('après le choc', () => {
  it('la voiture glisse jusqu’à l’arrêt puis la partie se termine avec l’événement « fin »', () => {
    const { jeu, o } = jeuAvecVoitureDevant(1);
    const evenements = espionner(jeu, ['fin']);
    declencherAccident(jeu, o);
    avancer(jeu, 3.2);
    assert.equal(jeu.phase, PHASES.FIN);
    assert.equal(evenements.length, 1);
    assert.equal(evenements[0].donnees.score, jeu.score);
  });

  it('rebondit sur les bords de la route sans en sortir', () => {
    const { jeu, o } = jeuAvecVoitureDevant(1);
    declencherAccident(jeu, o);
    jeu.joueur.vx = -2000;
    for (let i = 0; i < 300; i++) {
      mettreAJourAccident(jeu, 1 / 120);
      assert.ok(jeu.joueur.x >= jeu.route.gauche && jeu.joueur.x <= jeu.route.droite);
    }
  });

  it('glisse plus loin sur le verglas que sur le sec (frottement μ·g)', () => {
    const distance = (verglas) => {
      const { jeu, o } = jeuAvecVoitureDevant(1);
      if (verglas) jeu.meteo.intensiteVerglas = 1;
      declencherAccident(jeu, o);
      const avant = jeu.defilement;
      avancer(jeu, 2.5);
      return jeu.defilement - avant;
    };
    assert.ok(distance(true) > distance(false) * 1.5);
  });
});
