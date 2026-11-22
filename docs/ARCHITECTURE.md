# Architecture

Ce document explique comment le code est organisé, pourquoi, et comment le faire évoluer. Les règles
qu'il énonce sont **vérifiées automatiquement** par `tests/unitaires/architecture.test.js` : si
l'architecture dérive, la CI échoue.

## Principes

1. **Le cœur du jeu ne connaît pas le navigateur.** Physique, règles, météo et simulation tournent
   sous Node, sans DOM, sans Canvas, sans son. C'est ce qui permet de les tester vite et de les
   rejouer à l'identique.
2. **Un seul état, des fonctions qui le font évoluer.** L'état d'une partie est un objet (`EtatJeu`)
   passé en premier paramètre. Il n'y a pas de variable globale modifiable.
3. **Les règles émettent des événements, les autres réagissent.** Une voiture évitée émet
   `depassement` ; l'audio joue un son, sans que les règles sachent qu'il existe un son.
4. **Le hasard du gameplay est injecté** (`jeu.alea`) : la même graine rejoue la même partie.
5. **Rien n'est codé en dur** : le nombre de voies, les caractéristiques d'un véhicule et les
   réglages de conduite sont des données (`src/config`, `route`), pas des constantes dispersées.

## Les couches

```mermaid
flowchart TB
    subgraph assemblage["Assemblage"]
        main["main.js · boucle.js"]
    end
    subgraph peripherie["Périphérie (navigateur)"]
        rendu["rendu/<br/>Canvas 2D"]
        audio["audio/<br/>Web Audio"]
        ui["ui/<br/>HUD HTML"]
        entrees["entrees/<br/>clavier · tactile · boutons"]
        plateforme["plateforme/<br/>vibration"]
    end
    subgraph coeur["Cœur (indépendant du navigateur)"]
        sim["simulation.js"]
        modes["modes/"]
        systemes["systemes/<br/>trafic · score · nitro · accident"]
        meteo["meteo/"]
        physique["physique/"]
        etat["etat/ · route/ · environnement/"]
    end
    subgraph base["Base"]
        config["config/"]
        util["utilitaires/ · evenements.js"]
    end
    assemblage --> peripherie --> coeur --> base
```

Une couche ne peut importer que sa propre couche et celles du dessous. Concrètement :

| Couche         | Dossiers et fichiers                                                                               | Peut importer          |
| -------------- | -------------------------------------------------------------------------------------------------- | ---------------------- |
| **Base**       | `config/`, `utilitaires/`, `evenements.js`                                                         | base                   |
| **Cœur**       | `etat/`, `route/`, `physique/`, `meteo/`, `systemes/`, `modes/`, `environnement/`, `simulation.js` | base, cœur             |
| **Périphérie** | `rendu/`, `audio/`, `ui/`, `entrees/`, `plateforme/`                                               | base, cœur, périphérie |
| **Assemblage** | `main.js`, `boucle.js`                                                                             | tout                   |

## Plan des modules

