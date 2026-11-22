import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PAS_PHYSIQUE } from '../../src/config/constantes.js';
import { ambiance } from '../../src/environnement/cycleJour.js';
import { PHASES } from '../../src/etat/jeu.js';
import { preparerPartie, terminerPartie } from '../../src/etat/phases.js';
import { avancerSimulation, mettreAJour } from '../../src/simulation.js';
import { activerNitro } from '../../src/systemes/nitro.js';
import { changerDeVoie } from '../../src/systemes/pilotage.js';
import { vitesseRelativeTrafic } from '../../src/systemes/trafic.js';
import { creerAleaAvecGraine } from '../../src/utilitaires/alea.js';
import { pxVersKmh } from '../../src/utilitaires/maths.js';
import {
  avancer,
  avecHasardGraine,
  demarrerPartie,
  espionner,
  nouveauJeu,
  stockageCourant,
} from '../aide.js';

describe('phases de la partie', () => {
  it('démarre à l’accueil, avec la voiture au centre à 90 km/h', () => {
    const jeu = nouveauJeu();
    assert.equal(jeu.phase, PHASES.ACCUEIL);
    assert.equal(jeu.joueur.voie, 1);
    assert.equal(jeu.joueur.x, jeu.route.centreVoie(1));
    assert.ok(Math.abs(pxVersKmh(jeu.joueur.vitesse) - 90) < 1e-9);
  });

  it('enchaîne compte à rebours 3-2-1 puis départ', () => {
    const jeu = nouveauJeu();
    const evenements = espionner(jeu, ['compteARebours', 'depart']);
    preparerPartie(jeu);
    assert.equal(jeu.phase, PHASES.COMPTE);
    avancer(jeu, 3.05);
    assert.equal(jeu.phase, PHASES.JEU);
    assert.deepEqual(
      evenements.map((e) => [e.nom, e.donnees?.valeur]),
      [
        ['compteARebours', 3],
        ['compteARebours', 2],
        ['compteARebours', 1],
        ['depart', undefined],
      ],
    );
    assert.equal(jeu.message.texte, jeu.mode.messageDepart);
  });

  it('autorise le changement de voie pendant le compte à rebours', () => {
    const jeu = nouveauJeu();
    preparerPartie(jeu);
    changerDeVoie(jeu, 1);
    assert.equal(jeu.joueur.voie, 2);
  });

  it('refuse le nitro avant le départ', () => {
    const jeu = nouveauJeu();
    preparerPartie(jeu);
    activerNitro(jeu);
    assert.equal(jeu.nitro.actif, false);
  });

  it('remet tout à zéro à chaque nouvelle partie sans toucher au record', () => {
    const jeu = nouveauJeu();
    jeu.record = 77;
    demarrerPartie(jeu);
    jeu.score = 12;
    jeu.serie = 9;
    jeu.meteo.actuelle = 'verglas';
    jeu.nitro.actif = true;
    preparerPartie(jeu);
    assert.equal(jeu.score, 0);
    assert.equal(jeu.serie, 0);
    assert.equal(jeu.meteo.actuelle, 'sec');
    assert.equal(jeu.nitro.actif, false);
    assert.equal(jeu.nitro.jauge, 1);
    assert.equal(jeu.obstacles.length, 0);
    assert.equal(jeu.message.perdu, false);
    assert.equal(jeu.record, 77);
  });

  it('enregistre un nouveau record pour ce joueur et ce mode, avant l’écran de fin', () => {
    const jeu = nouveauJeu();
    const stockage = stockageCourant();
    stockage.setItem('record.esquive.Testeur', '10');
    jeu.record = 10;
    const evenements = espionner(jeu, ['fin', 'navigation']);
    jeu.score = 24.6; // score fractionnaire (multiplicateur de difficulté)
    terminerPartie(jeu);
    assert.equal(jeu.phase, PHASES.FIN);
    assert.equal(jeu.score, 25, 'le score est arrondi');
    assert.equal(jeu.record, 25);
    assert.equal(jeu.ancienRecord, 10);
    assert.equal(stockage.getItem('record.esquive.Testeur'), '25');
    assert.match(jeu.message.texte, /nouveau record : 25/);
    assert.deepEqual(evenements[0].donnees, {
      score: 25,
      record: 25,
      ancienRecord: 10,
      nouveauRecord: true,
    });
    assert.equal(evenements[1].nom, 'navigation');
  });

  it('ne baisse jamais le record et le garde séparé par joueur et par mode', () => {
    const jeu = nouveauJeu();
    const stockage = stockageCourant();
    stockage.setItem('record.esquive.Testeur', '40');
    jeu.score = 5;
    terminerPartie(jeu);
    assert.equal(jeu.record, 40);
    assert.equal(jeu.ancienRecord, 40);
    assert.equal(stockage.getItem('record.esquive.Testeur'), '40');
    assert.equal(stockage.has('record.esquive.Autre'), false);
    assert.match(jeu.message.texte, /score : 5\./);
  });
});

