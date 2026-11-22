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
  - Choix du mode : cartes générées depuis MODES (Esquive et Course
    disponibles, Chrono / Zen / Défi marqués « Bientôt »), record affiché
    pour chaque mode et le joueur courant, dernier mode joué mis en avant.
  - Règles : 3 lignes de règles avant de lancer le mode.
  - Fin de partie : score, combo max, frôlements, distance parcourue,
    message de record, puis Rejouer / Changer de mode / Changer de joueur.
  Le compte à rebours reste dessiné sur le Canvas et les messages
  (départ, météo, accident) restent dans la barre #message ; l'ancien écran
  « Prêt ? » est remplacé par l'accueil HTML.

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
  - Une collision termine la partie. Le meilleur score du joueur pour ce
    mode est conservé (record par joueur et par mode).

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

TESTS
  node tests/verification.mjs  → 17 vérifications headless (parcours complet,
  records, difficulté, boucle unique, grille de course et 60 s de rivaux
  sans accident).

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
