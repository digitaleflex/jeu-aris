JEU DE VOITURE — Course sur 3 voies
===================================

LANCER LE JEU
  Ouvrir index.html dans un navigateur récent (Chrome, Firefox, Edge, Safari).
  Aucune installation ni connexion internet nécessaire.
  Les sons sont générés par le navigateur (Web Audio API) : aucun fichier audio.

COMMANDES
  Accueil   :  tape ton nom (2 à 12 caractères : lettres, chiffres,
               espace ou tiret), puis Entrée ou « Continuer ».
               Les 3 derniers noms sont proposés en un clic.
  Choix du mode :  flèches gauche/droite (ou haut/bas) pour passer d'une
               carte à l'autre, Entrée pour ouvrir les règles,
               Échap pour revenir à l'accueil.
  Règles    :  « C'est parti ! » lance la partie, « Retour » revient aux modes.
               La case « Ne plus afficher » mémorise ton choix.
  En jeu    :  Flèche gauche / Q / A  -> voie de gauche
               Flèche droite / D       -> voie de droite
               Flèche haut / Z / W     -> NITRO
               M                       -> couper / remettre le son
  Fin       :  Espace / Entrée, ou toucher l'écran hors boutons = Rejouer.
               Boutons : Rejouer, Changer de mode, Changer de joueur.
  Téléphone :  Glisser le doigt vers la gauche / la droite (n'importe où
               sur l'écran de jeu ; un long swipe peut changer de 2 voies),
               toucher la moitié gauche / droite de la route,
               ou les boutons « Gauche » et « Droite ».
               Glisser vers le HAUT (ou bouton 🔥) -> NITRO
               Les écrans HTML gèrent leurs propres boutons : un toucher
               sur un écran ne déclenche jamais un swipe de jeu.
               Le jeu s'adapte à la taille de l'écran (portrait et paysage)
               et reste net sur les écrans haute densité.
  Bouton 🔊     -> son activé / coupé (mémorisé)

ÉCRANS
  - Accueil : saisie du nom + noms récents.
  - Choix du mode : cartes générées depuis MODES (les 5 modes sont
    disponibles), record affiché pour chaque mode et le joueur courant,
    dernier mode joué mis en avant.
  - Règles : 3 lignes de règles avant de lancer le mode.
  - Fin de partie : score, combo max, frôlements, distance parcourue,
    message de record, puis Rejouer / Changer de mode / Changer de joueur.
  Le compte à rebours reste dessiné sur le Canvas et les messages
  (départ, météo, accident) restent dans la barre #message ; l'ancien écran
  « Prêt ? » est remplacé par l'accueil HTML.

MACHINE À ÉTATS (les deux idées à présenter à l'oral, avec l'objet MODES)
  accueil ──► choixMode ──► compte ──► jeu ──► fin ──┐
     ▲            ▲                      │            │
     │            │                   accident ───────┤
     │            └── « Changer de mode » ◄───────────┤
     └────────────── « Changer de joueur » ◄──────────┘
                        « Rejouer » ──► compte
  Un seul état actif à la fois. Une seule boucle requestAnimationFrame :
  lancerPartie() annule la boucle précédente avant d'en démarrer une nouvelle.
  L'objet MODES décrit chaque mode ; les crochets preparerMode, mettreAJourMode,
  verifierFinMode et dessinerInterfaceMode sont appelés par la boucle. Ajouter
  un mode = une entrée dans MODES (+ ses crochets), sans modifier la boucle.

DIFFICULTÉ
  Choisie sur l'écran de mode, mémorisée pour la prochaine partie.
  Un seul tableau (DIFFICULTES dans script.js) regroupe les réglages :
    réglage              facile  normal  difficile
    vitesse de départ      70      90       110   km/h
    vitesse maximale      140     180       220   km/h
    densité du trafic     0,7     1,0       1,3
    probabilité verglas   15 %    30 %      50 %
    réflexe rivaux        0,6 s   0,4 s     0,2 s   (course : temps de réaction des rivaux ; l'élastique est coupé en Difficile)
    temps checkpoint      20 s    15 s      10 s    (modes futurs)
    multiplicateur score  0,8     1,0       1,3
  La densité agit sur l'écart entre les vagues de voitures, la probabilité
  de verglas sur le choix pluie/verglas, et le multiplicateur sur les points.

RECORDS
  Chaque joueur a son record par mode (clé locale record.<mode>.<nom>).
  Le record affiché dans le tableau de bord et sur les cartes est celui
  du joueur et du mode courants. Au premier nom validé, l'ancien record
  unique (recordVoiture) est repris comme record Esquive de ce joueur.

RÈGLES
  - Évitez les voitures qui arrivent : chaque voiture dépassée rapporte
    1 point × le multiplicateur de combo.
  - COMBO : toutes les 5 voitures évitées d'affilée, le multiplicateur
    augmente (×2, ×3… jusqu'à ×5). Changer de voie alors qu'aucune voiture
    n'arrive dans la sienne fait perdre le combo.
  - FRÔLEMENT : dépasser une voiture en passant à moins de 16 px d'elle
    donne +2 points, un ralenti, et recharge le nitro d'un tiers.
  - NITRO : quand la jauge est pleine, la puissance du moteur est
    multipliée par 2,2 pendant 3 s et les points sont doublés.
    La jauge se recharge lentement, et vite grâce aux frôlements.
  - JOUR / NUIT : le ciel change avec la distance (coucher de soleil, nuit,
    aube). La nuit, seuls les phares éclairent la route ; on repère les
    autres voitures à leurs feux arrière rouges.
  - MÉTÉO : la route passe de sèche à PLUIE ou VERGLAS (annonce avec le
    panneau « chaussée glissante »). L'adhérence μ est affichée à gauche :
      sec μ = 0,90  •  pluie μ = 0,55  •  verglas μ = 0,20
    Moins d'adhérence = changements de voie plus lents, la voiture dépasse
    sa voie sur la glace, le nitro fait patiner les roues, et après un choc
    la voiture glisse beaucoup plus loin.
    FLAQUES (pluie) : aquaplaning, μ = 0,10 et la voiture est déviée.
    PLAQUES DE VERGLAS : μ = 0,06.
  - La vitesse augmente avec le nombre de voitures dépassées ; le départ,
    le plafond et la densité du trafic dépendent de la difficulté choisie
    (voir DIFFICULTÉ). Le nitro ajoute +70 km/h.
  - En Esquive et Défi du jour, une collision termine la partie. Le meilleur
    score du joueur pour ce mode est conservé (record par joueur et par mode).
    En Course, Chrono et Zen, un choc ne fait que ralentir.

MODE COURSE
  - Grille de départ : 5 feux rouges, puis feu vert, départ arrêté.
  - 3 km à parcourir contre 3 rivaux (Rapide, Prudent, Régulier).
    Le trafic civil reste présent mais 40 % moins dense ; un choc avec lui
    coûte beaucoup de vitesse et +2 s de pénalité, sans fin de partie.
  - Les 4 voitures utilisent exactement les mêmes fonctions de physique
    (appliquerMoteur / appliquerDirection) : moteur, traînée, adhérence et
    météo identiques pour tous.
  - Contact entre voitures : choc élastique qui dévie et ralentit, jamais
    d'élimination. Les voitures sont écartées si elles se superposent.
  - Rester dans le sillage d'un rival (4 à 22 m) recharge le nitro.
  - IA : chaque pilote regarde devant lui, compare avec la distance de
    sécurité v·t_réaction + v²/(2μg) (plafonnée au champ de vision), choisit
    une voie libre après son temps de réaction, commet parfois une erreur
    (plus souvent sur verglas), et utilise le nitro en ligne droite si son
    profil est agressif. Élastique léger sauf en Difficile.
  - Affichage Canvas : position (1er/4…), barre des 3 km, écart en secondes,
    mini-carte verticale et flèches pour les rivaux hors écran. Chaque rival
    a son propre son de moteur, plus fort quand il est proche ; un bip montant
    ou descendant annonce un changement de position.
  - Fin : classement, temps total, pénalités et meilleur temps du joueur
    (record.course.<nom>, affiché en mm:ss,centièmes).

MODE CHRONO
  - Le chrono démarre à 30 s et descend. Tous les 800 m, un portique ajoute
    le temps checkpoint de la difficulté (20 / 15 / 10 s). L'espacement
    augmente de 12 % à chaque passage.
  - Un frôlement rapporte +1 s ; un choc avec le trafic fait perdre beaucoup
    de vitesse mais ne termine pas la partie.
  - Fin à 0 s : le résultat est la distance parcourue, mémorisée par joueur.
  - Le chrono suit le temps de jeu : le ralenti des frôlements le ralentit
    aussi. Il passe à l'orange sous 10 s, au rouge sous 5 s avec un bip.

MODE ZEN
  - Aucune fin de partie : un choc ralentit et fait clignoter la voiture.
  - Trafic léger, vitesse plafonnée à 110 km/h, aucun record enregistré.
  - Boutons sur le Canvas : météo (sec / pluie / verglas), heure (jour / nuit),
    panneau pédagogique et Sortir. La météo change avec la même transition
    douce qu'en jeu ; l'heure force le cycle jour/nuit.
  - Le panneau affiche les vraies variables de la physique : μ, vitesse en
    m/s, force du moteur, accélération latérale et distance de freinage.

DÉFI DU JOUR
  - La graine du générateur mulberry32 est la date (AAAAMMDD) : deux
    téléphones génèrent exactement la même route le même jour.
  - Seuls le trafic, la météo et les dangers utilisent cette graine ; les
    effets purement visuels restent aléatoires.
  - Une seule tentative officielle par jour et par joueur, mémorisée dans
    defi.<date>.<nom> ; les suivantes sont des entraînements.
  - Écran de fin « Défi du 22/11 : 47 points » avec bouton Copier le résultat.

CLASSEMENTS
  Bouton 🏆 sur l'écran de choix du mode. Un top 10 par mode, stocké dans
  classement.<mode> (JSON protégé, valeurs par défaut si corrompu).
  Tri : plus de points (Esquive, Défi), meilleure place puis meilleur temps
  (Course), plus grande distance (Chrono). Zen n'enregistre rien.
  Un même nom avec une casse différente compte comme un seul joueur.
  Chaque ligne affiche le rang, le nom, la date et la météo. « Effacer mes
  scores » demande confirmation dans la page (pas de fenêtre native).

TESTS
  1) node tests/verification.mjs   → 23 vérifications headless (DOM simulé) :
     parcours complet, records, difficulté, boucle unique, grille de course,
     60 s de rivaux sans accident, checkpoints Chrono, limites Zen, graine
     du jour et classements. Aucune installation nécessaire.
  2) npx playwright test           → 7 scénarios navigateur (Chromium) :
     - nom invalide refusé, nom valide mémorisé après rechargement ;
     - chaque mode se lance, se termine et se relance 5 fois (aucune erreur
       console, aucune accélération de la boucle) ;
     - changement de mode sans recharger la page ;
     - navigation au clavier seul, puis geste sur le Canvas ;
     - navigation privée simulée (localStorage qui lève une erreur) ;
     - portrait et paysage sans défilement horizontal ;
     - classement accessible et effacement avec confirmation.
     Installation : npm install --no-save @playwright/test@1.65.1
     (le serveur local et le navigateur sont lancés automatiquement).

FICHE ORAL
  Q1 — Pourquoi une machine à états ?
      Le jeu n'a plus une seule règle codée en dur. L'état courant décide des
      commandes actives et des écrans visibles : on ne peut pas conduire sur
      l'accueil, ni saisir son nom pendant la course. Les transitions sont
      explicites (accueil → choixMode → compte → jeu → fin) et un seul point
      de remise à zéro, reinitialiserPartie(), évite les bugs entre deux parties.

  Q2 — Comment la course reste-t-elle juste ?
      Les quatre voitures appellent les mêmes fonctions appliquerMoteur et
      appliquerDirection : même puissance, même traînée, même adhérence μ et
      même météo. L'IA n'a pas de vitesse magique : elle décide seulement d'une
      voie et du nitro. L'élastique est léger et coupé en Difficile.

  Q3 — Comment fonctionne la graine du défi du jour ?
      mulberry32(AAAAMMDD) produit une suite de nombres déterministe. On l'a
      branchée sur tout ce qui construit la route (vagues, voitures, météo,
      dangers) via aleatoire() ; les étincelles et les gouttes gardent
      Math.random car elles n'influencent pas le jeu. Même date = même route.

  Q4 — Pourquoi un pas de temps fixe ?
      boucle() accumule le temps réel et exécute mettreAJour(1/120 s) autant
      de fois que nécessaire. La physique est donc identique à 60, 120 ou
      144 Hz, et le chrono suit le temps de jeu (le ralenti le ralentit aussi).

  Q5 — Comment sont gérés les records et classements ?
      Chaque joueur a un record par mode (record.<mode>.<nom>), un meilleur
      temps pour la course, une distance pour le chrono, et un score daté pour
      le défi. Les classements sont des top 10 JSON triés selon la règle du
      mode ; les noms sont comparés en minuscules pour fusionner « Léa » et
      « léa ». Toutes les lectures localStorage sont protégées par try/catch.

PHYSIQUE UTILISÉE (échelle : 20 px = 1 m)
  - Moteur : m·a = F_moteur − F_traînée − F_roulement,
    F_moteur limitée par la puissance (P / v) et par l'adhérence (μ·m·g).
  - Trafic à 50 km/h dans le même sens : à l'écran les voitures descendent
    à la vitesse relative (v_joueur − v_trafic).
  - Changement de voie : ressort amorti avec accélération latérale limitée ;
    la voiture s'oriente selon la direction de sa vitesse (atan(vx / v)).
  - Choc : conservation de la quantité de mouvement avec coefficient de
    restitution, rotation si le choc est décentré, puis glissade freinée
    par le frottement (décélération μ·g).
  - Pas de temps fixe (1/120 s) : même comportement quelle que soit la
    fréquence de l'écran.
  - Son moteur : régime calculé avec une boîte 6 vitesses ; bruit du vent
    proportionnel à v².
  - Pneus : ils dérapent quand l'accélération latérale dépasse l'adhérence
    ou quand la force du moteur approche μ·m·g (patinage, nitro). Le
    crissement imite l'adhérence-glissement d'un vrai pneu (« stick-slip ») :
    une note de 700 à 1500 Hz avec ses harmoniques, qui tremble, plus le
    frottement de la gomme. La note baisse quand la glissade ralentit.
    Des traces de pneus restent sur la route.

FICHIERS
  index.html, style.css, script.js
  images/meteo/*.svg (icônes, panneau, flaque, plaque de verglas)
  images/propositions/*.svg (dessins pour les prochaines idées, voir les issues)
  images/route.jpg, voiture-rouge.png (joueur),
  voiture-verte.png, voiture-jaune.png, voiture-bleue.png (adversaires)
