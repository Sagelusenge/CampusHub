"""
Ce fichier contient la logique pour gérer les données d'entraînement.
Il définit la classe Dataset de PyTorch et la fonction de chargement des fichiers.
"""

import os
import torch
from torch.utils.data import Dataset

class TextDataset(Dataset):
    """
    Dataset PyTorch pour l'entraînement du modèle linguistique.
    Extrait des sous-séquences de longueur 'block_size' du texte complet.
    """
    def __init__(self, tokens: list[int], block_size: int):
        """
        Args:
            tokens (list[int]): La séquence complète des identifiants de tokens.
            block_size (int): La longueur du contexte d'entrée pour le modèle.
        """
        self.tokens = tokens
        self.block_size = block_size
        # On retire block_size de la longueur totale car on a besoin de block_size + 1
        # tokens pour créer une paire (x, y) valide.
        self.length = max(0, len(tokens) - block_size)

    def __len__(self):
        """Retourne le nombre de séquences possibles."""
        return self.length

    def __getitem__(self, idx):
        """
        Récupère une paire d'entrée (x) et de cible (y).
        x est la séquence d'entrée, y est la séquence décalée d'un cran vers le futur.
        """
        chunk = self.tokens[idx:idx + self.block_size + 1]
        x = torch.tensor(chunk[:-1], dtype=torch.long)
        y = torch.tensor(chunk[1:], dtype=torch.long)
        return x, y

def load_data(config, tokenizer):
    """
    Charge tous les fichiers texte du dossier spécifié, les tokenize et
    crée les ensembles d'entraînement et de validation.

    Args:
        config: L'objet de configuration contenant config.data_path.
        tokenizer: Le tokeniseur à entraîner et utiliser.

    Returns:
        tuple: (train_dataset, val_dataset)
    """
    data_dir = config.data_path
    text_data = ""
    file_count = 0

    # Lecture de tous les fichiers .txt dans le dossier
    if os.path.exists(data_dir):
        for filename in os.listdir(data_dir):
            if filename.endswith(".txt"):
                filepath = os.path.join(data_dir, filename)
                with open(filepath, 'r', encoding='utf-8') as f:
                    text_data += f.read() + "\n"
                file_count += 1

    if not text_data:
        # Données factices pour l'exemple si le dossier est vide ou n'existe pas
        print("Avertissement: Aucun fichier .txt trouvé. Utilisation de données factices.")
        text_data = "Bonjour, ceci est un exemple de texte pour entraîner notre modèle Mini-GPT. " * 100

    # Entraînement du tokeniseur sur l'ensemble du texte
    tokenizer.fit(text_data)

    # Encodage du texte entier en identifiants de tokens
    tokens = tokenizer.encode(text_data)
    total_chars = len(text_data)

    # Séparation 90% entraînement, 10% validation
    split_idx = int(len(tokens) * 0.9)
    train_tokens = tokens[:split_idx]
    val_tokens = tokens[split_idx:]

    train_dataset = TextDataset(train_tokens, config.block_size)
    val_dataset = TextDataset(val_tokens, config.block_size)

    # Affichage des statistiques en français
    print("-" * 50)
    print("Statistiques des données :")
    print(f"Nombre de fichiers lus : {file_count}")
    print(f"Nombre total de caractères : {total_chars}")
    print(f"Taille du vocabulaire : {tokenizer.vocab_size}")
    print(f"Séquences d'entraînement : {len(train_dataset)}")
    print(f"Séquences de validation : {len(val_dataset)}")
    print("-" * 50)

    return train_dataset, val_dataset
