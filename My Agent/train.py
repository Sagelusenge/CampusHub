"""
Fichier d'entraînement amélioré pour le modèle Mini-GPT.
Inclut un cosine learning rate scheduler, du gradient clipping et du warmup.
"""
import torch
import torch.nn as nn
from torch.optim import AdamW
import os
import sys
import io
import math
import time
import argparse

# Fix encodage Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from config import GPTConfig
from tokenizer import BPETokenizer
from model import MiniGPT


def get_batch(data, batch_size, block_size, device):
    """
    Sélectionne aléatoirement un batch de données.
    """
    if len(data) <= block_size:
        raise ValueError(
            f"Pas assez de données ({len(data)} tokens) pour un contexte de {block_size} tokens."
        )
    ix = torch.randint(len(data) - block_size, (batch_size,))
    x = torch.stack([data[i:i+block_size] for i in ix])
    y = torch.stack([data[i+1:i+block_size+1] for i in ix])
    return x.to(device), y.to(device)


@torch.no_grad()
def estimate_loss(model, train_data, val_data, config):
    """
    Évalue le modèle sur les ensembles d'entraînement et de validation.
    """
    out = {}
    model.eval()
    for split, data in [('train', train_data), ('val', val_data)]:
        losses = torch.zeros(config.eval_iters)
        for k in range(config.eval_iters):
            X, Y = get_batch(data, config.batch_size, config.block_size, config.device)
            logits, loss = model(X, Y)
            losses[k] = loss.item()
        out[split] = losses.mean().item()
    model.train()
    return out


def get_lr(iter_num, config):
    """
    Calcule le learning rate avec warmup linéaire + cosine decay.

    Args:
        iter_num: Itération actuelle.
        config: Configuration.

    Returns:
        float: Le learning rate pour cette itération.
    """
    # Phase de warmup linéaire
    if iter_num < config.warmup_iters:
        return config.learning_rate * (iter_num + 1) / config.warmup_iters

    # Phase de cosine decay
    if iter_num > config.max_iters:
        return config.min_lr

    # Cosine annealing entre warmup_iters et max_iters
    decay_ratio = (iter_num - config.warmup_iters) / (config.max_iters - config.warmup_iters)
    coeff = 0.5 * (1.0 + math.cos(math.pi * decay_ratio))
    return config.min_lr + coeff * (config.learning_rate - config.min_lr)


def format_time(seconds):
    """Formate un nombre de secondes en chaîne lisible."""
    if seconds < 60:
        return f"{seconds:.0f}s"
    elif seconds < 3600:
        return f"{seconds//60:.0f}m {seconds%60:.0f}s"
    else:
        return f"{seconds//3600:.0f}h {(seconds%3600)//60:.0f}m"


