# Parcours API CampusHub — scénario complet et ordonné

Ce document présente les requêtes dans leur ordre réel d’exécution. Il faut copier les codes et les jetons retournés par une étape pour les utiliser dans les étapes suivantes.

## URL de base

```text
http://127.0.0.1:4000/api/v1
```

Toutes les URL ci-dessous sont ajoutées à cette URL de base. Par exemple, `/sante` correspond à `http://127.0.0.1:4000/api/v1/sante`.

Pour toute route protégée, ajouter l’en-tête suivant :

```http
Authorization: Bearer <jetonAcces>
Content-Type: application/json
```

## Avant de commencer

- La base MySQL doit être créée avec les scripts du dossier `database`.
- Le serveur Express doit être démarré sur le port `4000`.
- Un compte `ADMINISTRATEUR` actif doit déjà exister dans la base. L’API publique ne permet volontairement pas de créer un administrateur.
- Un compte inscrit par l’API commence avec le statut `EN_ATTENTE`. Un administrateur doit l’activer avant sa première connexion.
- Les valeurs entre chevrons, comme `<codeUniversite>`, doivent être remplacées par les valeurs réellement reçues.

## Ordre général

```text
Administrateur connecté
  → compte institutionnel inscrit et activé
    → université créée et vérifiée
      → campus et faculté créés
        → filière créée et associée au campus
      → services, infrastructures et admission
  → compte étudiant inscrit et activé
    → profil étudiant créé
      → publication, média, commentaire et interactions
        → signalement et modération
```

## 1. Vérifier que l’API fonctionne

**Méthode et URL**

```http
GET /sante
```

**Body :** aucun.

**Réponse attendue :**

```json
{
  "succes": true,
  "message": "API CampusHub opérationnelle"
}
```

## 2. Connecter l’administrateur existant

Cette connexion fournit le jeton nécessaire pour activer les futurs comptes.

**Méthode et URL**

```http
POST /auth/connexion
```

**Body :**

```json
{
  "email": "admin@campushub.cd",
  "motDePasse": "<mot_de_passe_admin>"
}
```

**Réponse utile :**

```json
{
  "succes": true,
  "donnees": {
    "utilisateur": {
      "code_utilisateur": "ADM00012026",
      "role": "ADMINISTRATEUR"
    },
    "jetonAcces": "<jeton_admin>",
    "jetonActualisation": "<jeton_actualisation_admin>"
  }
}
```

Conserver `jetonAcces` sous le nom `<jeton_admin>`.

## 3. Inscrire le compte de l’université

**Méthode et URL**

```http
POST /auth/inscription
```

**Body :**

```json
{
  "email": "contact@uchg.cd",
  "motDePasse": "MotDePasse123!",
  "role": "UNIVERSITE",
  "nomAffichage": "Université CampusHub de Goma",
  "ville": "Goma",
  "province": "Nord-Kivu"
}
```

**Réponse utile :**

```json
{
  "succes": true,
  "message": "Inscription effectuée avec succès.",
  "donnees": {
    "code_utilisateur": "UNI00012026",
    "role": "UNIVERSITE",
    "statut_compte": "EN_ATTENTE"
  }
}
```

Conserver le code retourné sous le nom `<codeUtilisateurUniversite>`.

## 4. Activer et vérifier le compte de l’université

**Accès :** administrateur.

**Méthode et URL**

```http
PATCH /utilisateurs/<codeUtilisateurUniversite>/statut
Authorization: Bearer <jeton_admin>
```

**Body :**

```json
{
  "statutCompte": "ACTIF",
  "statutVerification": "VERIFIE"
}
```

**Réponse attendue :**

```json
{
  "succes": true,
  "message": "Statut de l’utilisateur modifié.",
  "donnees": {
    "code_utilisateur": "UNI00012026",
    "statut_compte": "ACTIF",
    "statut_verification": "VERIFIE"
  }
}
```

## 5. Connecter le compte de l’université

**Méthode et URL**

```http
POST /auth/connexion
```

**Body :**

```json
{
  "email": "contact@uchg.cd",
  "motDePasse": "MotDePasse123!"
}
```

Dans la réponse, conserver `donnees.jetonAcces` sous le nom `<jeton_universite>`.

## 6. Créer la fiche de l’université

Cette étape doit précéder la création des campus, facultés, services et infrastructures.

**Méthode et URL**

```http
POST /universites
Authorization: Bearer <jeton_universite>
```

**Body :**

