# Parcours abonnement, affiliation et localisation

Toutes les URL commencent par `http://127.0.0.1:4000/api/v1`.

## 1. Inscrire une université

`POST /auth/inscription`

```json
{
  "email": "contact@universite.cd",
  "motDePasse": "MotDePasse123!",
  "role": "UNIVERSITE",
  "nomAffichage": "Université Exemple",
  "pays": "Democratic Republic of the Congo",
  "province": "Nord-Kivu",
  "ville": "Goma"
}
```

Le compte reste en attente. Conserver son `code_utilisateur`.

## 2. Charger puis envoyer la preuve de paiement

`POST /televersements/preuves` avec un body `multipart/form-data` contenant le champ fichier `fichier`.

Puis `POST /abonnements/paiements` :

```json
{
  "codeUtilisateur": "UNI00012026",
  "codePlan": "PLN00012026",
  "typePaiement": "ABONNEMENT",
  "moyenPaiement": "MOBILE_MONEY",
  "referencePaiement": "MP-2026-001",
  "urlPreuve": "http://127.0.0.1:4000/uploads/preuves/fichier.png"
}
```

Les plans disponibles se récupèrent avec `GET /abonnements/plans` : Essentiel 20 USD, Professionnel 35 USD et Excellence 50 USD. Une fois la fiche et un pack actifs, le badge se commande avec le même endpoint en envoyant `"typePaiement": "CERTIFICATION"`. Son prix est fixé à 7 USD pour 30 jours.

## 3. Valider le paiement comme administrateur

`PATCH /abonnements/paiements/PAY00012026`

```json
{
  "statut": "VALIDE",
  "commentaire": "Paiement confirmé."
}
```

Cette action active le compte, crée 30 jours d’abonnement et envoie une notification.

## 4. Créer la fiche universitaire

Après connexion, envoyer le jeton `Bearer` puis appeler `POST /universites` :

```json
{
  "nom": "Université Exemple",
  "sigle": "UEX",
  "type": "PRIVEE",
  "pays": "Democratic Republic of the Congo",
  "province": "Nord-Kivu",
  "ville": "Goma",
  "email": "contact@universite.cd"
}
```

Il ne faut pas saisir de slug : l’identifiant URL est produit automatiquement et rendu unique.

## 5. Inscrire l’étudiant

`POST /auth/inscription`

```json
{
  "email": "etudiant@exemple.cd",
  "motDePasse": "MotDePasse123!",
  "role": "ETUDIANT",
  "nomAffichage": "Nom de l’étudiant",
  "pays": "Democratic Republic of the Congo",
  "province": "Nord-Kivu",
  "ville": "Goma"
}
```

Le compte étudiant est actif immédiatement.

## 6. Envoyer la demande d’affiliation

Avec le jeton étudiant : `POST /affiliations`

```json
{
  "codeUniversite": "ISIG00012026",
  "codeFiliere": "FIL00012026",
  "matriculeEtudiant": "2026-INFO-001",
  "message": "Merci de confirmer mon inscription."
}
```

## 7. Confirmer côté université

Avec le jeton du gestionnaire : `GET /affiliations/universite`, puis :

`PATCH /affiliations/AFF00012026`

```json
{
  "statut": "ACCEPTEE",
  "reponse": "Inscription confirmée."
}
```

Le profil étudiant est créé automatiquement et l’étudiant reçoit une notification.

## 8. Signaler une ville absente

`POST /localisations/suggestions`

```json
{
  "pays": "République démocratique du Congo",
  "province": "Nord-Kivu",
  "villeProposee": "Nom de la ville",
  "emailContact": "contact@universite.cd"
}
```

Le manager la retrouve dans `GET /localisations/suggestions` et la traite avec `PATCH /localisations/suggestions/LOC00012026`.
