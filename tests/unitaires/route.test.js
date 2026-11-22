import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { creerRoute, ROUTE_STANDARD } from '../../src/route/route.js';

describe('route', () => {
  it('décrit la route standard du décor : 3 voies de 236/3 px entre x = 62 et x = 298', () => {
    assert.equal(ROUTE_STANDARD.nbVoies, 3);
    assert.equal(ROUTE_STANDARD.gauche, 62);
    assert.equal(ROUTE_STANDARD.droite, 298);
    assert.ok(Math.abs(ROUTE_STANDARD.centreVoie(1) - 180) < 1e-9);
  });

  for (const nbVoies of [1, 2, 3, 4, 5, 6]) {
    it(`gère une route à ${nbVoies} voie(s) sans modifier le moteur`, () => {
      const route = creerRoute({ nbVoies, gauche: 40, largeur: 280 });
      assert.equal(route.largeurVoie, 280 / nbVoies);
      let precedent = -Infinity;
      for (let voie = 0; voie < nbVoies; voie++) {
        const centre = route.centreVoie(voie);
        assert.ok(centre > precedent, 'les centres sont croissants');
        assert.ok(centre > route.gauche && centre < route.droite, 'le centre est sur la chaussée');
        if (voie > 0) assert.ok(Math.abs(centre - precedent - route.largeurVoie) < 1e-9);
        precedent = centre;
      }
      assert.ok(Math.abs(route.centreVoie(0) - route.gauche - route.largeurVoie / 2) < 1e-9);
    });
  }

  it('refuse un nombre de voies invalide ou une largeur nulle', () => {
    assert.throws(() => creerRoute({ nbVoies: 0 }), RangeError);
    assert.throws(() => creerRoute({ nbVoies: 2.5 }), RangeError);
    assert.throws(() => creerRoute({ nbVoies: -1 }), RangeError);
    assert.throws(() => creerRoute({ largeur: 0 }), RangeError);
  });

  it('est immuable', () => {
    assert.throws(() => {
      'use strict';
      ROUTE_STANDARD.nbVoies = 5;
    }, TypeError);
  });
});