def main():
    """Fonction principale d'entraînement."""
    print("=" * 60)
    print("    Entrainement du modele Mini-GPT (ameliore)")
    print("=" * 60)

    parser = argparse.ArgumentParser(description="Entraîne le Mini-GPT expérimental de CampusHubIA")
    parser.add_argument("--data", default="data/campushub_knowledge.txt", help="Corpus UTF-8 à utiliser")
    parser.add_argument("--max-iters", type=int, default=None, help="Nombre d’itérations (remplace la configuration)")
    args = parser.parse_args()

    config = GPTConfig()
    if args.max_iters is not None:
        if args.max_iters < 1:
            parser.error("--max-iters doit être supérieur à zéro")
        config.max_iters = args.max_iters
        config.warmup_iters = min(config.warmup_iters, max(1, args.max_iters // 10))

    # Configuration de l'appareil
    if torch.cuda.is_available() and config.device == 'cuda':
        device = 'cuda'
        print(f"[GPU] Appareil : {torch.cuda.get_device_name(0)}")
    else:
        device = 'cpu'
        config.device = device
        print("[CPU] Appareil : CPU")

    # Chargement des données
    data_path = args.data
    if not os.path.exists(data_path):
        print(f"ERREUR : Le fichier {data_path} est introuvable.")
        print("Lancez d'abord : python sync_campushub_data.py")
        sys.exit(1)

    with open(data_path, 'r', encoding='utf-8') as f:
        text = f.read()

    size_mb = len(text.encode('utf-8')) / (1024 * 1024)
    print(f"[DATA] Texte d'entrainement : {len(text):,} caracteres ({size_mb:.2f} Mo)")

    # Initialisation du tokenizer BPE
    tokenizer = BPETokenizer()
    tokenizer.fit(text, vocab_size=2000, verbose=True)
    tokenizer.save('./tokenizer.json')
    print(f"[TOKENIZER] Vocabulaire : {tokenizer.vocab_size} tokens BPE")

    config.vocab_size = tokenizer.vocab_size

    # Encodage des données
    print("[ENCODING] Encodage du texte en tokens...")
    tokens = tokenizer.encode(text)
    data = torch.tensor(tokens, dtype=torch.long)
    print(f"[ENCODING] {len(tokens):,} tokens (ratio compression: {len(text)/len(tokens):.1f}x)")

    # Split train/val. Chaque partie doit contenir au moins block_size + 1
    # tokens, y compris avec un petit corpus local.
    minimum_split = config.block_size + 2
    if len(data) < minimum_split * 2:
        print(
            f"ERREUR : corpus trop petit ({len(data)} tokens). "
            f"Il en faut au moins {minimum_split * 2} pour entraîner et valider."
        )
        sys.exit(1)
    val_size = max(minimum_split, int(0.1 * len(data)))
    n = len(data) - val_size
    train_data = data[:n]
    val_data = data[n:]
    print(f"[SPLIT] Train: {len(train_data):,} tokens | Val: {len(val_data):,} tokens")

    # Création du modèle
    model = MiniGPT(config).to(device)

    num_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"[MODEL] {num_params:,} parametres entrainables")
    print(f"[MODEL] {config.n_layers} couches, {config.n_heads} tetes, dim={config.embed_dim}, ctx={config.block_size}")

    # Optimiseur
    optimizer = AdamW(model.parameters(), lr=config.learning_rate, betas=(0.9, 0.95), weight_decay=0.1)

    best_val_loss = float('inf')
    start_time = time.time()

    print(f"\n[TRAIN] Demarrage ({config.max_iters} iterations)...")
    print(f"[TRAIN] Warmup: {config.warmup_iters} iters | Grad clip: {config.grad_clip}")
    print("-" * 60)

    try:
        for iter_num in range(config.max_iters):

            # Mise à jour du learning rate (cosine scheduler + warmup)
            lr = get_lr(iter_num, config)
            for param_group in optimizer.param_groups:
                param_group['lr'] = lr

            # Évaluation périodique
            if iter_num % config.eval_interval == 0 or iter_num == config.max_iters - 1:
                losses = estimate_loss(model, train_data, val_data, config)
                elapsed = time.time() - start_time
                eta = (elapsed / (iter_num + 1)) * (config.max_iters - iter_num - 1) if iter_num > 0 else 0

                print(f"[{iter_num:>5}/{config.max_iters}] "
                      f"train={losses['train']:.4f} | val={losses['val']:.4f} | "
                      f"lr={lr:.2e} | temps={format_time(elapsed)} | ETA={format_time(eta)}")

                # Sauvegarde du meilleur modèle
                if losses['val'] < best_val_loss:
                    best_val_loss = losses['val']
                    torch.save(model.state_dict(), 'best_model.pt')
                    print(f"         -> Meilleur modele sauvegarde! (val={best_val_loss:.4f})")

                # Génération d'un exemple pour montrer les progrès
                context = torch.zeros((1, 1), dtype=torch.long, device=device)
                generated_indices = model.generate(context, max_new_tokens=80, temperature=0.8, top_k=40)[0].tolist()
                generated_text = tokenizer.decode(generated_indices)
                # Prendre juste la première ligne pour la lisibilité
                preview = generated_text[:120].replace('\n', ' ')
                print(f"         Exemple: \"{preview}...\"")
                print("-" * 60)

            # Échantillonnage d'un batch
            xb, yb = get_batch(train_data, config.batch_size, config.block_size, device)

            # Passe avant
            logits, loss = model(xb, yb)

            # Rétropropagation
            optimizer.zero_grad(set_to_none=True)
            loss.backward()

            # Gradient clipping pour stabiliser l'entraînement
            torch.nn.utils.clip_grad_norm_(model.parameters(), config.grad_clip)

            optimizer.step()

    except KeyboardInterrupt:
        print("\n[!] Entrainement interrompu par l'utilisateur.")
        torch.save(model.state_dict(), 'interrupted_model.pt')
        print("[SAVE] Modele sauvegarde sous 'interrupted_model.pt'.")

    total_time = time.time() - start_time
    print(f"\n{'=' * 60}")
    print(f"  Entrainement termine!")
    print(f"  Duree totale: {format_time(total_time)}")
    print(f"  Meilleure perte validation: {best_val_loss:.4f}")
    print(f"{'=' * 60}")

    torch.save(model.state_dict(), 'final_model.pt')
    print("[SAVE] Modele final sauvegarde sous 'final_model.pt'.")


if __name__ == '__main__':
    main()