```json
{
  "nom": "Université CampusHub de Goma",
  "sigle": "UCHG",
  "slug": "universite-campushub-goma",
  "type": "PRIVEE",
  "description": "Université de démonstration CampusHub.",
  "ville": "Goma",
  "province": "Nord-Kivu",
  "email": "contact@uchg.cd",
  "telephone": "+243990000000"
}
```

**Réponse utile :**

```json
{
  "succes": true,
  "message": "Université créée avec succès.",
  "donnees": {
    "code_universite": "UCHG00012026",
    "nom": "Université CampusHub de Goma",
    "statut_verification": "EN_ATTENTE"
  }
}
```

Conserver `code_universite` sous le nom `<codeUniversite>`.

## 7. Vérifier la fiche de l’université

**Accès :** administrateur.

**Méthode et URL**

```http
PATCH /administration/universites/<codeUniversite>/verification
Authorization: Bearer <jeton_admin>
```

**Body :**

```json
{
  "statut": "VERIFIEE"
}
```

**Réponse attendue :**

```json
{
  "succes": true,
  "message": "Statut de vérification de l’université modifié."
}
```

## 8. Compléter la fiche de l’université

**Méthode et URL**

```http
PATCH /universites/<codeUniversite>
Authorization: Bearer <jeton_universite>
```

**Body :**

```json
{
  "siteWeb": "https://universite.example.com",
  "adresse": "Avenue de l’Université, Goma",
  "anneeFondation": 2020,
  "inscriptionsOuvertes": true,
  "dateDebutInscription": "2026-07-01",
  "dateFinInscription": "2026-09-30"
}
```

**Réponse :** la fiche universitaire mise à jour.

## 9. Créer le campus principal

**Méthode et URL**

```http
POST /catalogue/universites/<codeUniversite>/campus
Authorization: Bearer <jeton_universite>
```

**Body :**

```json
{
  "nom": "Campus central",
  "adresse": "Avenue du Campus, Goma",
  "ville": "Goma",
  "province": "Nord-Kivu",
  "latitude": -1.6792,
  "longitude": 29.2228,
  "estPrincipal": true
}
```

**Réponse utile :**

```json
{
  "succes": true,
  "donnees": {
    "code_campus": "CAM00012026",
    "nom": "Campus central"
  }
}
```

Conserver `code_campus` sous le nom `<codeCampus>`.

## 10. Créer une faculté

**Méthode et URL**

```http
POST /catalogue/universites/<codeUniversite>/facultes
Authorization: Bearer <jeton_universite>
```

**Body :**

```json
{
  "nom": "Faculté des Sciences et Technologies",
  "slug": "sciences-et-technologies",
  "description": "Formations scientifiques et technologiques."
}
```

**Réponse utile :**

```json
{
  "succes": true,
  "donnees": {
    "code_faculte": "FST00012026",
    "nom": "Faculté des Sciences et Technologies"
  }
}
```

Conserver `code_faculte` sous le nom `<codeFaculte>`.

## 11. Créer une filière dans la faculté

Une filière dépend d’une faculté existante.

**Méthode et URL**

```http
POST /catalogue/facultes/<codeFaculte>/filieres
Authorization: Bearer <jeton_universite>
```

**Body :**

```json
{
  "nom": "Génie Logiciel",
  "slug": "genie-logiciel",
  "domaine": "Informatique",
  "niveauDiplome": "LICENCE",
  "dureeAnnees": 3,
  "description": "Formation en conception de logiciels.",
  "fraisMinimum": 450,
  "fraisMaximum": 650,
  "devise": "USD",
  "estActive": true
}
```

**Réponse utile :**

```json
{
  "succes": true,
  "donnees": {
    "code_filiere": "GL00012026",
    "nom": "Génie Logiciel"
  }
}
```

Conserver `code_filiere` sous le nom `<codeFiliere>`.

## 12. Associer la filière au campus

**Méthode et URL**

```http
POST /catalogue/campus/<codeCampus>/filieres/<codeFiliere>
Authorization: Bearer <jeton_universite>
```

**Body :** aucun.

**Réponse attendue :**

```json
{
  "succes": true,
  "message": "Filière associée au campus."
}
```

## 13. Ajouter un service

**Méthode et URL**

```http
POST /catalogue/universites/<codeUniversite>/services
Authorization: Bearer <jeton_universite>
```

**Body :**

```json
{
  "nom": "Bibliothèque numérique",
  "description": "Accès aux livres et revues numériques.",
  "estDisponible": true
}
```

**Réponse utile :** la ressource créée avec son `code_service`.

## 14. Ajouter une infrastructure

**Méthode et URL**

```http
POST /catalogue/universites/<codeUniversite>/infrastructures
Authorization: Bearer <jeton_universite>
```

