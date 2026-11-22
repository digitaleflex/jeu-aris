import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PHASES } from '../../src/etat/jeu.js';
import {
  allerAccueil,
  allerChoixMode,
  choisirDifficulte,
  confirmerNom,
  fermerRegles,
  ouvrirRegles,
  restaurerPreferences,
  selectionnerMode,
} from '../../src/etat/navigation.js';
import { preparerPartie } from '../../src/etat/phases.js';
import { creerBoucle } from '../../src/boucle.js';
import { creerEtatJeu } from '../../src/etat/jeu.js';
import { pxVersKmh } from '../../src/utilitaires/maths.js';
import { espionner, nouveauJeu, stockageCourant, stockageVierge } from '../aide.js';

/** Jeu à l'accueil, sans nom (état au lancement de l'application). */
function jeuAuLancement() {
  stockageVierge();
  return creerEtatJeu();
}

describe('navigation entre les écrans', () => {
  it('démarre sur l’accueil', () => {
    assert.equal(jeuAuLancement().phase, PHASES.ACCUEIL);
  });

  it('refuse un nom invalide et reste à l’accueil', () => {
    const jeu = jeuAuLancement();
    assert.equal(confirmerNom(jeu, 'A'), false);
    assert.equal(jeu.phase, PHASES.ACCUEIL);
    assert.equal(jeu.nomJoueur, '');
  });

  it('confirmer un nom valide mémorise le joueur et ouvre le choix du mode', () => {
    const jeu = jeuAuLancement();
    const evenements = espionner(jeu, ['navigation']);
    assert.equal(confirmerNom(jeu, '  Léa '), true);
    assert.equal(jeu.nomJoueur, 'Léa');
    assert.equal(jeu.phase, PHASES.CHOIX_MODE);
    assert.equal(jeu.message.texte, 'Prêt, Léa ?');
    assert.equal(stockageCourant().getItem('dernierNom'), 'Léa');
    assert.deepEqual(
      evenements.map((e) => e.donnees.phase),
      [PHASES.CHOIX_MODE],
    );
  });

  it('reprend l’ancien record au premier nom validé et l’affiche', () => {
    const jeu = jeuAuLancement();
    stockageCourant().setItem('recordVoiture', '77');
    confirmerNom(jeu, 'Tom');
    assert.equal(jeu.record, 77);
    assert.equal(stockageCourant().getItem('record.esquive.Tom'), '77');
  });

  it('« changer de joueur » revient à l’accueil sans effacer le nom', () => {
    const jeu = jeuAuLancement();
    confirmerNom(jeu, 'Léa');
    allerAccueil(jeu);
    assert.equal(jeu.phase, PHASES.ACCUEIL);
    assert.equal(jeu.nomJoueur, 'Léa');
  });

  it('une carte de mode jouable ouvre les règles, sans changer de phase', () => {
    const jeu = jeuAuLancement();
    confirmerNom(jeu, 'Léa');
    assert.equal(ouvrirRegles(jeu, 'esquive'), 'regles');
    assert.equal(jeu.reglesMode, 'esquive');
    assert.equal(jeu.phase, PHASES.CHOIX_MODE);
    fermerRegles(jeu);
    assert.equal(jeu.reglesMode, null);
    assert.equal(jeu.phase, PHASES.CHOIX_MODE);
  });

  it('refuse un mode « bientôt disponible » ou inconnu', () => {
    const jeu = jeuAuLancement();
    confirmerNom(jeu, 'Léa');
    for (const id of ['course', 'chrono', 'zen', 'defi', 'inconnu']) {
      assert.equal(ouvrirRegles(jeu, id), null, id);
      assert.equal(selectionnerMode(jeu, id), false, id);
    }
    assert.equal(jeu.reglesMode, null);
    assert.equal(jeu.mode.id, 'esquive');
  });

  it('lance directement la partie quand « Ne plus afficher » est coché', () => {
    const jeu = jeuAuLancement();
    confirmerNom(jeu, 'Léa');
    stockageCourant().setItem('nePlusAfficherRegles', '1');
    assert.equal(ouvrirRegles(jeu, 'esquive'), 'depart');
  });

  it('sélectionner un mode le mémorise et affiche le record du joueur dans ce mode', () => {
    const jeu = jeuAuLancement();
    confirmerNom(jeu, 'Léa');
    stockageCourant().setItem('record.esquive.Léa', '31');
    ouvrirRegles(jeu, 'esquive');
    assert.equal(selectionnerMode(jeu, 'esquive'), true);
    assert.equal(jeu.record, 31);
    assert.equal(jeu.reglesMode, null);
    assert.equal(stockageCourant().getItem('dernierMode'), 'esquive');
  });

  it('revient au choix du mode', () => {
    const jeu = jeuAuLancement();
    confirmerNom(jeu, 'Léa');
    ouvrirRegles(jeu, 'esquive');
    allerChoixMode(jeu);
    assert.equal(jeu.reglesMode, null);
  });
});

