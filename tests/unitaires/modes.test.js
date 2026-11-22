import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { DIFFICULTES, difficulteExiste } from '../../src/config/difficultes.js';
import { creerReglages } from '../../src/config/reglages.js';
import { PHASES } from '../../src/etat/jeu.js';
import { changerMeteo } from '../../src/meteo/meteo.js';
import { MODES, modeDisponible, modeInitial } from '../../src/modes/modes.js';
import { reglesDePartie } from '../../src/modes/regles.js';
import { vitesseCibleKmh } from '../../src/physique/moteur.js';
import { creerObstacle, creerVaguesDeTrafic } from '../../src/systemes/trafic.js';
import { verifierObstaclesEvites } from '../../src/systemes/score.js';
import { kmhVersPx } from '../../src/utilitaires/maths.js';
import { creerAleaAvecGraine } from '../../src/utilitaires/alea.js';
import { avancer, demarrerPartie, nouveauJeu } from '../aide.js';

describe('registre des modes', () => {
  it('contient 5 modes dont un seul jouable : Esquive', () => {
    assert.deepEqual(Object.keys(MODES), ['esquive', 'course', 'chrono', 'zen', 'defi']);
    assert.deepEqual(
      Object.values(MODES)
        .filter((m) => m.disponible)
        .map((m) => m.id),
      ['esquive'],
    );
    assert.equal(modeDisponible('esquive'), true);
    assert.equal(modeDisponible('course'), false);
    assert.equal(modeDisponible('inconnu'), false);
    assert.equal(modeDisponible(null), false);
  });

  it('décrit chaque mode complètement (carte, 3 lignes de règles, réglages)', () => {
    for (const [cle, mode] of Object.entries(MODES)) {
      assert.equal(mode.id, cle);
      assert.ok(mode.nom && mode.icone && mode.but && mode.messageDepart, cle);
      assert.equal(mode.regles.length, 3, `${cle} : 3 lignes de règles`);
      assert.ok(['points', 'position', 'temps', 'distance'].includes(mode.score), cle);
      for (const champ of ['trafic', 'rivaux', 'collisionFatale', 'meteo', 'disponible']) {
        assert.equal(typeof mode[champ], 'boolean', `${cle}.${champ}`);
      }
    }
  });

  it('choisit le dernier mode jouable, sinon Esquive', () => {
    assert.equal(modeInitial('esquive').id, 'esquive');
    assert.equal(modeInitial('course').id, 'esquive');
    assert.equal(modeInitial(null).id, 'esquive');
    assert.equal(modeInitial(undefined).id, 'esquive');
  });
});

describe('tableau des difficultés', () => {
  it('contient 3 paliers aux valeurs documentées', () => {
    assert.deepEqual(Object.keys(DIFFICULTES).sort(), ['difficile', 'facile', 'normal']);
    assert.equal(DIFFICULTES.facile.vitesseDepart, 70);
    assert.equal(DIFFICULTES.normal.vitesseMax, 180);
    assert.equal(DIFFICULTES.difficile.vitesseMax, 220);
    assert.equal(difficulteExiste('facile'), true);
    assert.equal(
      difficulteExiste('toString'),
      false,
      'pas de faux positif sur les propriétés héritées',
    );
  });

  it('se traduit en réglages de partie, « normal » par défaut', () => {
    const facile = creerReglages('facile');
    assert.equal(facile.vitesseDepartKmh, 70);
    assert.equal(facile.vitesseMaxKmh, 140);
    assert.equal(facile.densiteTrafic, 0.7);
    assert.equal(facile.multiplicateurScore, 0.8);
    assert.equal(facile.vitesseTraficKmh, 50, 'vitesse du trafic commune à tous les modes');
    assert.deepEqual(creerReglages('nimporte-quoi'), creerReglages('normal'));
    assert.throws(() => {
      'use strict';
      facile.vitesseDepartKmh = 1;
    }, TypeError);
  });
});