**Body :**

```json
{
  "nom": "Laboratoire informatique",
  "categorie": "LABORATOIRE",
  "description": "Laboratoire équipé de 30 ordinateurs.",
  "quantite": 2
}
```

**Réponse utile :** la ressource créée avec son `code_infrastructure`.

## 15. Ajouter une condition d’admission

**Méthode et URL**

```http
POST /catalogue/universites/<codeUniversite>/conditions-admission
Authorization: Bearer <jeton_universite>
```

**Body :**

```json
{
  "titre": "Admission en première année",
  "description": "Présenter le diplôme d’État, les bulletins et une pièce d’identité.",
  "niveauDiplome": "LICENCE"
}
```

**Réponse utile :** la ressource créée avec son `code_condition`.

## 16. Vérifier la fiche publique complète

Cette lecture confirme que le campus, les facultés, les filières, les services, les infrastructures et les conditions sont correctement rattachés.

**Méthode et URL**

```http
GET /universites/<codeUniversite>
```

**Body :** aucun.

**Réponse :** la fiche complète de l’université et ses dépendances.

## 17. Inscrire un étudiant

**Méthode et URL**

```http
POST /auth/inscription
```

**Body :**

```json
{
  "email": "etudiant@campushub.cd",
  "motDePasse": "MotDePasse123!",
  "role": "ETUDIANT",
  "nomAffichage": "Étudiant CampusHub",
  "ville": "Goma",
  "province": "Nord-Kivu"
}
```

Conserver le `code_utilisateur` reçu sous le nom `<codeEtudiant>`. Le compte est encore `EN_ATTENTE`.

## 18. Activer l’étudiant

**Accès :** administrateur.

**Méthode et URL**

```http
PATCH /utilisateurs/<codeEtudiant>/statut
Authorization: Bearer <jeton_admin>
```

**Body :**

```json
{
  "statutCompte": "ACTIF",
  "statutVerification": "VERIFIE"
}
```

**Réponse :** le compte étudiant actif et vérifié.

## 19. Connecter l’étudiant

**Méthode et URL**

```http
POST /auth/connexion
```

**Body :**

```json
{
  "email": "etudiant@campushub.cd",
  "motDePasse": "MotDePasse123!"
}
```

Conserver `donnees.jetonAcces` sous le nom `<jeton_etudiant>` et `donnees.jetonActualisation` sous le nom `<jeton_actualisation_etudiant>`.

## 20. Créer le profil de l’étudiant

Cette étape réutilise obligatoirement l’université et la filière créées plus haut.

**Méthode et URL**

```http
POST /profils
Authorization: Bearer <jeton_etudiant>
```

**Body :**

```json
{
  "codeUniversite": "<codeUniversite>",
  "codeFiliere": "<codeFiliere>",
  "matriculeEtudiant": "ETU-2026-001",
  "titreProfil": "Développeur web étudiant",
  "competences": ["JavaScript", "Node.js", "MySQL"],
  "anneeDiplomation": 2027
}
```

**Réponse utile :**

```json
{
  "succes": true,
  "donnees": {
    "code_profil": "PET00012026",
    "code_universite": "UCHG00012026",
    "code_filiere": "GL00012026"
  }
}
```

Conserver `code_profil` sous le nom `<codeProfil>`.

## 21. Créer une publication étudiante

**Méthode et URL**

```http
POST /publications
Authorization: Bearer <jeton_etudiant>
```

**Body :**

```json
{
  "codeUniversite": "<codeUniversite>",
  "titre": "Application mobile de gestion académique",
  "contenu": "Présentation détaillée du projet étudiant.",
  "type": "PROJET",
  "etiquettes": ["mobile", "Node.js", "MySQL"],
  "publier": true
}
```

**Réponse utile :**

```json
{
  "succes": true,
  "donnees": {
    "code_publication": "PUB00012026",
    "statut": "PUBLIEE"
  }
}
```

Conserver `code_publication` sous le nom `<codePublication>`.

## 22. Ajouter un média à la publication

L’API enregistre ici les métadonnées et l’URL d’un fichier déjà stocké.

**Méthode et URL**

```http
POST /publications/<codePublication>/medias
Authorization: Bearer <jeton_etudiant>
```

**Body :**

```json
{
  "type": "IMAGE",
  "url": "https://example.com/projet.jpg",
  "urlMiniature": "https://example.com/projet-miniature.jpg",
  "identifiantStockage": "campushub/projet-001",
  "typeMime": "image/jpeg",
  "tailleOctets": 250000,
  "largeurPixels": 1200,
  "hauteurPixels": 800,
  "ordre": 0
}
```

