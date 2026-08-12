"""
Ce fichier contient la configuration du modèle Mini-GPT.
Il définit les hyperparamètres, les chemins d'accès et les paramètres d'entraînement.
"""

from dataclasses import dataclass
import torch
import os

@dataclass
class GPTConfig:
    # Paramètres du modèle
    vocab_size: int = 2000       # Taille du vocabulaire BPE (sera définie dynamiquement)
    n_layers: int = 8            # Nombre de blocs Transformer
    n_heads: int = 8             # Nombre de têtes d'attention (doit diviser embed_dim)
    embed_dim: int = 256         # Dimension des embeddings (256 / 8 = 32 par tête)
    block_size: int = 512        # Longueur du contexte (nombre maximal de tokens vus à la fois)
    dropout: float = 0.15        # Taux de dropout pour la régularisation

    # Paramètres d'entraînement
    learning_rate: float = 3e-4  # Taux d'apprentissage max
    batch_size: int = 32         # Taille du lot (réduite car séquences plus longues)
    max_epochs: int = 50         # Nombre maximal d'époques d'entraînement
    eval_interval: int = 200     # Nombre d'itérations entre chaque évaluation
    eval_iters: int = 30         # Nombre d'itérations pour estimer la perte lors de l'évaluation
    max_iters: int = 10000       # Nombre total d'itérations d'entraînement
    warmup_iters: int = 500      # Itérations de warmup pour le learning rate
    min_lr: float = 3e-5         # Learning rate minimum (pour le cosine scheduler)
    grad_clip: float = 1.0       # Gradient clipping max norm

    # Appareil d'exécution
    # Utilise automatiquement CUDA si disponible, sinon le CPU
    device: str = 'cuda' if torch.cuda.is_available() else 'cpu'

    # Chemins d'accès
    data_path: str = './data'    # Dossier contenant les fichiers texte pour l'entraînement
    model_dir: str = './models'  # Dossier où sauvegarder les modèles entraînés
    model_name: str = 'mini_gpt.pt' # Nom du fichier du modèle
