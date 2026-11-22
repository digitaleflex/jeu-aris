# Décisions d'architecture

Chaque entrée explique **pourquoi** un choix a été fait, ce qu'il coûte, et ce qui le remettrait en
cause. Format : contexte → décision → conséquences.

## 1. Modules ES, sans outil de compilation

**Contexte.** Le jeu tenait dans un seul `script.js` de 2100 lignes mêlant physique, dessin, son et
interface. Trop long à lire, impossible à tester sans navigateur.

**Décision.** Découper en modules ES natifs (`<script type="module">`), sans bundler ni
transpilation. Le code servi est le code écrit.

**Conséquences.**

- ✅ Aucune étape de build, aucune dépendance d'exécution, débogage direct dans le navigateur.
- ⚠️ Le jeu ne s'ouvre plus en double-cliquant sur `index.html` (`file://` bloque les modules) : il
  faut un serveur HTTP (`npm start`). `index.html` affiche un message d'aide dans ce cas.
- ⚠️ Le TP d'origine demandait un unique `script.js` en fin de `body` sans `defer` ; ce n'est plus
  le cas, par choix du projet.
- 🔁 Un bundler pourrait être ajouté si le nombre de fichiers ralentissait le chargement (≈ 50
  petits fichiers en HTTP/2 : pas un problème aujourd'hui).

## 2. Un cœur indépendant du navigateur

**Contexte.** Tester la physique ou les combos ne devrait pas demander d'ouvrir un navigateur.

**Décision.** Séparer le **cœur** (état, physique, règles, simulation) de la **périphérie** (rendu,
audio, HUD, entrées). Le cœur ne référence ni `document`, ni `window`, ni Web Audio.

**Conséquences.** Plus de 150 tests unitaires s'exécutent sous Node en ≈ 1 s. La règle est **vérifiée par un
test** (`architecture.test.js`) : un import ou une API de navigateur dans le cœur fait échouer la CI.

## 3. Événements plutôt qu'appels directs vers le son et l'interface

**Contexte.** Dans l'ancien code, calculer un point appelait directement un son, un texte HTML et la
vibration.

**Décision.** Les règles émettent des événements nommés (`depassement`, `accident`…) ; l'audio et la
vibration s'y abonnent. L'interface HTML relit l'état à chaque image.

**Conséquences.** Les règles ne dépendent plus de l'audio. Ajouter une réaction ne modifie pas les
règles. Contrepartie : le lien « cet événement déclenche ce son » est indirect ; la table dans
`src/evenements.js` et `docs/AUDIO.md` le documente.

## 4. Pas de temps fixe

**Contexte.** Une vitesse « en pixels par image » varie selon la fréquence de l'écran (60 Hz,
120 Hz…).

**Décision.** Simuler par pas de 1/120 s avec un accumulateur ; le rendu se fait à la fréquence de
l'écran.

**Conséquences.** Comportement identique partout et déterministe, ce qui rend les tests fiables.
Coût : plusieurs pas de simulation par image sur un écran lent (plafonné à 0,1 s de temps simulé).

## 5. Hasard injecté et séparé

**Contexte.** Rejouer une partie (tests, futur « défi du jour ») exige un hasard reproductible, mais
les effets visuels n'ont pas à l'être.

**Décision.** Le gameplay tire ses nombres dans `jeu.alea` (par défaut `Math.random`, ou un
générateur à graine) ; les effets visuels et sonores utilisent `Math.random`.

**Conséquences.** Même graine → même partie, quels que soient les effets. Le test d'architecture
interdit `Math.random` dans les fichiers qui décident du gameplay.

## 6. Données plutôt que constantes globales

**Contexte.** Le nombre de voies (3), la masse, la puissance… étaient des constantes utilisées
partout, ce qui rendait impossible une route à 4 voies ou un second véhicule.

**Décision.** `route` (voies, largeur) et `joueur.caracteristiques` (masse, puissance, direction)
sont des **valeurs** passées au code ; les fonctions n'importent plus ces constantes.

**Conséquences.** Une route à 1–6 voies fonctionne sans toucher au moteur (testé). Les véhicules ont
leurs propres paramètres. Limites connues : voies de même largeur, route droite, décor prévu pour
3 voies.

## 7. Refonte à comportement constant

**Contexte.** Une refonte qui change aussi le gameplay est impossible à relire.

**Décision.** Aucune règle de jeu modifiée pendant la refonte. Elle a été vérifiée en exécutant
l'ancien et le nouveau code avec le même hasard, les mêmes commandes et le même temps, puis en
comparant l'état complet toutes les 0,5 s et l'image du Canvas toutes les 5 s : résultats
strictement identiques sur plusieurs graines (pluie, verglas, nuit, accident, redémarrages).

**Conséquences.** Deux bizarreries historiques ont été **conservées volontairement** et sont notées
dans le code : le seuil d'apparition des dangers est retiré à chaque pas (`meteo/dangers.js`), et la
dynamique latérale n'est pas en unités réelles (`docs/PHYSIQUE.md`). Les corriger est un changement de
gameplay : il se fait dans une PR dédiée.

## 8. Écrans HTML pilotés par l'état

**Contexte.** La version « écrans » du jeu (accueil, choix du mode, règles, fin) gérait la navigation
en affichant et cachant des sections du DOM depuis le même fichier que la physique.

**Décision.** La navigation est de l'état (`jeu.phase`, `jeu.reglesMode`, `jeu.nomJoueur`) modifié par
`etat/navigation.js`, sans DOM. `ui/ecrans.js` ne fait qu'afficher l'état et transmettre les actions du
joueur. Même principe que le HUD.

**Conséquences.** Toute la navigation (validation du nom, noms récents, migration du record,
règles, « ne plus afficher », difficulté) est testée sous Node. Contrepartie : un événement
`navigation` relie les deux côtés, car en menu aucune boucle d'animation ne rafraîchit l'interface.

## 9. Un mode est avant tout des données

**Contexte.** Le tableau `MODES` de la version « écrans » décrivait les cinq modes (nom, règles, trafic,
collision fatale, distance cible…) et prévoyait quatre fonctions « crochets » globales.

**Décision.** Un mode est un objet `{ données…, crochets facultatifs }` ; les crochets (`preparer`,
`mettreAJour`, `verifierFin`, `dessinerInterface`) deviennent des propriétés du mode, et
`reglesDePartie` applique les règles standard en lisant ses données. Les modes à venir sont déjà
déclarés (`disponible: false`) pour que l'écran de choix les affiche.

**Conséquences.** Activer un mode ne demande pas de modifier le moteur. Un mode qui aurait besoin
d'un déroulement radicalement différent devra étendre `reglesDePartie`, ce qui reste à valider avec
le premier mode réel (Course).

## Écarts connus avec la version précédente

La refonte conserve le comportement de la version précédente, à une exception près, purement visuelle :
le bouton nitro cesse de pulser « prêt » dès l'activation du nitro (l'ancien code ne mettait cette
classe à jour que lorsque la charge **affichée** changeait, ce qui laissait le bouton pulser une à
deux images de trop).
