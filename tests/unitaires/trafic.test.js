import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HAUTEUR } from '../../src/config/constantes.js';
import { PHASES } from '../../src/etat/jeu.js';
import { creerRoute } from '../../src/route/route.js';
import {
  creerObstacle,
  creerVague,
  creerVaguesDeTrafic,
  deplacerObstacles,
  vitesseRelativeTrafic,
} from '../../src/systemes/trafic.js';
import { kmhVersPx } from '../../src/utilitaires/maths.js';
import { creerAleaAvecGraine } from '../../src/utilitaires/alea.js';
import { nouveauJeu } from '../aide.js';

describe('vagues de trafic', () => {
  for (const nbVoies of [1, 2, 3, 4, 5, 6]) {
    it(`laisse toujours une voie libre sur une route à ${nbVoies} voie(s)`, () => {
      const jeu = nouveauJeu({ route: creerRoute({ nbVoies }) });
      for (let i = 0; i < 500; i++) {
        jeu.obstacles = [];
        jeu.voituresEvitees = i; // proba de 2 voitures croissante
        creerVague(jeu);
        const voies = jeu.obstacles.map((o) => o.voie);
        assert.equal(new Set(voies).size, voies.length, 'pas deux voitures sur la même voie');
        assert.ok(voies.length <= Math.max(0, nbVoies - 1), 'au moins une voie libre');
        assert.ok(voies.every((v) => v >= 0 && v < nbVoies));
        if (nbVoies >= 2) assert.ok(voies.length >= 1 && voies.length <= 2);
        else assert.equal(voies.length, 0, 'aucune voiture possible sur une seule voie');
      }
    });
  }

  it('utilise les deux nombres de voitures (1 ou 2) sur trois voies', () => {
    const jeu = nouveauJeu({ alea: creerAleaAvecGraine(5) });
    jeu.voituresEvitees = 30;
    const tailles = new Set();
    for (let i = 0; i < 100; i++) {
      jeu.obstacles = [];
      creerVague(jeu);
      tailles.add(jeu.obstacles.length);
    }
    assert.deepEqual([...tailles].sort(), [1, 2]);
  });

  it('est reproductible : même graine, mêmes vagues', () => {
    const lancer = () => {
      const jeu = nouveauJeu({ alea: creerAleaAvecGraine(99) });
      for (let i = 0; i < 20; i++) creerVague(jeu);
      return jeu.obstacles.map((o) => [o.voie, o.y, o.sprite]);
    };
    assert.deepEqual(lancer(), lancer());
  });

  it('ne crée rien tant que le joueur ne roule pas plus vite que le trafic', () => {
    const jeu = nouveauJeu();
    jeu.joueur.vitesse = kmhVersPx(40); // plus lent que le trafic (50 km/h)
    assert.ok(vitesseRelativeTrafic(jeu) < 0);
    for (let i = 0; i < 1000; i++) creerVaguesDeTrafic(jeu, 1 / 120);
    assert.equal(jeu.obstacles.length, 0);
  });

  it('espace davantage les vagues sur route glissante (plus de temps pour réagir)', () => {
    const nombreDeVagues = (reglerMeteo) => {
      const jeu = nouveauJeu();
      reglerMeteo(jeu.meteo);
      jeu.joueur.vitesse = kmhVersPx(90);
      let vagues = 0;
      for (let i = 0; i < 120 * 30; i++) {
        const avant = jeu.distanceDepuisVague;
        creerVaguesDeTrafic(jeu, 1 / 120);
        if (jeu.distanceDepuisVague < avant) vagues++;
      }
      return vagues;
    };
    const sec = nombreDeVagues(() => {});
    const verglas = nombreDeVagues((m) => (m.intensiteVerglas = 1));
    assert.ok(verglas < sec, `${verglas} vagues sur verglas, ${sec} sur sec`);
  });
});

describe('voitures du trafic', () => {
  it('apparaissent juste au-dessus du Canvas, au centre de leur voie', () => {
    const jeu = nouveauJeu();
    for (let voie = 0; voie < 3; voie++) {
      const o = creerObstacle(jeu, voie);
      assert.ok(o.y + o.hauteur < 0, 'hors écran à la création');
      assert.equal(o.x, jeu.route.centreVoie(voie));
      assert.ok(['voiture-verte', 'voiture-jaune', 'voiture-bleue'].includes(o.sprite));
    }
  });

  it('descendent à la vitesse relative v_joueur − v_trafic', () => {
    const jeu = nouveauJeu();
    jeu.joueur.vitesse = kmhVersPx(90);
    const o = creerObstacle(jeu, 0);
    const y0 = o.y;
    deplacerObstacles(jeu, 1);
    assert.ok(Math.abs(o.y - y0 - (kmhVersPx(90) - kmhVersPx(50))) < 1e-9);
  });

  it('sont supprimées une fois sorties par le bas de l’écran', () => {
    const jeu = nouveauJeu();
    const o = creerObstacle(jeu, 0);
    o.y = HAUTEUR + 10;
    deplacerObstacles(jeu, 1 / 120);
    assert.equal(jeu.obstacles.length, 1);
    o.y = HAUTEUR + 30;
    deplacerObstacles(jeu, 1 / 120);
    assert.equal(jeu.obstacles.length, 0);
  });

  it('louvoient sur le verglas mais roulent droit sur le sec', () => {
    const jeu = nouveauJeu();
    jeu.phase = PHASES.JEU;
    const o = creerObstacle(jeu, 0);
    deplacerObstacles(jeu, 1 / 120);
    assert.equal(o.angle, 0);
    jeu.meteo.intensiteVerglas = 1;
    jeu.defilement = 1000;
    o.y = 100;
    deplacerObstacles(jeu, 1 / 120);
    assert.notEqual(o.angle, 0);
    assert.ok(Math.abs(o.angle) <= 0.07);
  });
});
