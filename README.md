# Jeu Aris — Course sur 3 voies

Un jeu de course automobile en JavaScript vanilla (Canvas + Web Audio), jouable au clavier et au tactile, avec **5 modes de jeu**, difficulté, records par joueur, classements et IA de pilotes.

Aucune installation, aucun build et aucune connexion internet ne sont nécessaires pour jouer : ouvrez `index.html` dans un navigateur récent (Chrome, Firefox, Edge, Safari). Les sons sont générés par le navigateur.

---

## Sommaire

- [Lancer le jeu](#lancer-le-jeu)
- [Commandes](#commandes)
- [Écrans et machine à états](#écrans-et-machine-à-états)
- [Les 5 modes de jeu](#les-5-modes-de-jeu)
- [Difficulté](#difficulté)
- [Records, défi du jour et classements](#records-défi-du-jour-et-classements)
- [Physique utilisée](#physique-utilisée)
- [Structure du projet](#structure-du-projet)
- [Tests](#tests)
- [Fiche oral](#fiche-oral)

---

## Lancer le jeu

1. Ouvrir `index.html` dans un navigateur.
2. Saisir un nom (2 à 12 caractères).
3. Choisir un mode, lire ses règles, puis « C'est parti ! ».

Pour les tests navigateur, voir la section [Tests](#tests).

---

## Commandes

| Moment | Action |
|---|---|
| **Accueil** | Saisir son nom puis `Entrée` ou « Continuer ». Les 3 derniers noms sont proposés en un clic. |
| **Choix du mode** | `←` / `→` (ou `↑` / `↓`) pour naviguer entre les cartes, `Entrée` pour ouvrir les règles, `Échap` pour revenir au nom. Cliquer sur 🏆 ouvre les classements. |
| **Règles** | « C'est parti ! » lance la partie, « Retour » revient aux cartes. La case « Ne plus afficher » mémorise le choix. |
| **En jeu (clavier)** | `←` / `Q` / `A` : voie de gauche · `→` / `D` : voie de droite · `↑` / `Z` / `W` / `Shift` : nitro · `M` : couper/remettre le son |
| **En jeu (tactile)** | Glisser le doigt à gauche/droite (un long geste peut changer de 2 voies), toucher la moitié gauche/droite de la route, ou les boutons « Gauche » / « Droite ». Glisser vers le haut ou bouton 🔥 : nitro. |
| **Fin de partie** | `Espace` / `Entrée` ou toucher l'écran hors boutons : Rejouer. Sinon : Rejouer / Changer de mode / Changer de joueur. |

Le bouton 🔊 mémorise son état. L'interface s'adapte au portrait et au paysage, reste nette sur les écrans haute densité, et les écrans HTML gèrent leurs propres touchers (un tap sur un menu ne déclenche jamais un swipe de jeu).

---

## Écrans et machine à états

Les deux idées centrales à retenir sont **la machine à états** et **l'objet `MODES`**.

```text
 accueil ──► choixMode ──► compte ──► jeu ──► fin ──┐
    ▲            ▲                      │            │
    │            │                   accident ───────┤
    │            └── « Changer de mode » ◄───────────┤
    └──────────────── « Changer de joueur » ◄────────┘
                       « Rejouer » ──► compte
```

- Un seul état actif à la fois : on ne peut pas conduire sur l'accueil, ni saisir son nom pendant la course.
- Une seule boucle `requestAnimationFrame` : `lancerPartie()` annule la boucle précédente avant d'en démarrer une nouvelle.
- `reinitialiserPartie()` est l'unique point de remise à zéro d'une partie.
- `MODES` décrit chaque mode ; la boucle appelle les crochets `preparerMode`, `mettreAJourMode`, `verifierFinMode` et `dessinerInterfaceMode`. **Ajouter un mode = une entrée dans `MODES` + ses crochets, sans toucher à la boucle.**

Écrans HTML : accueil (nom + noms récents), choix du mode (cartes générées depuis `MODES`), règles, fin et classement. Le compte à rebours, les feux de départ et les messages de jeu restent dessinés sur le Canvas.

---

## Les 5 modes de jeu

| Mode | Objectif | Fin de partie | Record |
|---|---|---|---|
| 🚗💨 **Esquive** | Éviter le trafic et marquer des points | Premier choc | Points |
| 🏁 **Course** | Finir 1er sur 3 km contre 3 rivaux | Ligne d'arrivée | Meilleur temps |
| ⏱ **Chrono** | Aller le plus loin avec 30 s | Chrono à zéro | Distance |
| 🧘 **Zen** | Rouler sans pression, apprendre la physique | Aucune | Aucun |
| 📅 **Défi du jour** | Même route pour tout le monde aujourd'hui | Premier choc | Score du jour |

### Esquive (le jeu historique)

Chaque voiture dépassée rapporte `1 × combo`. Le combo monte d'un niveau toutes les 5 voitures évitées (jusqu'à ×5) et retombe si l'on change de voie sans raison. Un frôlement (moins de 16 px d'écart) donne +2 points, un ralenti et recharge le nitro d'un tiers. Le nitro double la puissance pendant 3 s et double les points. Jour/nuit et météo (pluie, verglas, flaques, plaques) modifient l'adhérence et la tenue de route.

### Course

- Grille de départ arrêtée avec **5 feux rouges** puis feu vert ; distance de **3 km**.
- 3 rivaux aux personnalités distinctes : **Rapide** (agressif, utilisateur de nitro), **Prudent** (très bons réflexes, plus lent sous la pluie), **Régulier** (jamais de nitro).
- Les 4 voitures utilisent les **mêmes fonctions de physique** (`appliquerMoteur`, `appliquerDirection`) : même puissance, traînée, adhérence et météo.
- Contacts : choc élastique entre voitures, jamais d'élimination ; heurter le trafic coûte de la vitesse et **+2 s**. Le sillage d'un rival recharge le nitro.
- L'IA regarde devant elle, compare avec la distance de sécurité `v·t_réaction + v²/(2μg)`, change de voie après son temps de réaction, commet parfois des erreurs (plus sur verglas) et utilise un élastique léger **désactivé en Difficile**.
- HUD Canvas : position, barre des 3 km, écart en secondes, mini-carte, flèches pour les rivaux hors écran, moteur propre à chaque rival et bips de changement de position.

### Chrono

30 s au départ ; tous les 800 m un portique ajoute le temps de la difficulté (20/15/10 s) et l'espacement augmente de 12 % à chaque passage. Un frôlement rapporte +1 s. Le chrono suit le **temps de jeu** (le ralenti le ralentit aussi). À zéro, la distance parcourue devient le score.

### Zen

Aucune fin, aucun record : un choc ralentit et fait clignoter la voiture. Vitesse limitée à 110 km/h. Des boutons sur le Canvas permettent de choisir la météo, l'heure (jour/nuit), d'afficher un panneau pédagogique (μ, vitesse en m/s, force du moteur, accélération latérale, distance de freinage) et de quitter.

### Défi du jour

Le générateur `mulberry32` est ensemencé par la date (`AAAAMMDD`) : **deux téléphones ont exactement la même route le même jour**. Seuls le trafic, la météo et les dangers utilisent cette graine ; les effets visuels restent aléatoires. Une seule tentative officielle par jour et par joueur est comptée, les suivantes sont des entraînements. L'écran de fin propose « Copier le résultat ».

---

## Difficulté

Tout est regroupé dans un seul objet `DIFFICULTES` dans `script.js`, modifiable en un instant pour l'oral.

| Réglage | Facile | Normal | Difficile |
|---|---:|---:|---:|
| Vitesse de départ | 70 km/h | 90 km/h | 110 km/h |
| Vitesse maximale | 140 | 180 | 220 |
| Densité du trafic | 0,7 | 1,0 | 1,3 |
| Probabilité de verglas | 15 % | 30 % | 50 % |
| Réflexe des rivaux | 0,6 s | 0,4 s | 0,2 s |
| Temps par checkpoint | 20 s | 15 s | 10 s |
| Multiplicateur de score | 0,8 | 1,0 | 1,3 |

La difficulté est mémorisée d'une partie à l'autre. En Difficile, l'élastique des rivaux est coupé.

---

## Records, défi du jour et classements

- **Records** : une clé locale `record.<mode>.<nom>` par joueur et par mode. Le meilleur temps de la course et la distance du chrono sont conservés. L'ancien record global (`recordVoiture`) est repris comme record Esquive du premier joueur venu.
- **Défi du jour** : score daté dans `defi.<date>.<nom>`.
- **Classements** : bouton 🏆 sur l'écran de choix du mode. Un top 10 par mode dans `classement.<mode>` (JSON), trié selon la règle du mode : plus de points (Esquive, Défi), meilleure place puis meilleur temps (Course), plus grande distance (Chrono). Zen n'enregistre rien. Les noms sont comparés en minuscules (« Léa » = « léa »). « Effacer mes scores » demande confirmation **dans la page**.

Toutes les lectures `localStorage` sont protégées par `try/catch` : le jeu fonctionne en navigation privée.

---

## Physique utilisée

Échelle : **20 px = 1 m**, pas de temps fixe de **1/120 s** (comportement identique à 60, 120 ou 144 Hz).

- **Moteur** : `m·a = F_moteur − F_traînée − F_roulement`, avec `F_moteur` limitée par la puissance (`P/v`) et par l'adhérence (`μ·m·g`).
- **Trafic** : voitures à 50 km/h dans le même sens ; à l'écran, elles défilent à la vitesse relative `v_joueur − v_trafic`.
- **Direction** : ressort amorti vers le centre de la voie, accélération latérale limitée par μ, angle `atan(vx / v)`.
- **Adhérence** : sec μ = 0,90 · pluie μ = 0,55 · verglas μ = 0,20 · flaque μ = 0,10 · plaque μ = 0,06.
- **Choc** : conservation de la quantité de mouvement avec coefficient de restitution, rotation si le choc est décentré, puis glissade freinée par `μ·g`.
- **Son** : régime moteur calculé avec une boîte 6 vitesses, bruit du vent en `v²`, crissement de pneus modélisant le stick-slip (700–1500 Hz + harmoniques).

---

## Structure du projet

```text
index.html                 Structure du jeu et des 5 écrans HTML
style.css                  Mise en page, thème course, responsive, accessibilité
script.js                  Machine à états, MODES, physique, IA, rendu, son, stockage
README.md / README.txt     Documentation (Markdown / texte)
playwright.config.js       Configuration des tests navigateur
tests/verification.mjs     23 vérifications headless (DOM simulé)
tests/check-structure.mjs  Contrôle des ids HTML et des accolades CSS
tests/e2e/scenarios.spec.js 7 scénarios Playwright
images/route.jpg, voiture-*.png, meteo/*.svg, propositions/*.svg
```

---

## Tests

```bash
# 1. Vérifications headless — aucune installation
node tests/verification.mjs

# 2. Scénarios navigateur (Chromium)
npm install --no-save @playwright/test@1.65.1
npx playwright test
```

**23 vérifications headless** : parcours complet, records, difficulté, boucle unique, grille de course, 60 s de rivaux sans accident, checkpoints Chrono, limites Zen, stabilité de la graine du jour, classements.

**7 scénarios Playwright** : nom invalide refusé et nom mémorisé ; chaque mode lancé/terminé/relancé 5 fois sans erreur console ; changement de mode sans recharger ; clavier seul puis geste sur le Canvas ; stockage indisponible simulé ; portrait et paysage sans débordement ; classement et effacement confirmé.

Le serveur local et le navigateur sont lancés automatiquement par la configuration Playwright.

---

## Fiche oral

**Pourquoi une machine à états ?**
Le jeu n'a plus une seule règle codée en dur. L'état courant décide des commandes actives et des écrans visibles. Les transitions sont explicites et `reinitialiserPartie()` est l'unique remise à zéro, ce qui évite les bugs entre deux parties.

**Comment la course reste-t-elle juste ?**
Les quatre voitures appellent les mêmes fonctions `appliquerMoteur` / `appliquerDirection`. L'IA n'a pas de vitesse magique : elle décide seulement d'une voie et du nitro. L'élastique est léger et coupé en Difficile.

**Comment fonctionne la graine du défi du jour ?**
`mulberry32(AAAAMMDD)` produit une suite déterministe branchée sur tout ce qui construit la route via `aleatoire()`. Les étincelles et gouttes gardent `Math.random` car elles n'influencent pas le jeu. Même date = même route.

**Pourquoi un pas de temps fixe ?**
`boucle()` accumule le temps réel et exécute `mettreAJour(1/120 s)` autant de fois que nécessaire : la physique est identique à 60, 120 ou 144 Hz, et le chrono suit le temps de jeu.

**Comment sont gérés records et classements ?**
Un record par joueur et par mode, un meilleur temps pour la course, une distance pour le chrono, un score daté pour le défi. Les classements sont des top 10 JSON triés selon la règle du mode, avec fusion des noms quelle que soit la casse, et lectures `localStorage` protégées.
