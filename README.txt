JEU DE VOITURE — Course sur 3 voies
===================================

LANCER LE JEU
  Ouvrir index.html dans un navigateur récent (Chrome, Firefox, Edge, Safari).
  Aucune installation ni connexion internet nécessaire.
  Les sons sont générés par le navigateur (Web Audio API) : aucun fichier audio.

COMMANDES
  Ordinateur :  Flèche gauche / Q / A  -> voie de gauche
                Flèche droite / D       -> voie de droite
                Flèche haut / Z / W     -> NITRO
                Espace ou Entrée        -> démarrer / recommencer
                M                       -> couper / remettre le son
  Téléphone  :  Glisser le doigt vers la gauche / la droite (n'importe où
                sur l'écran ; un long swipe peut changer de 2 voies),
                toucher la moitié gauche / droite de la route,
                ou les boutons « Gauche » et « Droite ».
                Glisser vers le HAUT (ou bouton 🔥) -> NITRO
                Le jeu s'adapte à la taille de l'écran (portrait et paysage)
                et reste net sur les écrans haute densité.
  Bouton 🔊     -> son activé / coupé (mémorisé)

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
  - La vitesse augmente avec le nombre de voitures dépassées
    (90 km/h au départ, 180 km/h max, +70 km/h avec le nitro).
  - Une collision termine la partie. Le meilleur score est conservé.

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