| Dossier          | Rôle                                                                                                                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config/`        | Données : constantes, `VEHICULES`, `METEOS`, `DIFFICULTES`, réglages, règles (nitro, combos…). Pas de logique.                                                                     |
| `etat/`          | `jeu.js` (état, `PHASES`, remise à zéro) ; `phases.js` (départ, compte à rebours, fin) ; `navigation.js` (accueil → modes → règles) ; `preferences.js` (nom, difficulté, records). |
| `route/`         | `creerRoute({ nbVoies, gauche, largeur })` : géométrie, `centreVoie(n)`.                                                                                                           |
| `physique/`      | `moteur.js` (F = ma), `direction.js` (ressort amorti, glisse, traces), `collisions.js`, `frottement.js`.                                                                           |
| `meteo/`         | `conditions.js` (adhérence μ, fonctions pures), `meteo.js` (évolution), `dangers.js` (flaques, plaques), `effets.js` (gouttes, flocons).                                           |
| `systemes/`      | `trafic.js`, `score.js` (points, combos, frôlements), `nitro.js`, `accident.js`, `pilotage.js` (changer de voie), `particules.js`.                                                 |
| `modes/`         | `modes.js` (type `Mode`, registre `MODES`), `esquive.js` et `aVenir.js` (données), `regles.js` (règles standard d'une partie). Voir « Ajouter un mode ».                           |
| `environnement/` | `cycleJour.js` : obscurité et teinte du ciel selon la distance.                                                                                                                    |
| `simulation.js`  | `mettreAJour(jeu, dt)` : un pas de simulation ; `avancerSimulation` : pas fixes.                                                                                                   |
| `rendu/`         | Dessin par couches : route, véhicules, particules, ambiance (nuit), interface.                                                                                                     |
| `audio/`         | Contexte Web Audio, sons continus (moteur, pneus), effets, branchement sur les événements.                                                                                         |
| `ui/`            | `hud.js` (score, record, vitesse, message, boutons) et `ecrans.js` (accueil, choix du mode, règles, fin).                                                                          |
| `entrees/`       | `clavier.js`, `tactile.js`, `boutons.js` → tous appellent les mêmes `commandes`.                                                                                                   |
| `boucle.js`      | `requestAnimationFrame` : simulation → sons → dessin → HUD.                                                                                                                        |
| `main.js`        | Assemble tout. Expose `window.jeuAris` pour le débogage et les tests.                                                                                                              |

## L'état d'une partie

`creerEtatJeu()` renvoie un `EtatJeu` (voir les types JSDoc dans `src/etat/jeu.js`). Ses grandes parties :

- **Contexte** : `route`, `mode`, `reglages` (dérivés de `difficulteId`), `alea`, `evenements`.
- **Joueur et écrans** : `nomJoueur`, `reglesMode` (règles affichées par-dessus le choix du mode).
- **Déroulement** : `phase`, `score`, `record`, `ancienRecord`, `compteARebours`, `message`.
- **Voitures** : `joueur` (une `Voiture`), `obstacles` (le trafic).
- **Systèmes** : `nitro`, `meteo`, `dangers`, `particules`, `traces`, `textesFlottants`.
- **Effets de jeu** : `serie` (combo), `tremblement`, `ralentiRestant`, `defilement` (distance).

### Phases

```mermaid
stateDiagram-v2
    [*] --> accueil
    accueil --> choixMode: nom valide
    choixMode --> accueil: changer de joueur · Échap
    choixMode --> compte: C'est parti !
    compte --> jeu: 3 · 2 · 1 · départ
    jeu --> accident: collision
    accident --> fini: voiture arrêtée
    fini --> compte: rejouer
    fini --> choixMode: changer de mode
    fini --> accueil: changer de joueur
```

Les **règles d'un mode** s'affichent par-dessus `choixMode` : ce n'est pas une phase mais
`jeu.reglesMode` (identifiant du mode, ou `null`).

## Écrans et navigation

Accueil, choix du mode, règles et fin de partie sont des **écrans HTML** (`ui/ecrans.js`), posés par-dessus
le Canvas. Ils sont **pilotés par l'état**, dans un seul sens :

```mermaid
flowchart LR
    joueur["Le joueur<br/>(clic, touche)"] --> actions["actions<br/>(main.js)"]
    actions --> nav["etat/navigation.js<br/>change phase, nom, mode…"]
    nav -- "événement « navigation »" --> ecrans["ui/ecrans.js<br/>affiche l'écran de la phase"]
    nav -- "événement « navigation »" --> hud["ui/hud.js"]
