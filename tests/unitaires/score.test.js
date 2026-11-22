import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PHASES } from '../../src/etat/jeu.js';
import { changerDeVoie } from '../../src/systemes/pilotage.js';
import {
  mesurerEcartsLateraux,
  multiplicateur,
  verifierObstaclesEvites,
} from '../../src/systemes/score.js';
import { creerObstacle } from '../../src/systemes/trafic.js';
import { espionner, nouveauJeu } from '../aide.js';

/** Place une voiture déjà passée sous celle du joueur (donc « évitée »). */
function voiturePassee(jeu, voie, ecartMin = Infinity) {
  const o = creerObstacle(jeu, voie);
  o.y = jeu.joueur.y + jeu.joueur.hauteur + 5;
  o.ecartMin = ecartMin;
  return o;
}

function jeuEnCours() {
  const jeu = nouveauJeu();
  jeu.phase = PHASES.JEU;
  return jeu;
}

describe('combos', () => {
  it('le multiplicateur monte toutes les 5 voitures et plafonne à ×5', () => {
    const jeu = jeuEnCours();
    const attendu = [
      [0, 1],
      [4, 1],
      [5, 2],
      [9, 2],
      [10, 3],
      [15, 4],
      [20, 5],
      [500, 5],
    ];
    for (const [serie, mult] of attendu) {
      jeu.serie = serie;
      assert.equal(multiplicateur(jeu), mult, `série ${serie}`);
    }
  });

  it('annonce chaque nouveau palier', () => {
    const jeu = jeuEnCours();
    const evenements = espionner(jeu, ['combo']);
    jeu.serie = 4;
    voiturePassee(jeu, 0);
    verifierObstaclesEvites(jeu);
    assert.deepEqual(evenements, [{ nom: 'combo', donnees: { niveau: 2 } }]);
    assert.equal(jeu.multiplicateurMax, 2);
  });

  it('un changement de voie inutile interrompt la série', () => {
    const jeu = jeuEnCours();
    const evenements = espionner(jeu, ['comboPerdu']);
    jeu.serie = 7; // ×2
    changerDeVoie(jeu, -1); // aucune voiture n'arrive dans la voie quittée
    assert.equal(jeu.serie, 0);
    assert.equal(evenements.length, 1);
  });

  it('un changement de voie utile préserve la série', () => {
    const jeu = jeuEnCours();
    jeu.serie = 7;
    const o = creerObstacle(jeu, jeu.joueur.voie);
    o.y = jeu.joueur.y - 200; // arrive dans la voie du joueur
    changerDeVoie(jeu, -1);
    assert.equal(jeu.serie, 7);
  });
});

describe('points', () => {
  it('une voiture évitée rapporte 1 point × le multiplicateur, une seule fois', () => {
    const jeu = jeuEnCours();
    const evenements = espionner(jeu, ['depassement']);
    jeu.serie = 5; // ×2
    const o = voiturePassee(jeu, 0);
    verifierObstaclesEvites(jeu);
    assert.equal(jeu.score, 2);
    assert.equal(jeu.voituresEvitees, 1);
    assert.equal(o.compte, true);
    verifierObstaclesEvites(jeu); // la même voiture ne compte pas deux fois
    assert.equal(jeu.score, 2);
    assert.equal(evenements.length, 1);
  });

  it('le nitro double les points', () => {
    const jeu = jeuEnCours();
    jeu.nitro.actif = true;
    voiturePassee(jeu, 0);
    verifierObstaclesEvites(jeu);
    assert.equal(jeu.score, 2);
  });

  it('une voiture accidentée ne compte pas comme évitée', () => {
    const jeu = jeuEnCours();
    const o = voiturePassee(jeu, 0);
    o.accidente = true;
    verifierObstaclesEvites(jeu);
    assert.equal(jeu.score, 0);
  });
});

describe('frôlements', () => {
  it('dépasser à moins de 16 px rapporte +2 points, recharge le nitro et ralentit le temps', () => {
    const jeu = jeuEnCours();
    const evenements = espionner(jeu, ['frolement', 'depassement']);
    jeu.nitro.jauge = 0.2;
    voiturePassee(jeu, 0, 10);
    verifierObstaclesEvites(jeu);
    assert.equal(jeu.score, 1 + 2);
    assert.equal(jeu.nbFrolements, 1);
    assert.ok(Math.abs(jeu.nitro.jauge - 0.54) < 1e-9);
    assert.equal(jeu.serie, 2, 'un frôlement compte double dans la série');
    assert.ok(jeu.ralentiRestant > 0);
    assert.deepEqual(
      evenements.map((e) => e.nom),
      ['frolement'],
    );
  });

  it('un dépassement à 16 px ou plus n’est pas un frôlement', () => {
    const jeu = jeuEnCours();
    voiturePassee(jeu, 0, 16);
    verifierObstaclesEvites(jeu);
    assert.equal(jeu.nbFrolements, 0);
    assert.equal(jeu.score, 1);
  });

  it('mesure l’écart latéral minimal tant que les voitures sont côte à côte', () => {
    const jeu = jeuEnCours();
    const o = creerObstacle(jeu, 0);
    o.x = jeu.joueur.x - 70;
    o.y = jeu.joueur.y; // côte à côte
    mesurerEcartsLateraux(jeu);
    assert.ok(Math.abs(o.ecartMin - (70 - 48)) < 1e-9);
    o.x = jeu.joueur.x - 60; // plus près
    mesurerEcartsLateraux(jeu);
    assert.ok(Math.abs(o.ecartMin - 12) < 1e-9);
    o.x = jeu.joueur.x - 100; // plus loin : on garde le minimum
    mesurerEcartsLateraux(jeu);
    assert.ok(Math.abs(o.ecartMin - 12) < 1e-9);
  });
});

describe('pilotage', () => {
  it('ne sort jamais de la route, quel que soit le nombre de voies', () => {
    for (const nbVoies of [1, 2, 3, 5]) {
      const jeu = jeuEnCours();
      jeu.route = Object.freeze({
        ...jeu.route,
        nbVoies,
        largeurVoie: jeu.route.largeur / nbVoies,
        centreVoie: (n) => jeu.route.gauche + (jeu.route.largeur / nbVoies) * (n + 0.5),
      });
      jeu.joueur.voie = Math.floor(nbVoies / 2);
      for (let i = 0; i < 10; i++) changerDeVoie(jeu, -1);
      assert.equal(jeu.joueur.voie, 0);
      for (let i = 0; i < 10; i++) changerDeVoie(jeu, 1);
      assert.equal(jeu.joueur.voie, nbVoies - 1);
    }
  });

  it('émet « changementVoie » seulement quand la voiture change vraiment de voie', () => {
    const jeu = jeuEnCours();
    const evenements = espionner(jeu, ['changementVoie']);
    changerDeVoie(jeu, -1);
    changerDeVoie(jeu, -1); // déjà à gauche
    assert.equal(evenements.length, 1);
  });

  it('est sans effet hors partie', () => {
    const jeu = nouveauJeu();
    jeu.phase = PHASES.FIN;
    changerDeVoie(jeu, -1);
    assert.equal(jeu.joueur.voie, 1);
  });
});
