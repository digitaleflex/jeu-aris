# Physique du jeu

La simulation utilise des **unités réelles** (SI) puis les convertit en pixels pour l'écran. Ce
document donne les équations, les valeurs de départ et leur justification. Le code correspondant est
dans `src/physique/` et `src/meteo/conditions.js`.

## Échelle et temps

| Grandeur     | Valeur                  | Où                              |
| ------------ | ----------------------- | ------------------------------- |
| Échelle      | **20 px = 1 m**         | `PX_PAR_METRE`                  |
| Voiture      | 48 × 89 px ≈ 2,4 × 4,5 m | `GABARIT_VOITURE`               |
| Pesanteur    | g = 9,81 m/s²           | `G`                             |
| Pas de temps | **1/120 s**, fixe       | `PAS_PHYSIQUE`                  |

Un pas **fixe** rend la simulation indépendante de la fréquence d'affichage : à 60, 120 ou 144 Hz, la
voiture parcourt exactement la même trajectoire (`avancerSimulation` accumule le temps réel et
exécute autant de pas que nécessaire).

La voiture du joueur reste **fixe à l'écran** (verticalement). C'est le décor et le trafic qui
bougent : la route défile à la vitesse `v_joueur`, et une voiture du trafic descend à la **vitesse
relative** `v_joueur − v_trafic`.

## Moteur (mouvement longitudinal)

Principe fondamental de la dynamique :

```
m · a = F_moteur − F_traînée − F_roulement
```

| Terme          | Formule                       | Valeurs par défaut                                   |
| -------------- | ----------------------------- | ---------------------------------------------------- |
| `F_traînée`    | ½ · ρ · Cx · S · v²           | ρ = 1,2 kg/m³, Cx = 0,32, S = 2,2 m² → 0,42 · v² (N) |
| `F_roulement`  | C_rr · m · g                  | C_rr = 0,012, m = 1200 kg → 141 N                    |
| `F_moteur`     | **min( P / v , μ · m · g )**  | P = 120 kW (≈ 163 ch)                                |
| Freinage       | −min(0,8 · m · g, …)          | 0,8 g au maximum                                     |

La force du moteur est limitée par **deux** plafonds, comme sur une vraie voiture :

- à haute vitesse, c'est la **puissance** : `F = P / v` ;
- à basse vitesse, c'est l'**adhérence** : les roues ne peuvent pas transmettre plus de `μ·m·g`.

Conséquence mesurable (testée) : l'accélération ne dépasse jamais `μ·g`, soit 8,8 m/s² sur route
sèche, 5,4 sous la pluie, **1,96 sur le verglas**.

### Le régulateur

Le joueur ne pilote pas l'accélérateur : un régulateur vise une vitesse qui monte avec le score.

```
vitesse visée = min(180, 90 + 2,5 × voitures évitées)  [+ 70 pendant le nitro]  × facteur météo
```

L'accélérateur (0 à 1) vaut la puissance qui compense exactement les résistances, plus un
supplément proportionnel à l'écart avec la vitesse visée. Si la vitesse dépasse la visée de plus de
1 m/s, la voiture freine. Ordre de grandeur : à 90 km/h les résistances demandent 10 kW (8 % de la
puissance) ; à 180 km/h, 60 kW (50 %).

### Nitro

Pendant 3 s : puissance × 2,2 (donc `P / v` plus grand), vitesse visée + 70 km/h, points doublés.
Sur route glissante, `μ·m·g` plafonne la force : les roues **patinent** (le son et les traces le
signalent) au lieu d'accélérer plus.

## Direction (mouvement latéral)

La voiture est rappelée vers le centre de sa voie par un **ressort amorti** :

```
a_x = k · (x_cible − x) − c · v_x         avec k = 130 s⁻², c = 19 s⁻¹
```

Fréquence propre ω₀ = √k ≈ 11,4 rad/s, amortissement ζ = c / (2ω₀) ≈ 0,83 : le changement de voie
prend ≈ 0,3 s, avec un très léger dépassement.

L'accélération latérale est **plafonnée proportionnellement à l'adhérence** :

```
|a_x| ≤ a_max · μ / μ_sec         avec a_max = 2600 px/s²
```

Quand le plafond est atteint, le ressort ne peut plus « tenir » la voiture : elle met plus de temps
et **dépasse** sa voie. Valeurs mesurées (tests `physique.test.js`) :

| Route   | μ    | a_x max (px/s²) | Changement de voie (90 % du trajet) | Dépassement |
| ------- | ---- | --------------- | ----------------------------------- | ----------- |
| Sèche   | 0,90 | 2600            | ≈ 0,33 s                            | 0,3 px      |
| Pluie   | 0,55 | 1589            | ≈ 0,38 s                            | 0,3 px      |
| Verglas | 0,20 | 578             | ≈ 0,53 s                            | ≈ 14 px     |