describe('effets de la difficulté', () => {
  it('la densité du trafic resserre les vagues : plus de vagues en difficile qu’en facile', () => {
    const vagues = (difficulte) => {
      const jeu = nouveauJeu({ difficulte });
      jeu.joueur.vitesse = kmhVersPx(90);
      let n = 0;
      for (let i = 0; i < 120 * 30; i++) {
        const avant = jeu.distanceDepuisVague;
        creerVaguesDeTrafic(jeu, 1 / 120);
        if (jeu.distanceDepuisVague < avant) n++;
      }
      return n;
    };
    const facile = vagues('facile');
    const normal = vagues('normal');
    const difficile = vagues('difficile');
    assert.ok(facile < normal && normal < difficile, `${facile} < ${normal} < ${difficile}`);
  });

  it('le multiplicateur de score s’applique sans arrondi cumulatif', () => {
    const jeu = nouveauJeu({ difficulte: 'facile' }); // × 0,8
    jeu.phase = PHASES.JEU;
    for (let i = 0; i < 5; i++) {
      const o = creerObstacle(jeu, 0);
      o.y = jeu.joueur.y + jeu.joueur.hauteur + 5;
      verifierObstaclesEvites(jeu);
    }
    // 5 voitures : 4 × 1 + 1 × 2 (palier de combo à la 5e) = 6 points de base × 0,8
    assert.ok(Math.abs(jeu.score - 4.8) < 1e-9, `score : ${jeu.score}`);
    assert.equal(Math.round(jeu.score), 5);
  });

  it('la probabilité de verglas règle le choix entre pluie et verglas, aux bornes exactes', () => {
    // Le tirage vaut `valeur` : verglas si valeur < probabilité, sinon pluie.
    const temps = (difficulte, valeur) => {
      const jeu = nouveauJeu({ difficulte, alea: () => valeur });
      changerMeteo(jeu);
      return jeu.meteo.actuelle;
    };
    const cas = [
      ['facile', 0.15, 0.14, 0.15],
      ['normal', 0.3, 0.29, 0.3],
      ['difficile', 0.5, 0.49, 0.5],
    ];
    for (const [difficulte, probabilite, dessous, auDessus] of cas) {
      assert.equal(DIFFICULTES[difficulte].probabiliteVerglas, probabilite);
      assert.equal(temps(difficulte, dessous), 'verglas', `${difficulte} : tirage ${dessous}`);
      assert.equal(temps(difficulte, auDessus), 'pluie', `${difficulte} : tirage ${auDessus}`);
    }
  });

  it('répartit les mauvais temps selon cette probabilité sur de nombreuses parties', () => {
    const verglas = (difficulte) => {
      let n = 0;
      for (let graine = 1; graine <= 600; graine++) {
        const jeu = nouveauJeu({ difficulte, alea: creerAleaAvecGraine(graine) });
        changerMeteo(jeu);
        if (jeu.meteo.actuelle === 'verglas') n++;
      }
      return n / 600;
    };
    assert.ok(Math.abs(verglas('facile') - 0.15) < 0.05);
    assert.ok(Math.abs(verglas('normal') - 0.3) < 0.05);
    assert.ok(Math.abs(verglas('difficile') - 0.5) < 0.05);
  });

  it('la vitesse visée plafonne à la vitesse maximale de la difficulté', () => {
    for (const [difficulte, max] of [
      ['facile', 140],
      ['normal', 180],
      ['difficile', 220],
    ]) {
      const jeu = nouveauJeu({ difficulte });
      jeu.voituresEvitees = 1000;
      assert.equal(vitesseCibleKmh(jeu), max, difficulte);
    }
  });
});

describe('règles standard de partie et crochets de mode', () => {
  /**
   * Jeu en phase « jeu » : la partie démarre avec Esquive, puis le mode
   * personnalisé est installé (ses crochets ne comptent donc que les pas qui suivent).
   */
  function jeuAvecMode(surcharges) {
    const jeu = nouveauJeu();
    demarrerPartie(jeu);
    jeu.meteo.distanceRestante = 1e9;
    jeu.obstacles = [];
    jeu.mode = { ...MODES.esquive, ...surcharges };
    return jeu;
  }

  const voitureSurLeJoueur = (jeu) => {
    const o = creerObstacle(jeu, jeu.joueur.voie);
    o.y = jeu.joueur.y - 30;
    return o;
  };

  it('appelle le crochet « mettreAJour » du mode à chaque pas', () => {
    let appels = 0;
    const jeu = jeuAvecMode({ mettreAJour: () => appels++ });
    reglesDePartie(jeu, 1 / 120);
    reglesDePartie(jeu, 1 / 120);
    assert.equal(appels, 2);
  });

  it('un résultat de « verifierFin » termine la partie sans collision', () => {
    const jeu = jeuAvecMode({ verifierFin: () => ({ raison: 'objectif' }) });
    voitureSurLeJoueur(jeu); // collision ignorée : la fin du mode passe en premier
    reglesDePartie(jeu, 1 / 120);
    assert.equal(jeu.phase, PHASES.FIN);
    assert.deepEqual(jeu.finMode, { raison: 'objectif' });
  });

  it('une collision est fatale dans Esquive', () => {
    const jeu = jeuAvecMode({});
    voitureSurLeJoueur(jeu);
    reglesDePartie(jeu, 1 / 120);
    assert.equal(jeu.phase, PHASES.ACCIDENT);
  });

  it('sans collision fatale (mode Zen à venir), un choc ne termine pas la partie', () => {
    const jeu = jeuAvecMode({ collisionFatale: false });
    voitureSurLeJoueur(jeu);
    reglesDePartie(jeu, 1 / 120);
    assert.equal(jeu.phase, PHASES.JEU);
  });

  it('sans trafic, aucune voiture n’apparaît', () => {
    const jeu = jeuAvecMode({ trafic: false });
    avancer(jeu, 10);
    assert.equal(jeu.obstacles.length, 0);
  });

  it('sans météo, la route reste sèche', () => {
    const jeu = jeuAvecMode({ meteo: false });
    jeu.meteo.distanceRestante = 1;
    avancer(jeu, 5);
    assert.equal(jeu.meteo.actuelle, 'sec');
  });

  it('prépare l’état propre au mode à chaque nouvelle partie', () => {
    let preparations = 0;
    const jeu = nouveauJeu();
    jeu.mode = { ...MODES.esquive, preparer: () => preparations++ };
    demarrerPartie(jeu);
    demarrerPartie(jeu);
    assert.equal(preparations, 2);
  });
});