```

- `navigation.js` ne fait que **modifier l'état** (`confirmerNom`, `ouvrirRegles`, `selectionnerMode`,
  `choisirDifficulte`…) puis émettre `navigation`. Il ne touche pas au DOM : il se teste sous Node.
- `ecrans.js` affiche l'écran qui correspond à `jeu.phase` / `jeu.reglesMode` et place le focus
  (champ du nom, carte sélectionnée, bouton « C'est parti ! », bouton « Rejouer »).
- Lancer la partie elle-même (boucle d'animation) est le rôle de `boucle.js` : `main.js` combine les
  deux dans les `actions` des écrans.
- Le clavier a deux propriétaires : `ui/ecrans.js` quand un écran est ouvert (navigation), `entrees/clavier.js`
  pendant la partie (commandes). Aucun des deux n'agit quand un champ de saisie a le focus.
- Les préférences (nom, difficulté, dernier mode, « ne plus afficher ») et les records vivent dans
  `etat/preferences.js`, qui passe par `utilitaires/stockage.js` : le support de stockage est
  remplaçable, les tests utilisent un stockage en mémoire.

## Un pas de simulation

`mettreAJour(jeu, dt)` (`src/simulation.js`) est appelée à pas fixe (1/120 s). L'ordre compte :

1. **Joueur** : moteur puis direction (phases `compte` et `jeu`), ou glissade (phase `accident`).
2. **Monde** : défilement de la route, déplacement du trafic.
3. **Systèmes communs** : nitro, météo (et dangers), particules, textes flottants.
4. **Règles de la phase** : compte à rebours, ou `jeu.mode.mettreAJourPartie(jeu, dt)`.

`avancerSimulation(jeu, tempsReel)` convertit le temps réel en pas fixes (accumulateur), limite le
temps à 0,1 s et applique les ralentis. La physique est donc identique à 60, 120 ou 144 Hz.

```mermaid
sequenceDiagram
    participant N as Navigateur
    participant B as boucle.js
    participant S as simulation.js
    participant A as audio
    participant R as rendu
    participant H as HUD
    N->>B: requestAnimationFrame
    B->>S: avancerSimulation(jeu, durée)
    loop pas fixes de 1/120 s
        S->>S: mettreAJour(jeu, dt)
    end
    B->>A: mettreAJourSons(jeu)
    B->>R: dessiner(jeu)
    B->>H: rafraichir(jeu)
