# Audio

Tous les sons du jeu sont **synthétisés** par la Web Audio API : le dépôt ne contient aucun fichier
audio. Le code est dans `src/audio/`.

## Organisation

| Fichier           | Contenu                                                                     |
| ----------------- | --------------------------------------------------------------------------- |
| `contexte.js`     | Contexte audio partagé, bruit blanc, primitives `jouerBip` et `jouerBruit`. |
| `sonsContinus.js` | Sons qui durent : moteur, crissement de pneus, vent, pluie.                 |
| `effets.js`       | Sons ponctuels, un par événement du jeu (dépassement, nitro, accident…).    |
| `audio.js`        | `initialiserSon`, `basculerSon`, `mettreAJourSons`, `brancherAudio`.        |

Le navigateur n'autorise le son qu'après une action de l'utilisateur : le contexte est créé au
premier appui sur « Démarrer » (ou au premier toucher). Le son est mis en pause quand l'onglet est
caché, et le choix « son coupé » est mémorisé.

## Sons continus

### Moteur

Deux oscillateurs (dent de scie et carré une octave plus bas) passent dans un filtre passe-bas.

- Le **régime** se déduit de la vitesse et d'une boîte à 6 rapports (changement automatique à 6200 et
  2600 tr/min).
- Moteur 4 cylindres : 2 explosions par tour, donc `fréquence = régime / 30`.
- L'ouverture du filtre augmente avec le régime, l'accélérateur et le nitro.

### Crissement de pneus

Un pneu qui dérape **accroche et décroche des centaines de fois par seconde** (_stick-slip_) : cela
produit un sifflement presque musical, qui tremble. On le reproduit avec :

1. un bruit blanc passé dans trois filtres très sélectifs (une note et ses deux harmoniques) ;
2. un oscillateur à la même note, dont la hauteur vibre de façon irrégulière (deux oscillateurs
   lents, de fréquences sans rapport simple) ;
3. un bruit de frottement large (la gomme sur l'asphalte) ;
4. un grondement grave (la carrosserie qui vibre) ;
5. une légère saturation, comme un son enregistré de près.

La **note monte avec la vitesse de glissement** et baisse quand la voiture ralentit en glissant. Le
volume suit le niveau de glisse de la physique et est atténué par la météo (peu de crissement sur le
mouillé, presque aucun sur la glace).

### Vent et pluie

- **Vent** : bruit filtré dont le volume croît comme `v²`, comme la traînée aérodynamique.
- **Pluie** : bruit aigu de l'averse, plus le « chhhh » des pneus qui chassent l'eau, proportionnel à
  la vitesse.

## Effets

| Événement        | Son                                                                    |
| ---------------- | ---------------------------------------------------------------------- |
| `compteARebours` | bip carré                                                              |
| `depart`         | bip long et aigu                                                       |
| `changementVoie` | petit souffle                                                          |
| `depassement`    | souffle descendant (clin d'œil à l'effet Doppler) et « ding »          |
| `frolement`      | souffle aigu très proche et deux notes                                 |
| `combo`          | arpège d'autant plus aigu que le multiplicateur est grand              |
| `nitroActive`    | souffle montant et grondement grave                                    |
| `accident`       | choc sourd, fracas de tôle, bris de verre                              |
| `meteo`          | tonnerre (pluie), tintements de givre (verglas), notes (retour au sec) |
| `danger`         | splash (flaque) ou craquement de glace (plaque)                        |
| `fin`            | mélodie montante si nouveau record                                     |

## Ajouter un son

Voir « Ajouter un son » dans [`ARCHITECTURE.md`](ARCHITECTURE.md#ajouter-un-son).
