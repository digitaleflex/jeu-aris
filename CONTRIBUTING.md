# Contribuer à Jeu Aris

Merci de votre intérêt ! Ce guide explique comment proposer une amélioration ou corriger un bug.
Le projet est petit et accueillant : n'hésitez pas à poser une question dans une issue avant de vous
lancer.

## Avant de commencer

- Lisez le [README](README.md) pour lancer le jeu, et [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
  pour comprendre comment le code est organisé.
- Cherchez dans les [issues](https://github.com/digitaleflex/jeu-aris/issues) si votre idée ou votre
  bug existe déjà. Les issues portant l'étiquette `good first issue` sont de bons points d'entrée.
- Pour une grosse évolution, **ouvrez d'abord une issue** : on s'accorde sur le comportement avant
  d'écrire du code.
- En participant, vous acceptez le [code de conduite](CODE_OF_CONDUCT.md).

## Installer le projet

Il faut [Node.js](https://nodejs.org) 22 ou plus.

```bash
git clone https://github.com/digitaleflex/jeu-aris.git
cd jeu-aris
npm install
npm start          # http://localhost:8080
```

Le jeu n'a **aucune dépendance d'exécution** : `npm install` installe seulement les outils de
développement (ESLint, Prettier, Playwright).

## Les commandes utiles

| Commande           | Rôle                                            |
| ------------------ | ----------------------------------------------- |
| `npm start`        | sert le jeu sur <http://localhost:8080>         |
| `npm test`         | tests unitaires (≈ 1 s, sans navigateur)        |
| `npm run test:e2e` | tests dans un vrai navigateur (voir ci-dessous) |
| `npm run lint`     | ESLint                                          |
| `npm run format`   | reformate le code avec Prettier                 |

Pour les tests de bout en bout, installez une fois le navigateur : `npx playwright install chromium`.
Si Chromium est déjà installé ailleurs, indiquez son chemin :
`PLAYWRIGHT_CHROMIUM_PATH=/chemin/vers/chrome npm run test:e2e`.

Pour régénérer les captures d'écran de la documentation : lancez `npm start`, puis
`node scripts/captures.mjs` dans un autre terminal.

## Proposer un changement

1. **Créez une branche** à partir de `main` : `type/description-courte`, par exemple
   `fix/nitro-bouton` ou `feat/mode-chrono`.
2. **Écrivez le code** en respectant l'architecture (voir plus bas) et le style (Prettier et ESLint
   s'en occupent : `npm run format && npm run lint`).
3. **Ajoutez ou adaptez les tests.** Une règle de jeu ou un bug corrigé sans test n'est pas terminé.
4. **Mettez à jour la documentation** si le comportement, les commandes ou l'architecture changent
   (`README.md`, `docs/`, `CHANGELOG.md`).
5. **Vérifiez** : `npm test`, `npm run lint`, `npm run format:verifier`, et `npm run test:e2e` si vous
   avez touché à l'interface.
6. **Ouvrez une pull request** en remplissant le modèle. Expliquez le _pourquoi_, pas seulement le
   _quoi_, et joignez une capture ou une courte vidéo pour tout changement visible.

### Messages de commit

Format [Conventional Commits](https://www.conventionalcommits.org/lang/fr/), en français, à
l'impératif ou au présent :

```
feat: ajoute le mode Contre-la-montre
fix: empêche le bouton nitro de pulser après l'activation
docs: explique la direction dans PHYSIQUE.md
refactor: extrait le calcul des frôlements
test: couvre les bornes de la probabilité de verglas
```

Un commit = un changement cohérent. Si votre PR corrige une issue, écrivez `Closes #12` dans sa description.

## Les règles d'architecture

Elles sont vérifiées par `tests/unitaires/architecture.test.js` : si vous les enfreignez, la CI échoue.

- **Le cœur du jeu ne connaît pas le navigateur.** `etat/`, `route/`, `physique/`, `meteo/`,
  `systemes/`, `modes/`, `environnement/` et `simulation.js` ne touchent ni au DOM, ni au Canvas, ni
  au son. Le rendu, l'audio, l'interface et les entrées sont dans `rendu/`, `audio/`, `ui/`, `entrees/`.
- **Les règles émettent des événements** (`jeu.evenements.emettre(...)`) ; l'audio et la vibration
  s'y abonnent. Une règle n'appelle jamais directement un son.
- **Le hasard du gameplay passe par `jeu.alea()`**, pas par `Math.random()`. `Math.random()` reste
  permis pour les effets purement visuels ou sonores.
- **Pas de constante globale pour ce qui peut varier** : le nombre de voies, les caractéristiques d'un
  véhicule et les réglages de difficulté sont des données (`route`, `joueur.caracteristiques`,
  `jeu.reglages`).
- Dépendances entre dossiers : base ← cœur ← périphérie ← assemblage (voir `docs/ARCHITECTURE.md`),
  sans cycle.

## Changer le gameplay

Le test de caractérisation (`tests/unitaires/jeu.test.js`, « fige le comportement du jeu ») décrit une
partie de référence. Si **vous changez volontairement** une règle, il échouera : mettez ses valeurs à
jour dans la même PR et dites pourquoi dans la description. S'il échoue sans que vous ayez voulu
changer le jeu, c'est un bug.

## Style du code

- Vocabulaire du domaine **en français** (`voie`, `adherence`, `obstacles`) ; termes techniques
  courants en anglais (`canvas`, `ctx`).
- JSDoc sur toute fonction exportée. Les unités sont dans les noms ou les commentaires
  (`px`, `m/s`, `km/h`, `s`).
- Fonctions courtes, une responsabilité. Pas de code mort ni de `console.log` oublié.
- Commentaires utiles : expliquez le **pourquoi** (une formule, une valeur choisie), pas ce que dit le code.

## Signaler un bug

Ouvrez une issue avec le modèle « Bug » : ce que vous attendiez, ce qui s'est passé, comment
reproduire, votre appareil et votre navigateur. Une capture d'écran aide beaucoup. Pour une faille de
sécurité, suivez plutôt [`SECURITY.md`](SECURITY.md).

## Étiquettes

| Étiquette          | Sens                                        |
| ------------------ | ------------------------------------------- |
| `bug`              | quelque chose ne fonctionne pas             |
| `enhancement`      | amélioration d'une fonctionnalité existante |
| `gameplay`         | règles et sensations de jeu                 |
| `physique`         | comportement physique réaliste              |
| `météo`            | conditions climatiques et adhérence         |
| `graphismes`       | visuels, SVG, effets                        |
| `son`              | sons et ambiance sonore                     |
| `ergonomie`        | prise en main, mobile, accessibilité        |
| `modes de jeu`     | choix et règles des modes                   |
| `interface`        | écrans, menus, navigation                   |
| `epic`             | grand chantier regroupant plusieurs issues  |
| `documentation`    | docs, README, guides                        |
| `good first issue` | adaptée à une première contribution         |