**Réponse utile :** le média créé avec son `code_media`.

## 23. Commenter la publication

**Méthode et URL**

```http
POST /publications/<codePublication>/commentaires
Authorization: Bearer <jeton_etudiant>
```

**Body :**

```json
{
  "contenu": "Excellent projet, félicitations !",
  "codeCommentaireParent": null
}
```

**Réponse utile :** le commentaire créé avec son `code_commentaire`.

Pour répondre à un commentaire, remplacer `null` par le code du commentaire parent.

## 24. Aimer, enregistrer et suivre

Ces trois actions utilisent le jeton de l’étudiant.

### Aimer la publication

```http
POST /interactions/publications/<codePublication>/jaime
Authorization: Bearer <jeton_etudiant>
```

**Body :** aucun. Un second appel retire le « J’aime ».

### Ajouter la publication aux favoris

```http
POST /interactions/publications/<codePublication>/favori
Authorization: Bearer <jeton_etudiant>
```

**Body :** aucun.

### Suivre l’université

```http
POST /interactions/universites/<codeUniversite>/suivre
Authorization: Bearer <jeton_etudiant>
```

**Body :** aucun.

## 25. Lire et traiter les notifications

### Lire les notifications non lues

```http
GET /notifications?nonLues=true&page=1&limite=20
Authorization: Bearer <jeton_etudiant>
```

**Body :** aucun.

### Tout marquer comme lu

```http
PATCH /notifications/tout-lire
Authorization: Bearer <jeton_etudiant>
```

**Body :** aucun.

## 26. Signaler une publication

**Méthode et URL**

```http
POST /moderation/signalements
Authorization: Bearer <jeton_etudiant>
```

**Body :**

```json
{
  "codePublication": "<codePublication>",
  "motif": "Contenu inapproprié",
  "details": "Description détaillée du problème rencontré."
}
```

Conserver le `code_signalement` retourné sous le nom `<codeSignalement>`.

## 27. Traiter le signalement

**Accès :** administrateur.

### Consulter les signalements ouverts

```http
GET /moderation/signalements?statut=OUVERT&page=1&limite=20
Authorization: Bearer <jeton_admin>
```

**Body :** aucun.

### Résoudre le signalement

```http
PATCH /moderation/signalements/<codeSignalement>
Authorization: Bearer <jeton_admin>
```

**Body :**

```json
{
  "statut": "RESOLU",
  "resolution": "Le contenu a été examiné et la décision a été enregistrée."
}
```

## 28. Consulter les statistiques et comparer

### Statistiques de l’université

```http
GET /universites/<codeUniversite>/statistiques
```

**Body :** aucun.

### Comparer des universités

Il faut avoir au moins deux codes d’université existants.

```http
GET /universites/comparer?codes=<codeUniversite>,<codeAutreUniversite>
```

**Body :** aucun.

### Tableau de bord administratif

```http
GET /administration/tableau-de-bord
Authorization: Bearer <jeton_admin>
```

**Body :** aucun.

## 29. Actualiser le jeton de l’étudiant

**Méthode et URL**

```http
POST /auth/actualiser
```

**Body :**

```json
{
  "jetonActualisation": "<jeton_actualisation_etudiant>"
}
```

La réponse contient un nouveau `jetonAcces` et un nouveau `jetonActualisation`. L’ancien jeton d’actualisation ne doit plus être réutilisé.

## 30. Déconnecter l’étudiant

**Méthode et URL**

```http
POST /auth/deconnexion
```

**Body :**

```json
{
  "jetonActualisation": "<nouveau_jeton_actualisation_etudiant>"
}
```

**Réponse attendue :**

```json
{
  "succes": true,
  "message": "Déconnexion effectuée."
}
```

## Format général des erreurs

Une requête invalide retourne une réponse de cette forme :

```json
{
  "succes": false,
  "erreur": {
    "message": "Description lisible de l’erreur"
  }
}
```

Codes HTTP les plus fréquents :

- `200` : lecture ou modification réussie ;
- `201` : création réussie ;
- `400` : body ou paramètres invalides ;
- `401` : jeton absent, expiré ou incorrect ;
- `403` : rôle insuffisant ou ressource non autorisée ;
- `404` : code inexistant ;
- `409` : email, slug ou association déjà utilisé.

## Pour exécuter toutes les routes

Ce parcours explique l’ordre métier principal. Le fichier [API.http](API.http) contient aussi les opérations de modification et de suppression pour chaque ressource, directement exécutables avec l’extension REST Client de VS Code.
