# Politique de sécurité

## Versions concernées

Seule la dernière version de la branche `main` reçoit des corrections.

## Ce qu'est ce projet

Jeu s'exécutant **entièrement dans le navigateur** : pas de serveur, pas de compte, pas de données
envoyées sur le réseau. Les seules données stockées sont locales à l'appareil (`localStorage`) : nom
du joueur, difficulté, dernier mode et records.

Points d'attention déjà traités :

- le nom saisi est validé (2 à 12 caractères : lettres, chiffres, espace, tiret) et toujours inséré
  dans la page avec `textContent`, jamais `innerHTML` ;
- les valeurs lues dans `localStorage` sont revalidées (un stockage modifié ou corrompu ne fait pas
  planter le jeu et ses noms invalides sont ignorés) ;
- le jeu ne charge aucune ressource externe.

## Signaler une vulnérabilité

Ne publiez **pas** la faille dans une issue publique. Utilisez le signalement privé de GitHub :
onglet **Security → Report a vulnerability** du dépôt (les mainteneurs doivent activer cette option
dans _Settings → Code security_). À défaut, contactez les mainteneurs par message privé GitHub.

Indiquez : ce que vous avez trouvé, comment le reproduire, et l'effet possible. Nous répondrons dès
que possible et vous tiendrons informé de la correction.
