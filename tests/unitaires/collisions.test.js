import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { rectangle, seChevauchent } from '../../src/physique/collisions.js';

const voiture = (x, y) => ({ x, y, largeur: 48, hauteur: 89 });

describe('collisions', () => {
  it('calcule la zone occupée à partir des coordonnées et du gabarit (marges de carrosserie 5 × 4 px)', () => {
    assert.deepEqual(rectangle(voiture(180, 100)), {
      gauche: 161,
      droite: 199,
      haut: 104,
      bas: 185,
    });
  });

  it('détecte deux voitures superposées', () => {
    assert.ok(seChevauchent(rectangle(voiture(180, 100)), rectangle(voiture(180, 100))));
  });

  it('détecte un chevauchement partiel en coin', () => {
    assert.ok(seChevauchent(rectangle(voiture(180, 100)), rectangle(voiture(210, 150))));
  });

  it('ne détecte rien si une voiture est entièrement à gauche, à droite, au-dessus ou en dessous', () => {
    const a = rectangle(voiture(180, 100));
    assert.equal(seChevauchent(a, rectangle(voiture(300, 100))), false, 'à droite');
    assert.equal(seChevauchent(a, rectangle(voiture(60, 100))), false, 'à gauche');
    assert.equal(seChevauchent(a, rectangle(voiture(180, 300))), false, 'en dessous');
    assert.equal(seChevauchent(a, rectangle(voiture(180, -100))), false, 'au-dessus');
  });

  it('deux voitures sur des voies différentes ne se touchent pas (voies de 78,7 px)', () => {
    const voieA = rectangle(voiture(101.3, 100));
    const voieB = rectangle(voiture(180, 100));
    assert.equal(seChevauchent(voieA, voieB), false);
  });

  it('est symétrique', () => {
    const a = rectangle(voiture(180, 100));
    const b = rectangle(voiture(200, 160));
    assert.equal(seChevauchent(a, b), seChevauchent(b, a));
  });
});