describe('temps de la simulation', () => {
  it('simule par pas fixes quelle que soit la fréquence de l’écran', () => {
    const vitesseApres = (fps) => {
      const jeu = nouveauJeu();
      demarrerPartie(jeu);
      jeu.voituresEvitees = 30;
      for (let i = 0; i < fps * 5; i++) avancerSimulation(jeu, 1 / fps);
      return jeu.defilement;
    };
    const a = vitesseApres(60);
    const b = vitesseApres(144);
    assert.ok(Math.abs(a - b) / a < 0.002, `60 Hz : ${a}, 144 Hz : ${b}`);
  });

  it('limite le temps écoulé à 0,1 s (onglet resté en arrière-plan)', () => {
    const jeu = nouveauJeu();
    avancerSimulation(jeu, 30);
    assert.ok(jeu.defilement <= ((((90 * 1000) / 3.6 / 0.0005) * 0.1) / 1000) * 20 + 1);
    const reference = nouveauJeu();
    avancerSimulation(reference, 0.1);
    assert.equal(jeu.defilement, reference.defilement);
  });

  it('ralentit le temps du jeu pendant un ralenti', () => {
    const normal = nouveauJeu();
    const ralenti = nouveauJeu();
    ralenti.ralentiRestant = 1;
    avancerSimulation(normal, 0.05);
    avancerSimulation(ralenti, 0.05);
    assert.ok(ralenti.defilement < normal.defilement * 0.5);
    assert.ok(ralenti.ralentiRestant < 1);
  });
});

describe('cycle jour / nuit', () => {
  const metres = (m) => m * 20; // px
  const cycle = 3600;

  it('commence en plein jour', () => {
    assert.deepEqual(ambiance(0), { obscurite: 0, teinte: null });
  });

  it('passe par le coucher de soleil (25 à 40 % du cycle) puis la nuit noire', () => {
    const milieu = ambiance(metres(cycle * 0.325));
    assert.ok(Math.abs(milieu.obscurite - 0.5) < 1e-9);
    assert.ok(milieu.teinte[3] > 0.27, 'teinte orangée maximale à mi-coucher');
    assert.deepEqual(ambiance(metres(cycle * 0.5)), { obscurite: 1, teinte: null });
  });

  it('revient au jour à l’aube (75 à 90 %)', () => {
    assert.ok(Math.abs(ambiance(metres(cycle * 0.825)).obscurite - 0.5) < 1e-9);
    assert.equal(ambiance(metres(cycle * 0.95)).obscurite, 0);
  });

  it('se répète à chaque cycle', () => {
    const a = ambiance(metres(cycle * 0.33));
    const b = ambiance(metres(cycle * 3.33));
    assert.ok(Math.abs(a.obscurite - b.obscurite) < 1e-6);
  });
});

