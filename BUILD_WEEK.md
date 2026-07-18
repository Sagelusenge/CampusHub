# CampusHub — dossier OpenAI Build Week

## Catégorie et problème

**Catégorie : Éducation.** En RDC, les informations sur les formations, les frais, les campus et les admissions sont souvent dispersées. Un étudiant peut recevoir une réponse séduisante mais invérifiable. CampusHub AI combine la capacité de raisonnement de GPT‑5.6 avec un catalogue institutionnel contrôlé afin de produire une orientation utile, expliquée et traçable.

## Ce qui a été construit pendant la Build Week

- conseiller d’orientation GPT‑5.6 avec la Responses API ;
- appels d’outils vers le catalogue MySQL vérifié ;
- lecture facultative de bulletin par vision ;
- dossiers d’orientation persistants avec codes automatiques `ORI…` ;
- mode de démonstration explicite lorsque la clé OpenAI est absente ;
- interface responsive disponible pour les quatre rôles ;
- données fictives reproductibles et cinq scénarios d’évaluation automatisés.

Le dépôt contient aussi un socle CampusHub antérieur — catalogue, comptes, réseau social et administration. L’historique Git permet aux juges de distinguer ce socle de la fonctionnalité CampusHub AI ajoutée pendant l’événement.

## Utilisation de GPT‑5.6

Le modèle ne reçoit pas un catalogue copié dans le prompt. Il appelle des outils stricts :

1. `rechercher_formations` applique les contraintes de domaine, budget, niveau et localisation ;
2. `obtenir_conditions_admission` récupère les conditions officielles enregistrées ;
3. GPT‑5.6 compare les compromis et produit un plan d’action en français ;
4. la réponse, le mode d’exécution et les recommandations sont enregistrés.

Le prompt système interdit de citer une formation, un prix ou une condition absente des résultats. Les requêtes SQL limitent les résultats aux établissements `VERIFIEE` et aux filières actives. Un identifiant de sécurité haché est transmis à l’API.

## Utilisation de Codex

Codex a servi de partenaire de réalisation pour :

- auditer l’architecture existante et préserver les changements déjà présents ;
- concevoir la migration, les routes, les schémas Zod, le service OpenAI et l’interface React ;
- créer les évaluations et corriger une installation de données qui avait échoué ;
- lancer le lint, le build, les tests et l’évaluation ;
- documenter les décisions et préparer le dépôt.

Avant la soumission, lancer `/feedback` dans la session Codex contenant la majorité de ce travail et reporter l’identifiant ici et dans Devpost :

```text
Identifiant de session Codex : À RENSEIGNER APRÈS /feedback
```

## Résultats reproductibles

Commande : `cd backend && npm run db:demo-ai && npm run eval:orientation`

| Scénario | Attendu |
|---|---|
| Informatique à Goma, budget 500 USD | Au moins une licence compatible |
| Santé en Sud-Kivu, budget 450 USD | Au moins une formation Santé |
| Gestion, budget 350 USD | Au moins une formation Gestion |
| Mobilité limitée à Bukavu | Uniquement les options de Bukavu |
| Domaine absent et doctorat | Zéro résultat, aucune invention |

Résultat local validé le 18 juillet 2026 : **5/5 scénarios réussis**. Le lint frontend, le build de production, la vérification syntaxique backend et les tests HTTP passent également.

## Démonstration vidéo — moins de 3 minutes

1. **0:00–0:20 — Problème.** Montrer l’accueil et expliquer le manque d’informations fiables.
2. **0:20–0:40 — Preuve OpenAI.** Montrer « GPT‑5.6 connecté » et résumer l’architecture outils + MySQL.
3. **0:40–1:25 — Parcours principal.** Saisir un objectif, un budget et une ville, puis générer trois recommandations expliquées.
4. **1:25–1:50 — Vision.** Charger un bulletin non sensible de démonstration et confirmer l’extraction.
5. **1:50–2:15 — Confiance.** Ouvrir une fiche vérifiée et montrer l’historique du dossier.
6. **2:15–2:40 — Qualité.** Montrer brièvement `npm run eval:orientation` avec 5/5.
7. **2:40–2:55 — Impact.** Expliquer comment les établissements enrichissent le catalogue et comment les étudiants prennent une décision mieux informée.

Utiliser un commentaire audio et afficher le produit en action ; ne pas consacrer la vidéo à des diapositives.

## Liste de contrôle Devpost

- [ ] Clé OpenAI configurée et bandeau « GPT‑5.6 connecté » visible.
- [ ] Dépôt public avec licence MIT, ou accès accordé aux deux adresses du règlement.
- [ ] Déploiement de démonstration stable et compte de test préparé.
- [ ] Vidéo YouTube publique de moins de trois minutes avec commentaire audio.
- [ ] URL du dépôt et instructions testées sur une machine propre.
- [ ] Identifiant `/feedback` ajouté au formulaire.
- [ ] Description précise du rôle de GPT‑5.6 et de Codex.
- [ ] Aucun mot de passe, bulletin réel ou clé API dans le dépôt ou la vidéo.
- [ ] Soumission terminée avant le 22 juillet 2026 à 02:00 (GMT+2).
