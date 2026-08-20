# CampusHubIA

CampusHubIA est l’agent propre à CampusHub. Son moteur de réponse s’exécute sur notre serveur et ne contacte aucune API de modèle d’IA externe. Pour le bot public uniquement, le backend peut compléter une question générale avec des extraits publics de Wikipédia ; les sources sont alors affichées dans le chat et aucun dossier privé n’est envoyé.

## Fonctionnement

Le moteur combine trois mécanismes :

1. un corpus local construit à partir des établissements vérifiés et de la documentation CampusHub ;
2. un contexte structuré envoyé en direct par le backend Express depuis MySQL.
3. une couche conversationnelle et de correction approchée pour comprendre les salutations, les réponses courtes et les fautes courantes.

Les données changeantes — formations, frais, campus, conditions d’admission — restent dans MySQL. CampusHubIA les reçoit uniquement pour produire la réponse demandée. Si le service Python est indisponible, Express utilise automatiquement son moteur de règles MySQL.

Le moteur en production est déterministe et traçable : il indexe le corpus au démarrage, calcule la pertinence des documents et cite les codes CampusHub utilisés. Le Mini-GPT présent dans ce dossier est un laboratoire d’entraînement local ; ses poids ne sont pas utilisés en production tant que leur qualité n’a pas été validée.

## Synchroniser les données CampusHub

Avec l’API CampusHub démarrée :

```powershell
cd "My Agent"
.\venv\Scripts\python.exe sync_campushub_data.py --api-url http://127.0.0.1:4000/api/v1
```

La commande recrée :

- `data/campushub_knowledge.txt`, corpus public utilisé par l’agent ;
- `data/campushub_catalogue.json`, export de contrôle ignoré par Git.

Le fichier `data/campushub_qa_8000.txt` contient exactement 8 000 paires
questions-réponses validées sur le fonctionnement de CampusHub. Pour le
régénérer après une modification des intentions métier :

```powershell
.\venv\Scripts\python.exe generate_qa_corpus.py
```

La synchronisation ajoute automatiquement ces 8 000 exemples au corpus, puis
complète celui-ci avec les établissements et formations vérifiés de MySQL.

Aucune donnée privée d’étudiant, aucun mot de passe et aucun message privé ne sont exportés.

## Lancer et tester localement

```powershell
cd "My Agent"
.\venv\Scripts\python.exe server.py
```

Le service écoute sur `http://127.0.0.1:5000`. Dans un autre terminal :

```powershell
Invoke-RestMethod http://127.0.0.1:5000/health
.\venv\Scripts\python.exe -m unittest discover -s tests -v
```

Le backend Express utilise les variables suivantes :

```dotenv
CAMPUSHUB_IA_URL=http://127.0.0.1:5000
CAMPUSHUB_IA_TOKEN=
CAMPUSHUB_IA_MODEL=campushubai
CAMPUSHUB_IA_TIMEOUT_MS=8000
```

En production, `CAMPUSHUB_IA_TOKEN` doit contenir un secret aléatoire identique dans les deux services.

## Entraîner le Mini-GPT expérimental

L’entraînement neuronal est facultatif et demande davantage de données et de calcul. Il se lance sur le corpus CampusHub synchronisé :

```powershell
.\venv\Scripts\python.exe train.py --data data/campushub_knowledge.txt --max-iters 2000
```

Après l’entraînement, il faut mesurer les réponses sur un jeu de questions séparé. Un checkpoint ne doit être activé en production que s’il répond mieux que le moteur actuel, n’invente pas d’établissements et respecte les droits d’accès.

## API interne

- `GET /health` : état du service et du corpus ;
- `GET /api/info` : informations sur le modèle local ;
- `POST /api/v1/respond` : réponse interne protégée par `X-CampusHub-IA-Token`.

Exemple de corps JSON :

```json
{
  "task": "ORIENTATION",
  "message": "Je cherche une licence en informatique à Goma",
  "audience": "ETUDIANT",
  "context": {
    "objectif": "Devenir développeur",
    "recommandations": []
  }
}
```