```

## Événements

Les règles émettent des événements via `jeu.evenements.emettre(nom, données)`. La liste complète est
documentée dans `src/evenements.js`. Exemples : `depassement`, `frolement`, `combo`, `accident`,
`meteo`, `danger`, `vibration`, `fin`.

Les écouteurs sont branchés dans `main.js` : `brancherAudio(jeu)` (sons) et `brancherVibration(jeu)`.
Ajouter une réaction (une statistique, un nouveau son) ne demande **aucune modification des règles**.

L'interface HTML, elle, ne reçoit aucun événement : elle compare l'état à ce qu'elle affiche à chaque
image (`ui/hud.js`).

## Le hasard

| Besoin                                                              | À utiliser      |
| ------------------------------------------------------------------- | --------------- |
| Ce qui change la partie (trafic, météo, choc)                       | `jeu.alea()`    |
| Effets purement visuels ou sonores (particules, tremblement, notes) | `Math.random()` |

`jeu.alea` vaut `Math.random` par défaut. Avec `creerAleaAvecGraine(n)`, la partie est rejouable à
l'identique (tests, futur « défi du jour »). Le test d'architecture refuse `Math.random` dans les
fichiers qui décident du gameplay, et `tests/unitaires/jeu.test.js` vérifie que les effets visuels
n'influencent jamais le résultat.

## Rendu

`rendu.dessiner(jeu)` dessine toujours dans un repère logique de **360 × 540**. `ajusterTaille`
choisit la taille d'affichage et le nombre de pixels réels (densité de l'écran) ; les fonctions de
dessin n'en savent rien. Couches, du fond vers le dessus :

route → chaussée (mouillée / givrée) → dangers → traces → particules au sol → voitures → particules
en l'air → **ambiance** (coucher de soleil, nuit, phares) → givre → textes flottants → _(sans
tremblement)_ interface → annonce météo → écrans de texte.

La nuit utilise un calque séparé : on le remplit d'obscurité puis on « efface » les cônes de phares
(`destination-out`) avant de l'afficher.

## Recettes

### Ajouter un mode de jeu

Un mode est un objet du type `Mode` (voir `src/modes/modes.js`) : surtout des **données**, plus des
crochets facultatifs. Les données alimentent l'écran de choix (carte, règles) et configurent les
règles standard (`trafic`, `collisionFatale`, `meteo`…). Les modes « Course », « Chrono », « Zen » et
« Défi » existent déjà dans `src/modes/aVenir.js`, avec `disponible: false`.

Pour activer un mode : passez `disponible` à `true`, puis ajoutez les crochets dont il a besoin.

```js
export const modeChrono = {
  id: 'chrono',
  nom: 'Chrono',
  icone: '⏱️',
  but: 'Bats le chrono',
  regles: ['…', '…', '…'],
  messageDepart: 'Le chrono tourne !',
  trafic: true,
  collisionFatale: true,
  tempsLimite: 90,
  score: 'temps',
  meteo: true,
  disponible: true,
  preparer(jeu) {
    jeu.chrono = 90;
  }, // à chaque remise à zéro
  mettreAJour(jeu, dt) {
    jeu.chrono -= dt;
  }, // à chaque pas de jeu
  verifierFin(jeu) {
    return jeu.chrono <= 0 ? { raison: 'temps' } : null;
  },
  dessinerInterface(ctx, jeu) {
    /* dessine le chrono */
  },
};
```

Ajoutez-le à `MODES` (`src/modes/modes.js`). Le mode **compose** les systèmes existants (trafic, score,
accident…) via `reglesDePartie` (`src/modes/regles.js`) : il ne duplique pas la physique. L'ordre
des étapes y est documenté. Pensez aussi à une issue ou une PR qui complète
`docs/FEUILLE-DE-ROUTE.md`.

### Ajouter une difficulté

Ajoutez une entrée dans `DIFFICULTES` (`src/config/difficultes.js`) et un bouton radio
`name="difficulte"` dans `index.html`. `creerReglages` en déduit les réglages de la partie ; les
tests de `tests/unitaires/modes.test.js` pincent les valeurs actuelles.

### Ajouter un véhicule

Ajoutez une entrée dans `VEHICULES` (`src/config/vehicules.js`) avec `creerCaracteristiques({…})` :
masse, puissance, adhérence, Cx, surface frontale, direction. Passez-la à
`creerEtatJeu({ vehicule: VEHICULES.maVoiture })`. Toute la physique lit `joueur.caracteristiques`.

### Ajouter une route à N voies

```js
import { creerRoute } from './route/route.js';
creerEtatJeu({ route: creerRoute({ nbVoies: 5, gauche: 40, largeur: 280 }) });
```

Trafic, dangers, pilotage, rebonds et marquages lisent `route.nbVoies` / `route.centreVoie(n)`.
Limites actuelles : voies de même largeur, route droite, et le décor (`images/route.jpg`) est dessiné
pour 3 voies (seuls les marquages s'adaptent).

### Ajouter une météo

1. Ajoutez la condition dans `METEOS` (`src/config/meteo.js`) : adhérence, vitesse max, crissement.
2. Gérez son intensité dans `etat/jeu.js` (`Meteo`) et sa transition dans `meteo/meteo.js`.
3. Ajoutez ses effets visuels (`rendu/route.js`, `meteo/effets.js`) et ses sons (`audio/effets.js`).

### Ajouter un son

Écrivez la fonction dans `audio/effets.js`, puis reliez-la à un événement dans `brancherAudio`
(`audio/audio.js`). Si aucun événement ne convient, émettez-en un depuis la règle concernée et
documentez-le dans `src/evenements.js`.

## Tests

| Niveau       | Dossier           | Ce qu'il vérifie                                                                                                 | Vitesse |
| ------------ | ----------------- | ---------------------------------------------------------------------------------------------------------------- | ------- |
| Unitaires    | `tests/unitaires` | physique, règles, météo, modes, difficultés, navigation, préférences et records, route, hasard, **architecture** | ~1 s    |
| Bout en bout | `tests/e2e`       | accueil, saisie du nom, choix du mode, règles, partie, fin, responsive, clavier, swipe                           | ~30 s   |

Le **test de caractérisation** (`jeu.test.js`) fige le comportement d'une partie de référence. Si
vous changez volontairement le gameplay, mettez ses valeurs à jour dans la même PR et expliquez
pourquoi.

## Conventions

- **Langue** : le vocabulaire du domaine est en français (`voie`, `adherence`, `obstacles`), comme
  le projet et ses issues. Les termes techniques courants restent en anglais (`canvas`, `ctx`).
- **Style** : ESLint + Prettier (`npm run lint`, `npm run format`), 2 espaces, guillemets simples.
- **Documentation** : JSDoc sur toute fonction exportée ; les unités sont dans les noms ou les
  commentaires (`px`, `m/s`, `km/h`, `s`).
- **Unités** : la simulation est en pixels et secondes ; les conversions passent par
  `kmhVersPx` / `pxVersKmh` et `PX_PAR_METRE`.
