# Journal des modifications

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/). Le projet n'a pas encore
de version publiée : les numéros ci-dessous reconstituent son historique.

## [0.6.0] — non publié

### Modifié

- **Architecture** : le `script.js` de 2700 lignes est découpé en modules ES (`src/`), en quatre
  couches (base, cœur, périphérie, assemblage). Le cœur du jeu (physique, règles, météo, modes,
  navigation) ne dépend plus du navigateur. Voir `docs/ARCHITECTURE.md` et `docs/DECISIONS.md`.
- Le jeu doit maintenant être servi par HTTP (`npm start`) : les modules ES ne se chargent pas
  depuis `file://`. `index.html` affiche un message d'aide dans ce cas.
- Le nombre de voies, les caractéristiques du véhicule et les réglages de difficulté sont des
  données et non plus des constantes globales.
- Le hasard du gameplay est injectable (`jeu.alea`), les effets visuels restent aléatoires.
- Les écrans (accueil, modes, règles, fin) sont pilotés par l'état du jeu.

### Ajouté

- Documentation : README, `docs/ARCHITECTURE.md`, `docs/PHYSIQUE.md`, `docs/AUDIO.md`,
  `docs/DECISIONS.md`, `docs/FEUILLE-DE-ROUTE.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`.
- Plus de 150 tests unitaires sous Node, 24 tests de bout en bout (Playwright), un test qui vérifie
  les règles d'architecture, ESLint et Prettier, une intégration continue GitHub Actions.
- Icône de la page (`images/icone.svg`).
- Serveur local sans dépendance (`npm start`) et script de captures d'écran.

### Corrigé

- Le bouton nitro cesse de pulser « prêt » dès l'activation du nitro (il pulsait une à deux images
  de trop).
- Plus d'erreur 404 sur `favicon.ico`.

### Retiré

- `README.txt` (remplacé par `README.md` et `docs/`) et `tests/verification.mjs` (ses vérifications
  sont reprises dans les tests unitaires et de bout en bout, dans un vrai navigateur).

## [0.5.0] — 2026-11-22

### Ajouté

- Écran d'accueil avec saisie du nom, noms récents, choix du mode (cartes), règles du mode, écran de
  fin avec résultat et record.
- Niveaux de difficulté (facile, normal, difficile).
- Records par joueur et par mode ; reprise de l'ancien record unique.
- Registre `MODES` avec les modes à venir (Course, Chrono, Zen, Défi) et crochets de mode.

## [0.4.0] — 2026-11-21

### Ajouté

- Météo : pluie et verglas, adhérence μ variable, flaques (aquaplaning) et plaques de verglas,
  effets visuels et sonores, bandeau d'annonce et jauge d'adhérence.
- Illustrations SVG (icônes météo, panneau « chaussée glissante », flaque, plaque de verglas).

## [0.3.0] — 2026-11-21

### Ajouté

- Nitro (swipe vers le haut, `↑`, bouton), frôlements, combos jusqu'à ×5.
- Cycle jour / coucher de soleil / nuit / aube, avec phares.
- Crissement de pneus réaliste (adhérence-glissement) et traces de pneus.

## [0.2.0] — 2026-11-21

### Ajouté

- Commandes tactiles : swipe gauche / droite n'importe où sur l'écran, toucher des côtés de la route.
- Affichage adapté à la taille de l'écran (portrait et paysage), rendu net sur écrans haute densité.

## [0.1.0] — 2026-11-21

### Ajouté

- Première version, issue d'un TP guidé de L1 : route à 3 voies, voiture contrôlée au clavier et par
  boutons, trafic, score, collisions, bouton Recommencer.
- Physique en unités réelles (moteur limité par la puissance et l'adhérence, traînée, choc avec
  conservation de la quantité de mouvement), sons synthétisés, mode compte à rebours.
