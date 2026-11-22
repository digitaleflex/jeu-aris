/**
 * Vérifie les règles d'architecture décrites dans docs/ARCHITECTURE.md :
 * dépendances entre couches, et cœur du jeu sans accès au navigateur.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../src');

/** Couche de chaque dossier de src/. */
const COUCHES = {
  config: 'base',
  utilitaires: 'base',
  evenements: 'base',
  etat: 'coeur',
  route: 'coeur',
  physique: 'coeur',
  meteo: 'coeur',
  systemes: 'coeur',
  modes: 'coeur',
  environnement: 'coeur',
  simulation: 'coeur',
  rendu: 'peripherie',
  audio: 'peripherie',
  ui: 'peripherie',
  entrees: 'peripherie',
  plateforme: 'peripherie',
  boucle: 'assemblage',
  main: 'assemblage',
};

/** Qui a le droit d'importer qui (une couche peut toujours importer la sienne). */
const AUTORISE = {
  base: ['base'],
  coeur: ['base', 'coeur'],
  peripherie: ['base', 'coeur', 'peripherie'],
  assemblage: ['base', 'coeur', 'peripherie', 'assemblage'],
};

function fichiersJs(dossier) {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    return statSync(chemin).isDirectory()
      ? fichiersJs(chemin)
      : chemin.endsWith('.js')
        ? [chemin]
        : [];
  });
}

const couche = (chemin) => {
  const [premier] = relative(SRC, chemin).split(sep);
  return COUCHES[premier.replace(/\.js$/, '')];
};

const sansCommentaires = (code) =>
  code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const fichiers = fichiersJs(SRC);

describe('architecture', () => {
  it('connaît la couche de chaque dossier de src/', () => {
    for (const f of fichiers) assert.ok(couche(f), `couche inconnue pour ${relative(SRC, f)}`);
  });

  it('respecte le sens des dépendances : base ← cœur ← périphérie ← assemblage', () => {
    for (const f of fichiers) {
      const imports = [
        ...sansCommentaires(readFileSync(f, 'utf8')).matchAll(/from\s+'(\.[^']+)'/g),
      ];
      for (const [, relatif] of imports) {
        const cible = resolve(dirname(f), relatif);
        assert.ok(
          AUTORISE[couche(f)].includes(couche(cible)),
          `${relative(SRC, f)} (${couche(f)}) ne doit pas importer ${relative(SRC, cible)} (${couche(cible)})`,
        );
      }
    }
  });

  it('n’a aucune dépendance circulaire entre modules', () => {
    const graphe = new Map();
    for (const f of fichiers) {
      const imports = [...readFileSync(f, 'utf8').matchAll(/from\s+'(\.[^']+)'/g)].map(([, r]) =>
        resolve(dirname(f), r),
      );
      graphe.set(f, imports);
    }
    const etat = new Map(); // 1 = en cours, 2 = terminé
    const pile = [];
    const visiter = (f) => {
      if (etat.get(f) === 2) return;
      if (etat.get(f) === 1) {
        throw new Error(
          `cycle : ${[...pile.slice(pile.indexOf(f)), f].map((p) => relative(SRC, p)).join(' → ')}`,
        );
      }
      etat.set(f, 1);
      pile.push(f);
      for (const cible of graphe.get(f) ?? []) visiter(cible);
      pile.pop();
      etat.set(f, 2);
    };
    assert.doesNotThrow(() => fichiers.forEach(visiter));
  });

  it('garde le cœur du jeu indépendant du navigateur (pas de DOM, de son ni d’animation)', () => {
    const interdits =
      /\b(document|window|navigator|requestAnimationFrame|AudioContext|HTMLElement|Image)\b/;
    for (const f of fichiers.filter((p) => ['base', 'coeur'].includes(couche(p)))) {
      const code = sansCommentaires(readFileSync(f, 'utf8'));
      assert.doesNotMatch(code, interdits, `${relative(SRC, f)} utilise une API du navigateur`);
    }
  });

  it('n’utilise Math.random que pour les effets (le gameplay passe par jeu.alea)', () => {
    const attendus = [
      'systemes/particules.js',
      'systemes/trafic.js', // gerbes d'eau des voitures
      'systemes/nitro.js', // flammes
      'systemes/accident.js', // fumée
      'meteo/effets.js',
      'meteo/dangers.js', // gerbes d'eau lors d'un aquaplaning
      'utilitaires/alea.js', // aleaParDefaut
    ];
    for (const f of fichiers.filter((p) => ['coeur', 'base'].includes(couche(p)))) {
      const nom = relative(SRC, f).split(sep).join('/');
      if (/Math\.random/.test(sansCommentaires(readFileSync(f, 'utf8')))) {
        assert.ok(
          attendus.includes(nom),
          `${nom} : le hasard du gameplay doit passer par jeu.alea`,
        );
      }
    }
  });
});