describe('restauration des préférences au lancement', () => {
  it('reprend la difficulté, le dernier mode jouable et le record du dernier joueur', () => {
    const jeu = jeuAuLancement();
    const stockage = stockageCourant();
    stockage.setItem('difficulte', 'difficile');
    stockage.setItem('dernierNom', 'Léa');
    stockage.setItem('record.esquive.Léa', '55');
    restaurerPreferences(jeu);
    assert.equal(jeu.difficulteId, 'difficile');
    assert.equal(jeu.reglages.vitesseDepartKmh, 110);
    assert.equal(jeu.record, 55);
    assert.equal(jeu.phase, PHASES.ACCUEIL);
    assert.ok(
      Math.abs(pxVersKmh(jeu.joueur.vitesse) - 110) < 1e-9,
      'la voiture part à la vitesse de la difficulté',
    );
  });

  it('ignore un dernier mode inconnu ou pas encore jouable', () => {
    for (const mode of ['course', 'nimporte']) {
      const jeu = jeuAuLancement();
      stockageCourant().setItem('dernierMode', mode);
      restaurerPreferences(jeu);
      assert.equal(jeu.mode.id, 'esquive');
    }
  });
});

describe('difficulté', () => {
  it('s’applique au départ de la partie suivante et se mémorise', () => {
    const jeu = nouveauJeu();
    assert.equal(choisirDifficulte(jeu, 'facile'), true);
    assert.equal(stockageCourant().getItem('difficulte'), 'facile');
    preparerPartie(jeu);
    assert.ok(Math.abs(pxVersKmh(jeu.joueur.vitesse) - 70) < 1e-9);
    assert.equal(jeu.reglages.multiplicateurScore, 0.8);
  });

  it('refuse une difficulté inconnue', () => {
    const jeu = nouveauJeu();
    assert.equal(choisirDifficulte(jeu, 'cauchemar'), false);
    assert.equal(jeu.difficulteId, 'normal');
  });
});

describe('lancement d’une partie par la boucle', () => {
  /** Simule requestAnimationFrame : les images sont en attente, jamais exécutées. */
  function avecAnimationSimulee(fonction) {
    const originalRaf = globalThis.requestAnimationFrame;
    const originalCancel = globalThis.cancelAnimationFrame;
    const actifs = new Set();
    let prochain = 0;
    globalThis.requestAnimationFrame = () => {
      actifs.add(++prochain);
      return prochain;
    };
    globalThis.cancelAnimationFrame = (id) => actifs.delete(id);
    try {
      return fonction(actifs);
    } finally {
      globalThis.requestAnimationFrame = originalRaf;
      globalThis.cancelAnimationFrame = originalCancel;
    }
  }

  const doublures = {
    rendu: { dessiner() {} },
    hud: { rafraichir() {} },
    sons: { initialiser() {}, mettreAJour() {} },
  };

  it('sans nom de joueur, ramène à l’accueil au lieu de démarrer', () => {
    avecAnimationSimulee((actifs) => {
      const jeu = jeuAuLancement();
      jeu.phase = PHASES.FIN;
      creerBoucle({ jeu, ...doublures }).demarrer();
      assert.equal(jeu.phase, PHASES.ACCUEIL);
      assert.equal(actifs.size, 0);
    });
  });

  it('ne lance jamais plus d’une boucle, même après plusieurs « Recommencer »', () => {
    avecAnimationSimulee((actifs) => {
      const jeu = nouveauJeu();
      const boucle = creerBoucle({ jeu, ...doublures });
      for (let i = 0; i < 5; i++) boucle.demarrer();
      assert.equal(jeu.phase, PHASES.COMPTE);
      assert.equal(actifs.size, 1);
      assert.equal(boucle.active, true);
    });
  });
});
