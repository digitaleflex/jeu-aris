JEU DE VOITURE — Course sur 3 voies
===================================

LANCER LE JEU
  Ouvrir index.html dans un navigateur récent (Chrome, Firefox, Edge, Safari).
  Aucune installation ni connexion internet nécessaire.
  Les sons sont générés par le navigateur (Web Audio API) : aucun fichier audio.

COMMANDES
  Ordinateur :  Flèche gauche / Q / A  -> voie de gauche
                Flèche droite / D       -> voie de droite
                Espace ou Entrée        -> démarrer / recommencer
                M                       -> couper / remettre le son
  Téléphone  :  Glisser le doigt vers la gauche / la droite (n'importe où
                sur l'écran ; un long swipe peut changer de 2 voies),
                toucher la moitié gauche / droite de la route,
                ou les boutons « Gauche » et « Droite ».
                Le jeu s'adapte à la taille de l'écran (portrait et paysage)
                et reste net sur les écrans haute densité.
  Bouton 🔊     -> son activé / coupé (mémorisé)

RÈGLES
  - Évitez les voitures qui arrivent : +1 point par voiture dépassée.
  - La vitesse augmente avec le score (90 km/h au départ, 180 km/h max).
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
  - Son moteur : régime calculé avec une boîte 6 vitesses ; crissement des
    pneus selon l'accélération latérale ; bruit du vent proportionnel à v².

FICHIERS
  index.html, style.css, script.js
  images/route.jpg, voiture-rouge.png (joueur),
  voiture-verte.png, voiture-jaune.png, voiture-bleue.png (adversaires)
