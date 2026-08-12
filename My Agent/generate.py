"""
Script de génération de texte pour le modèle Mini-GPT.
Permet de générer du texte à partir d'une amorce (prompt) fournie en ligne de commande.
"""
import torch
import argparse
import os
import sys

from config import GPTConfig
from tokenizer import BPETokenizer
from model import MiniGPT

def main():
    """
    Fonction principale pour la génération de texte.
    """
    parser = argparse.ArgumentParser(description="Générateur de texte avec Mini-GPT")
    parser.add_argument("--prompt", type=str, default="\n", help="L'amorce (prompt) pour commencer la génération")
    parser.add_argument("--length", type=int, default=500, help="Le nombre maximum de tokens (caractères) à générer")
    parser.add_argument("--temperature", type=float, default=0.8, help="Température pour l'échantillonnage (plus haut = plus créatif, plus bas = plus conservateur)")
    parser.add_argument("--top_k", type=int, default=40, help="Limiter l'échantillonnage aux top-k tokens les plus probables")

    args = parser.parse_args()

    # Vérification de l'existence du modèle et du tokenizer
    if not os.path.exists('best_model.pt') and not os.path.exists('final_model.pt'):
        print("❌ Erreur : Aucun fichier de modèle trouvé ('best_model.pt' ou 'final_model.pt'). Veuillez entraîner le modèle d'abord.")
        sys.exit(1)

    if not os.path.exists('tokenizer.json'):
        print("❌ Erreur : Le fichier 'tokenizer.json' est introuvable. Veuillez entraîner le modèle d'abord.")
        sys.exit(1)

    config = GPTConfig()
    device = 'cuda' if torch.cuda.is_available() and config.device == 'cuda' else 'cpu'
    config.device = device

    # Chargement du tokenizer
    tokenizer = BPETokenizer()
    tokenizer.load('tokenizer.json')
    config.vocab_size = tokenizer.vocab_size

    # Chargement du modèle
    model = MiniGPT(config)
    model_path = 'best_model.pt' if os.path.exists('best_model.pt') else 'final_model.pt'
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.to(device)
    model.eval()

    print("==================================================")
    print("          ✨ Génération de texte ✨               ")
    print("==================================================")
    print(f"Prompt : '{args.prompt}'")
    print(f"Longueur : {args.length}")
    print(f"Température : {args.temperature}")
    print(f"Top-k : {args.top_k}")
    print("==================================================\n")

    # Préparation de l'entrée
    context = torch.tensor([tokenizer.encode(args.prompt)], dtype=torch.long, device=device)

    # Génération
    print("Génération en cours...\n")
    with torch.no_grad():
        generated_indices = model.generate(context, max_new_tokens=args.length, temperature=args.temperature, top_k=args.top_k)[0]

    generated_text = tokenizer.decode(generated_indices.tolist())
    print(generated_text)
    print("\n==================================================")

if __name__ == '__main__':
    main()