> ⚠️ **Ce plafond n'est pas en unités réelles.** 2600 px/s² valent 130 m/s², soit 13 g, alors
> qu'un pneu réel ne dépasse pas `μ·g` (8,8 m/s² sur sec). Un vrai changement de voie de 3,9 m
> prendrait environ 1 s. Le jeu privilégie la réactivité (0,3 s) : **seul le rapport entre les
> routes (μ / μ_sec) est réaliste**, pas la valeur absolue. Rendre la direction physiquement
> cohérente est une piste de la [feuille de route](FEUILLE-DE-ROUTE.md) (issue « Simulation de conduite »).

L'orientation de la voiture suit la direction réelle de sa vitesse : `angle = atan(v_x / v)`, limité
à ±0,5 rad.

### Glisse et traces de pneus

Le niveau de **glisse** (0 = adhère, 1 = dérape) est le maximum de deux causes :

- **glissement latéral** : l'accélération latérale approche la limite d'adhérence ;
- **patinage** : la force demandée au moteur (`accélérateur · P / v`) approche `μ·m·g`.

Il pilote le son de crissement (voir [`AUDIO.md`](AUDIO.md)) et les traces de pneus, d'autant
moins marquées que la route est mouillée ou gelée.

## Adhérence et météo

Le coefficient d'adhérence μ (`src/meteo/conditions.js`) est le **seul** paramètre qui change la
conduite d'une météo à l'autre :

| Condition                        | μ    | Vitesse visée | Crissement | Traces |
| -------------------------------- | ---- | ------------- | ---------- | ------ |
| Route sèche                      | 0,90 | × 1           | 100 %      | 100 %  |
| Pluie                            | 0,55 | × 0,82        | 35 %       | 30 %   |
| Verglas                          | 0,20 | × 0,65        | 8 %        | 5 %    |
| Flaque (aquaplaning)             | 0,10 | —             | —          | —      |
| Plaque de verglas                | 0,06 | —             | —          | —      |

Les transitions sont **progressives** (≈ 2 s) : μ est interpolé selon l'intensité de la pluie et du
verglas. Une flaque ou une plaque impose `min(μ météo, μ danger)` tant que les roues sont dessus.

Sur le verglas s'ajoute une force latérale irrégulière (somme de deux sinus de périodes
différentes) qui fait dériver la voiture même sans toucher au volant.

### Distance de freinage

`d = v² / (2 · μ · g)`, à 90 km/h (25 m/s), sans temps de réaction :

| Route   | Distance |
| ------- | -------- |
| Sèche   | 35 m     |
| Pluie   | 58 m     |
| Verglas | 159 m    |

C'est pourquoi le jeu espace davantage les vagues de trafic quand la route est glissante.

## Collisions et accident

**Détection** : rectangles alignés sur les axes, réduits de 5 px (côtés) et 4 px (haut et bas) pour
coller à la carrosserie. Deux rectangles se touchent si aucun n'est entièrement à gauche, à droite,
au-dessus ou en dessous de l'autre.

**Choc** : conservation de la quantité de mouvement (masses égales) avec un coefficient de
restitution e = 0,3 (choc partiellement élastique) :

```
v₁' + v₂' = v₁ + v₂
v₂' − v₁' = e · (v₁ − v₂)
```

Un choc **décentré** fait tourner les deux voitures (moment de la force) : le sens dépend du côté de
l'impact, l'intensité de la vitesse d'impact.

**Glissade** : après le choc, les voitures ralentissent avec une décélération constante `μ·g`
jusqu'à l'arrêt, rebondissent sur les bords de la route (restitution 0,3) puis la partie se termine.
Sur le verglas, elles glissent beaucoup plus loin.

## Ce qui est volontairement simplifié

- **La dynamique latérale n'est pas en unités réelles** (voir l'avertissement ci-dessus) : la
  dynamique longitudinale (moteur, traînée, freinage, choc) l'est, pas la direction.
- La voiture ne tourne pas autour de son centre pendant la conduite normale : seule sa trajectoire
  latérale est simulée (l'angle est un effet visuel dérivé de la vitesse).
- Pas de transfert de masse, de suspension ni de pneus différenciés par essieu.
- Le trafic ne simule pas de moteur : il roule à vitesse constante.
- La vitesse maximale est limitée par le régulateur, pas par l'équilibre traînée / puissance.

Ces pistes sont suivies dans les issues « Physique » de la
[feuille de route](FEUILLE-DE-ROUTE.md).
