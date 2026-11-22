import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ecrireRecord,
  lireDernierNom,
  lireDifficulte,
  lireNomsRecents,
  lireRecord,
  memoriserNom,
  migrerAncienRecord,
  nomValide,
} from '../../src/etat/preferences.js';
import { stockageVierge } from '../aide.js';

describe('validation du nom', () => {
  it('accepte 2 à 12 lettres (accents compris), chiffres, espaces et tirets', () => {
    for (const nom of [
      'Léa',
      'Ab',
      'Jean-Luc',
      'Éloïse',
      'Zoé 2',
      'Marie Claire',
      '123456789012',
      '  Léa  ',
    ]) {
      assert.equal(nomValide(nom), true, nom);
    }
  });

  it('refuse un nom trop court, trop long ou avec des caractères spéciaux', () => {
    for (const nom of ['A', '', '   ', '1234567890123', 'a_b', '<b>x</b>', 'Léa!', 'a.b']) {
      assert.equal(nomValide(nom), false, JSON.stringify(nom));
    }
  });
});

describe('noms récents', () => {
  it('mémorise le dernier nom et les 3 derniers noms distincts, le plus récent en premier', () => {
    stockageVierge();
    for (const nom of ['Léa', 'Tom', 'Inès', 'Max']) memoriserNom(nom);
    assert.equal(lireDernierNom(), 'Max');
    assert.deepEqual(lireNomsRecents(), ['Max', 'Inès', 'Tom']);
  });

  it('ne duplique pas un nom déjà présent : il remonte en tête', () => {
    stockageVierge();
    for (const nom of ['Léa', 'Tom', 'Léa']) memoriserNom(nom);
    assert.deepEqual(lireNomsRecents(), ['Léa', 'Tom']);
  });

  it('ignore un stockage corrompu ou contenant des noms invalides', () => {
    const stockage = stockageVierge();
    stockage.setItem('nomsJoueurs', '{pas du json');
    assert.deepEqual(lireNomsRecents(), []);
    stockage.setItem('nomsJoueurs', JSON.stringify(['Léa', 42, 'x', '<script>', 'Tom']));
    assert.deepEqual(lireNomsRecents(), ['Léa', 'Tom']);
    stockage.setItem('nomsJoueurs', '"une chaîne"');
    assert.deepEqual(lireNomsRecents(), []);
  });
});

describe('records par joueur et par mode', () => {
  it('utilise la clé record.<mode>.<nom>', () => {
    const stockage = stockageVierge();
    ecrireRecord('esquive', 'Léa', 42);
    assert.equal(stockage.getItem('record.esquive.Léa'), '42');
    assert.equal(lireRecord('esquive', 'Léa'), 42);
  });

  it('sépare les joueurs et les modes', () => {
    stockageVierge();
    ecrireRecord('esquive', 'Léa', 42);
    assert.equal(lireRecord('esquive', 'Tom'), 0);
    assert.equal(lireRecord('course', 'Léa'), 0);
  });

  it('renvoie 0 sans nom, ou si la valeur mémorisée est invalide', () => {
    const stockage = stockageVierge();
    assert.equal(lireRecord('esquive', ''), 0);
    ecrireRecord('esquive', '', 99); // sans nom : rien n'est écrit
    assert.equal(stockage.has('record.esquive.'), false);
    stockage.setItem('record.esquive.Léa', 'abc');
    assert.equal(lireRecord('esquive', 'Léa'), 0);
  });
});

describe('migration de l’ancien record unique', () => {
  it('reprend recordVoiture comme record Esquive du premier joueur, puis le supprime', () => {
    const stockage = stockageVierge();
    stockage.setItem('recordVoiture', '77');
    migrerAncienRecord('Tom');
    assert.equal(lireRecord('esquive', 'Tom'), 77);
    assert.equal(stockage.has('recordVoiture'), false);
  });

  it('n’écrase pas un record existant', () => {
    const stockage = stockageVierge();
    stockage.setItem('recordVoiture', '77');
    ecrireRecord('esquive', 'Tom', 10);
    migrerAncienRecord('Tom');
    assert.equal(lireRecord('esquive', 'Tom'), 10);
    assert.equal(stockage.getItem('recordVoiture'), '77', 'conservé pour un autre joueur');
  });

  it('ne fait rien s’il n’y a pas d’ancien record', () => {
    const stockage = stockageVierge();
    migrerAncienRecord('Tom');
    assert.equal(stockage.has('record.esquive.Tom'), false);
    stockage.setItem('recordVoiture', '0');
    migrerAncienRecord('Tom');
    assert.equal(stockage.has('record.esquive.Tom'), false);
  });
});

describe('difficulté mémorisée', () => {
  it('vaut « normal » par défaut ou si la valeur mémorisée est invalide', () => {
    const stockage = stockageVierge();
    assert.equal(lireDifficulte(), 'normal');
    stockage.setItem('difficulte', 'impossible');
    assert.equal(lireDifficulte(), 'normal');
    stockage.setItem('difficulte', 'difficile');
    assert.equal(lireDifficulte(), 'difficile');
  });
});
