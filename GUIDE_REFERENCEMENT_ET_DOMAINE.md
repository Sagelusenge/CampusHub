# Référencement et domaine de CampusHub

## Objectif

L’objectif est de rendre `campushub.cd`, ses pages publiques et les établissements vérifiés faciles à découvrir dans Google, Bing et les autres moteurs de recherche. Une première position ne peut jamais être garantie techniquement : elle dépend aussi de la qualité du contenu, de l’ancienneté du domaine, de la concurrence et des liens provenant de sites reconnus.

## Ce qui est déjà intégré

- titres et descriptions adaptés aux principales pages publiques ;
- métadonnées Open Graph et Twitter pour le partage social ;
- URL canonique configurable par domaine ;
- `robots.txt` protégeant les espaces privés ;
- `sitemap.xml` généré automatiquement depuis MySQL ;
- ajout automatique de chaque établissement vérifié au sitemap ;
- données structurées Schema.org de type `CollegeOrUniversity` ou `School` ;
- catalogue de formations associé à la fiche de l’établissement ;
- métadonnées mises à jour lors de la navigation React ;
- pages institutionnelles rendues avec leur SEO directement par Express.

## Activation de `campushub.cd`

1. Acheter le domaine `campushub.cd` auprès d’un bureau d’enregistrement autorisé.
2. Créer un enregistrement DNS `A` pour `campushub.cd` vers l’adresse IP publique fixe du VPS.
3. Créer un autre enregistrement `A` ou `CNAME` pour `www.campushub.cd`.
4. Remplacer `CAMPUSHUB_DOMAIN` dans `.env.runtime` par `campushub.cd`.
5. Redémarrer les conteneurs. Caddy demandera automatiquement le certificat HTTPS.
6. Vérifier `https://campushub.cd/sante`, `https://campushub.cd/robots.txt` et `https://campushub.cd/sitemap.xml`.

## Enregistrement auprès des moteurs

1. Ajouter le domaine dans Google Search Console avec la validation DNS.
2. Soumettre `https://campushub.cd/sitemap.xml`.
3. Demander l’indexation de l’accueil, de l’annuaire et de quelques fiches complètes.
4. Ajouter le domaine dans Bing Webmaster Tools et soumettre le même sitemap.
5. Surveiller les erreurs d’indexation, les performances mobiles et les requêtes utilisées par les visiteurs.

## Stratégie pour faire apparaître les établissements

- chaque établissement doit fournir une description originale et précise ;
- ses filières, frais, admissions, adresse, photos et partenaires doivent rester actualisés ;
- son site officiel doit contenir un lien vers sa fiche CampusHub ;
- le titre et la description ne doivent pas être copiés d’un autre établissement ;
- les publications importantes doivent renvoyer vers la fiche ou l’offre concernée ;
- les pages incomplètes, bloquées ou non vérifiées ne doivent pas être indexées ;
- CampusHub doit obtenir des liens depuis les universités, écoles, partenaires et médias éducatifs.

## Indicateurs à suivre

- nombre de pages indexées ;
- impressions et clics depuis les moteurs ;
- position moyenne sur les recherches ciblées ;
- nombre d’établissements trouvés par leur nom ;
- taux de clic vers les fiches institutionnelles ;
- vitesse, stabilité visuelle et compatibilité mobile ;
- nombre de domaines reconnus créant un lien vers CampusHub.

## Règle importante

Le référencement doit rester honnête. CampusHub ne doit pas créer de faux avis, répéter artificiellement des mots-clés, acheter des liens douteux ou publier des informations d’établissement non vérifiées. La meilleure stratégie durable reste une plateforme rapide, utile, structurée et régulièrement actualisée.
