"""
Interface de discussion (chat) interactive pour le modèle Mini-GPT.
Permet de converser avec le modèle entraîné dans le terminal avec des effets visuels.
"""
import torch
import os
import re
import sys
import time
from colorama import init, Fore, Style

from config import GPTConfig
from tokenizer import BPETokenizer
from model import MiniGPT

# Initialisation de colorama pour Windows et autres plateformes
init(autoreset=True)

def print_slow(text, delay=0.01):
    """
    Affiche le texte caractère par caractère pour simuler la frappe (effet machine à écrire).

    Args:
        text (str): Le texte à afficher.
        delay (float): Le délai entre chaque caractère en secondes.
    """
    for char in text:
        sys.stdout.write(char)
        sys.stdout.flush()
        time.sleep(delay)
    print() # Retour à la ligne à la fin

def clear_screen():
    """Efface le contenu du terminal."""
    os.system('cls' if os.name == 'nt' else 'clear')

def main():
    """
    Fonction principale pour l'interface de chat.
    """
    # Vérification des fichiers requis
    if not os.path.exists('best_model.pt') and not os.path.exists('final_model.pt'):
        print(Fore.RED + "❌ Erreur : Aucun fichier de modèle trouvé. Veuillez exécuter train.py en premier.")
        sys.exit(1)

    if not os.path.exists('tokenizer.json'):
        print(Fore.RED + "❌ Erreur : 'tokenizer.json' introuvable. Veuillez exécuter train.py en premier.")
        sys.exit(1)

    config = GPTConfig()
    device = 'cuda' if torch.cuda.is_available() and config.device == 'cuda' else 'cpu'
    config.device = device

    tokenizer = BPETokenizer()
    tokenizer.load('tokenizer.json')
    config.vocab_size = tokenizer.vocab_size

    print(Fore.YELLOW + "Chargement du modèle en cours...")

    model = MiniGPT(config)
    model_path = 'best_model.pt' if os.path.exists('best_model.pt') else 'final_model.pt'
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.to(device)
    model.eval()

    num_params = sum(p.numel() for p in model.parameters() if p.requires_grad)

    # Variables de génération modifiables par l'utilisateur
    current_temp = 0.8
    current_top_k = 40
    current_length = 200

    clear_screen()

    banner = f"""
{Fore.CYAN}==================================================
{Fore.MAGENTA}          🤖 MINI-GPT CHAT INTERFACE 🤖
{Fore.CYAN}==================================================
{Fore.GREEN}Infos sur le modèle :
- Paramètres : {num_params:,}
- Vocabulaire : {tokenizer.vocab_size} caractères
- Appareil : {device.upper()}
{Fore.YELLOW}
Commandes disponibles :
  /quit ou /q    : Quitter l'application
  /temp <valeur> : Modifier la température (actuel: {current_temp})
  /topk <valeur> : Modifier le top_k (actuel: {current_top_k})
  /length <val>  : Modifier la longueur max (actuel: {current_length})
  /info          : Afficher les paramètres actuels
  /help ou /?    : Afficher cette aide
  /clear         : Effacer l'écran
{Fore.CYAN}==================================================
"""
    print(banner)

    while True:
        try:
            # Saisie de l'utilisateur
            user_input = input(f"\n{Fore.GREEN}Vous > {Style.RESET_ALL}").strip()

            if not user_input:
                continue

            # Traitement des commandes spéciales
            if user_input.lower() in ['/quit', '/q']:
                print(Fore.MAGENTA + "👋 Au revoir !")
                break

            elif user_input.lower() in ['/help', '/?']:
                print(Fore.YELLOW + "Commandes : /quit, /temp <val>, /topk <val>, /length <val>, /info, /clear, /help")
                continue

            elif user_input.lower() == '/clear':
                clear_screen()
                continue

            elif user_input.lower() == '/info':
                print(Fore.CYAN + f"Paramètres actuels : Temp={current_temp}, Top-k={current_top_k}, Longueur={current_length}")
                continue

            elif user_input.lower().startswith('/temp '):
                try:
                    val = float(user_input.split(' ')[1])
                    current_temp = val
                    print(Fore.GREEN + f"✅ Température définie sur {current_temp}")
                except ValueError:
                    print(Fore.RED + "❌ Valeur invalide pour la température. Utilisez un nombre décimal (ex: 0.8).")
                continue

            elif user_input.lower().startswith('/topk '):
                try:
                    val = int(user_input.split(' ')[1])
                    current_top_k = val
                    print(Fore.GREEN + f"✅ Top-k défini sur {current_top_k}")
                except ValueError:
                    print(Fore.RED + "❌ Valeur invalide pour le top-k. Utilisez un nombre entier (ex: 40).")
                continue

            elif user_input.lower().startswith('/length '):
                try:
                    val = int(user_input.split(' ')[1])
                    current_length = val
                    print(Fore.GREEN + f"✅ Longueur max définie sur {current_length}")
                except ValueError:
                    print(Fore.RED + "❌ Valeur invalide pour la longueur. Utilisez un nombre entier (ex: 200).")
                continue

            # Mode discussion normale
            # Encodage de l'entrée
            prompt = f"Q: {user_input}\nR:"
            context = torch.tensor([tokenizer.encode(prompt)], dtype=torch.long, device=device)
            if context.size(1) > config.block_size:
                context = context[:, -config.block_size:]

            # Affichage de l'en-tête du bot
            sys.stdout.write(f"\n{Fore.MAGENTA}Mini-GPT > {Style.RESET_ALL}")
            sys.stdout.flush()

            # Génération de la réponse
            with torch.no_grad():
                generated_indices = model.generate(
                    context,
                    max_new_tokens=current_length,
                    temperature=current_temp,
                    top_k=current_top_k
                )[0]

            # Décodage et affichage avec effet machine à écrire
            # On ignore la partie du prompt original dans l'affichage
            prompt_len = len(context[0])
            response_indices = generated_indices[prompt_len:].tolist()
            response_text = tokenizer.decode(response_indices)
            response_text = re.split(r"\s*Q\s*:\s*", response_text, maxsplit=1)[0].strip()
            if not response_text:
                response_text = "Je n'ai pas pu produire de réponse. Essayez de reformuler la question."

            print_slow(response_text, delay=0.015)

        except KeyboardInterrupt:
            # Gestion d'une interruption via Ctrl+C pendant le chat
            print(Fore.YELLOW + "\n⚠️ Pour quitter, tapez /quit ou /q.")
        except Exception as e:
            print(Fore.RED + f"\n❌ Une erreur s'est produite : {str(e)}")

if __name__ == '__main__':
    main()
