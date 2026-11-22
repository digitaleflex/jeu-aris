import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { creerEmetteur } from '../../src/evenements.js';
import { creerAleaAvecGraine } from '../../src/utilitaires/alea.js';
import { kmhVersPx, limiter, pxVersKmh } from '../../src/utilitaires/maths.js';
import { ecrireStockage, lireStockage } from '../../src/utilitaires/stockage.js';

describe('maths', () => {
  it('limite une valeur à un intervalle', () => {
    assert.equal(limiter(5, 0, 1), 1);
    assert.equal(limiter(-5, 0, 1), 0);
    assert.equal(limiter(0.3, 0, 1), 0.3);
  });

  it('convertit km/h et px/s avec l’échelle 20 px = 1 m', () => {
    assert.equal(kmhVersPx(36), 200); // 36 km/h = 10 m/s = 200 px/s
    assert.equal(pxVersKmh(200), 36);
    assert.ok(Math.abs(pxVersKmh(kmhVersPx(123.4)) - 123.4) < 1e-9);
  });
});

describe('alea', () => {
  it('rejoue la même suite avec la même graine', () => {
    const a = creerAleaAvecGraine(7);
    const b = creerAleaAvecGraine(7);
    const suiteA = Array.from({ length: 20 }, a);
    const suiteB = Array.from({ length: 20 }, b);
    assert.deepEqual(suiteA, suiteB);
  });

  it('produit des suites différentes avec des graines différentes', () => {
    assert.notDeepEqual(
      Array.from({ length: 5 }, creerAleaAvecGraine(1)),
      Array.from({ length: 5 }, creerAleaAvecGraine(2)),
    );
  });

  it('renvoie des nombres dans [0, 1[ répartis uniformément', () => {
    const alea = creerAleaAvecGraine(123);
    let somme = 0;
    for (let i = 0; i < 20000; i++) {
      const x = alea();
      assert.ok(x >= 0 && x < 1);
      somme += x;
    }
    assert.ok(Math.abs(somme / 20000 - 0.5) < 0.01, 'moyenne proche de 0,5');
  });

  it('reste stable : la première valeur de la graine 1 est figée (mulberry32)', () => {
    assert.equal(creerAleaAvecGraine(1)(), 0.6270739405881613);
  });
});

describe('émetteur d’événements', () => {
  it('appelle les écouteurs dans l’ordre d’abonnement avec les données', () => {
    const emetteur = creerEmetteur();
    const journal = [];
    emetteur.sur('a', (d) => journal.push(['premier', d]));
    emetteur.sur('a', (d) => journal.push(['second', d]));
    emetteur.emettre('a', 42);
    assert.deepEqual(journal, [
      ['premier', 42],
      ['second', 42],
    ]);
  });

  it('ignore un événement sans écouteur', () => {
    assert.doesNotThrow(() => creerEmetteur().emettre('inconnu', 1));
  });

  it('permet de se désabonner', () => {
    const emetteur = creerEmetteur();
    let appels = 0;
    const desabonner = emetteur.sur('a', () => appels++);
    emetteur.emettre('a');
    desabonner();
    emetteur.emettre('a');
    assert.equal(appels, 1);
  });

  it('tolère un désabonnement pendant l’émission', () => {
    const emetteur = creerEmetteur();
    const journal = [];
    const desabonner = emetteur.sur('a', () => {
      journal.push('x');
      desabonner();
    });
    emetteur.sur('a', () => journal.push('y'));
    emetteur.emettre('a');
    emetteur.emettre('a');
    assert.deepEqual(journal, ['x', 'y', 'y']);
  });
});

describe('stockage', () => {
  it('renvoie la valeur par défaut quand localStorage est indisponible (hors navigateur)', () => {
    assert.equal(lireStockage('cle', 'defaut'), 'defaut');
    assert.doesNotThrow(() => ecrireStockage('cle', 'valeur'));
  });
});