describe('simulation complète', () => {
  /** Pilote simple : esquive les voitures qui arrivent dans sa voie. */
  function piloter(jeu, secondes) {
    const pas = Math.round(secondes / PAS_PHYSIQUE);
    for (let i = 0; i < pas; i++) {
      if (i % 6 === 0 && jeu.phase === PHASES.JEU) {
        const { joueur } = jeu;
        const risque = [0, 0, 0];
        // On anticipe ≈ 0,9 s : plus la vitesse relative est grande, plus on regarde loin
        const horizon = Math.max(300, vitesseRelativeTrafic(jeu) * 0.9);
        for (const o of jeu.obstacles) {
          if (o.y > joueur.y - horizon && o.y < joueur.y + joueur.hauteur) risque[o.voie] = 1;
        }
        if (risque[joueur.voie]) {
          const libre = [0, 1, 2]
            .filter((v) => !risque[v])
            .sort((a, b) => Math.abs(a - joueur.voie) - Math.abs(b - joueur.voie))[0];
          if (libre !== undefined) changerDeVoie(jeu, libre < joueur.voie ? -1 : 1);
        }
      }
      mettreAJour(jeu, PAS_PHYSIQUE);
    }
  }

  const instantane = (jeu) =>
    JSON.stringify([
      jeu.phase,
      jeu.score,
      jeu.voituresEvitees,
      jeu.serie,
      Number(jeu.defilement.toFixed(6)),
      Number(jeu.joueur.x.toFixed(6)),
      Number(jeu.joueur.vitesse.toFixed(6)),
      jeu.obstacles.map((o) => [o.voie, Number(o.y.toFixed(6))]),
      jeu.meteo.actuelle,
    ]);

  /** Partie de 40 s : `graineJeu` pilote le gameplay, `graineEffets` les effets visuels. */
  const partie = (graineJeu, graineEffets = 1) =>
    avecHasardGraine(graineEffets, () => {
      const jeu = nouveauJeu({ alea: creerAleaAvecGraine(graineJeu) });
      demarrerPartie(jeu);
      piloter(jeu, 40);
      return jeu;
    });

  it('est entièrement reproductible avec la même graine de jeu', () => {
    assert.equal(instantane(partie(2026)), instantane(partie(2026)));
  });

  it('produit des parties différentes avec des graines de jeu différentes', () => {
    assert.notEqual(instantane(partie(1)), instantane(partie(2)));
  });

  it('ne dépend pas des effets visuels : Math.random n’influence jamais le gameplay', () => {
    assert.equal(instantane(partie(2026, 1)), instantane(partie(2026, 987654)));
  });

  it('un pilote prudent marque des points sans accident pendant 40 s sur route sèche', () => {
    for (const graine of [1, 2]) {
      const jeu = nouveauJeu({ alea: creerAleaAvecGraine(graine) });
      demarrerPartie(jeu);
      jeu.meteo.distanceRestante = 1e9; // pas de pluie ni de verglas : on teste le pilote, pas la météo
      piloter(jeu, 40);
      assert.equal(jeu.phase, PHASES.JEU, `graine ${graine}`);
      assert.ok(jeu.score >= 80, `score : ${jeu.score}`);
      assert.ok(jeu.voituresEvitees >= 25);
    }
  });

  it('un pilote qui ne fait rien finit par avoir un accident', () => {
    const jeu = nouveauJeu({ alea: creerAleaAvecGraine(1) });
    demarrerPartie(jeu);
    avancer(jeu, 30);
    assert.ok([PHASES.ACCIDENT, PHASES.FIN].includes(jeu.phase), `phase : ${jeu.phase}`);
  });

  it('fige le comportement du jeu (test de caractérisation)', () => {
    // Ces valeurs décrivent le comportement de référence du jeu (identique à
    // celui d'avant la refonte en modules). Si une évolution VOLONTAIRE du
    // gameplay les change, mettez-les à jour dans la même PR en expliquant
    // pourquoi. Une différence involontaire est un bug.
    const jeu = partie(1);
    assert.deepEqual(
      [jeu.phase, jeu.score, jeu.voituresEvitees, jeu.serie, jeu.meteo.actuelle],
      ATTENDU_CARACTERISATION,
    );
    assert.equal(jeu.defilement.toFixed(3), ATTENDU_DEFILEMENT);
  });
});

const ATTENDU_CARACTERISATION = ['fini', 184, 45, 46, 'verglas'];
const ATTENDU_DEFILEMENT = '27190.828';
