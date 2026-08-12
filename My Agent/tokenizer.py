"""
Tokenizer BPE (Byte-Pair Encoding) pour Mini-GPT.
Fonctionne avec des sous-mots au lieu de caractères individuels,
ce qui est beaucoup plus efficace pour le modèle de langage.
"""

import json
import os
import re
from collections import Counter


class BPETokenizer:
    """
    Tokenizer Byte-Pair Encoding (BPE).

    Le BPE fusionne itérativement les paires de tokens les plus fréquentes
    pour construire un vocabulaire de sous-mots. Par exemple :
    - "bonjour" pourrait devenir ["bon", "jour"] (2 tokens au lieu de 7 caractères)
    - Les mots rares sont décomposés en sous-unités connues
    """

    def __init__(self):
        self.vocab = {}           # token_id -> token_string
        self.vocab_inv = {}       # token_string -> token_id
        self.merges = []          # Liste ordonnée des fusions BPE
        self.merge_ranks = {}     # (pair) -> rang de fusion

        # Tokens spéciaux
        self.PAD = '<PAD>'
        self.UNK = '<UNK>'
        self.BOS = '<BOS>'
        self.EOS = '<EOS>'
        self.special_tokens = [self.PAD, self.UNK, self.BOS, self.EOS]

    def _get_pairs(self, word):
        """
        Récupère toutes les paires adjacentes dans un mot tokenisé.

        Args:
            word: Tuple de tokens.

        Returns:
            set: Ensemble de paires.
        """
        pairs = set()
        for i in range(len(word) - 1):
            pairs.add((word[i], word[i + 1]))
        return pairs

    @staticmethod
    def _pretokenize(text):
        """Découpe le texte tout en conservant espaces et retours à la ligne."""
        return re.findall(r"[a-zA-ZÀ-ÿ]+|[0-9]+|\n|[ \t]+|[^\w\s]", text)

    def _get_stats(self, words_freq):
        """
        Compte la fréquence de chaque paire de tokens dans le corpus.

        Args:
            words_freq: Dict de {tuple_de_tokens: fréquence}.

        Returns:
            Counter: Fréquences des paires.
        """
        pairs = Counter()
        for word, freq in words_freq.items():
            symbols = word
            for i in range(len(symbols) - 1):
                pairs[(symbols[i], symbols[i + 1])] += freq
        return pairs

    def _merge_pair(self, pair, words_freq):
        """
        Fusionne une paire de tokens dans tout le vocabulaire.

        Args:
            pair: Tuple (token1, token2) à fusionner.
            words_freq: Dict actuel des mots.

        Returns:
            dict: Nouveau words_freq après fusion.
        """
        new_words = {}
        bigram = pair
        replacement = pair[0] + pair[1]

        for word, freq in words_freq.items():
            new_word = []
            i = 0
            while i < len(word):
                if i < len(word) - 1 and word[i] == bigram[0] and word[i + 1] == bigram[1]:
                    new_word.append(replacement)
                    i += 2
                else:
                    new_word.append(word[i])
                    i += 1
            new_words[tuple(new_word)] = freq

        return new_words

    def fit(self, text, vocab_size=2000, verbose=True):
        """
        Entraîne le tokenizer BPE sur le texte fourni.

        Args:
            text: Le texte d'entraînement complet.
            vocab_size: Taille cible du vocabulaire.
            verbose: Afficher la progression.
        """
        if verbose:
            print("Entrainement du tokenizer BPE...")

        # Étape 1 : Pré-tokeniser en mots (splits sur espaces et ponctuation)
        # On ajoute un marqueur de fin de mot '▁' pour préserver les espaces
        words = [part for part in self._pretokenize(text) if not part.isspace()]
        word_freq = Counter(words)

        # Étape 2 : Initialiser chaque mot comme séquence de caractères
        words_freq = {}
        for word, freq in word_freq.items():
            char_tuple = tuple(word)
            words_freq[char_tuple] = freq

        # Étape 3 : Construire le vocabulaire initial (tous les caractères uniques)
        chars = set()
        for word in words_freq:
            for ch in word:
                chars.add(ch)

        # Vocabulaire initial = tokens spéciaux + caractères uniques + espace
        base_vocab = list(self.special_tokens) + [' ', '\n'] + sorted(list(chars))

        # Nombre de fusions nécessaires
        num_merges = vocab_size - len(base_vocab)
        if num_merges < 0:
            num_merges = 0

        if verbose:
            print(f"  Vocabulaire initial: {len(base_vocab)} tokens")
            print(f"  Fusions a effectuer: {num_merges}")

        # Étape 4 : Fusions BPE itératives
        self.merges = []
        for i in range(num_merges):
            pairs = self._get_stats(words_freq)
            if not pairs:
                break

            # Trouver la paire la plus fréquente
            best_pair = max(pairs, key=pairs.get)

            if pairs[best_pair] < 2:
                break  # Plus de paires fréquentes

            # Fusionner
            words_freq = self._merge_pair(best_pair, words_freq)
            self.merges.append(best_pair)

            if verbose and (i + 1) % 200 == 0:
                merged_token = best_pair[0] + best_pair[1]
                print(f"  Fusion {i+1}/{num_merges}: '{best_pair[0]}' + '{best_pair[1]}' -> '{merged_token}' (freq: {pairs[best_pair]})")

        # Étape 5 : Construire le vocabulaire final
        # Collecter tous les tokens résultant des fusions
        all_tokens = set()
        for word in words_freq:
            for token in word:
                all_tokens.add(token)

        # Vocabulaire final = tokens spéciaux + espace + caractères + tokens fusionnés
        final_tokens = list(self.special_tokens) + [' ', '\n']
        # Ajouter les caractères
        for ch in sorted(chars):
            if ch not in final_tokens:
                final_tokens.append(ch)
        # Ajouter les tokens fusionnés (triés par longueur puis alphabétiquement)
        merged_tokens = sorted([t for t in all_tokens if len(t) > 1], key=lambda x: (len(x), x))
        for t in merged_tokens:
            if t not in final_tokens:
                final_tokens.append(t)

        # Construire les mappings
        self.vocab = {i: token for i, token in enumerate(final_tokens)}
        self.vocab_inv = {token: i for i, token in enumerate(final_tokens)}
        self.merge_ranks = {pair: rank for rank, pair in enumerate(self.merges)}

        if verbose:
            print(f"  Vocabulaire final: {len(self.vocab)} tokens")
            print(f"  Fusions effectuees: {len(self.merges)}")

    def _bpe_encode_word(self, word):
        """
        Applique les fusions BPE à un mot.

        Args:
            word: Le mot à encoder.

        Returns:
            list: Liste de tokens BPE.
        """
        if not word:
            return []

        # Commencer avec les caractères individuels
        tokens = list(word)

        while len(tokens) > 1:
            # Trouver la paire avec le rang le plus bas (= la plus prioritaire)
            pairs = self._get_pairs(tuple(tokens))
            if not pairs:
                break

            best_pair = min(
                pairs,
                key=lambda p: self.merge_ranks.get(p, float('inf'))
            )

            if best_pair not in self.merge_ranks:
                break  # Plus de fusions applicables

            # Appliquer la fusion
            new_tokens = []
            i = 0
            while i < len(tokens):
                if i < len(tokens) - 1 and tokens[i] == best_pair[0] and tokens[i + 1] == best_pair[1]:
                    new_tokens.append(best_pair[0] + best_pair[1])
                    i += 2
                else:
                    new_tokens.append(tokens[i])
                    i += 1
            tokens = new_tokens

        return tokens

    def encode(self, text):
        """
        Encode du texte en séquence d'identifiants de tokens.

        Args:
            text: Le texte à encoder.

        Returns:
            list[int]: Séquence d'identifiants.
        """
        # Pré-tokeniser
        words = self._pretokenize(text)

        token_ids = []
        unk_id = self.vocab_inv.get(self.UNK, 1)
        space_id = self.vocab_inv.get(' ', unk_id)

        newline_id = self.vocab_inv.get('\n', space_id)

        for word in words:
            if word == '\n':
                token_ids.append(newline_id)
                continue
            if word.isspace():
                token_ids.extend([space_id] * max(1, len(word.expandtabs(1))))
                continue

            # Appliquer BPE au mot
            bpe_tokens = self._bpe_encode_word(word)

            for token in bpe_tokens:
                token_id = self.vocab_inv.get(token, unk_id)
                token_ids.append(token_id)

        return token_ids

    def decode(self, token_ids):
        """
        Décode une séquence d'identifiants en texte.

        Args:
            token_ids: Liste d'identifiants.

        Returns:
            str: Le texte décodé.
        """
        special_ids = set()
        for t in self.special_tokens:
            if t in self.vocab_inv:
                special_ids.add(self.vocab_inv[t])

        tokens = []
        for tid in token_ids:
            if tid in special_ids:
                continue
            token = self.vocab.get(tid, '')
            tokens.append(token)

        return ''.join(tokens)

    @property
    def vocab_size(self):
        """Retourne la taille du vocabulaire."""
        return len(self.vocab)

    def save(self, path):
        """
        Sauvegarde le tokenizer dans un fichier JSON.

        Args:
            path: Chemin de sauvegarde.
        """
        os.makedirs(os.path.dirname(path) if os.path.dirname(path) else '.', exist_ok=True)

        # Convertir les clés tuple des merges en listes pour JSON
        merges_list = [[a, b] for a, b in self.merges]

        data = {
            'vocab': {str(k): v for k, v in self.vocab.items()},
            'vocab_inv': self.vocab_inv,
            'merges': merges_list,
        }

        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def load(self, path):
        """
        Charge le tokenizer depuis un fichier JSON.

        Args:
            path: Chemin du fichier.
        """
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        self.vocab = {int(k): v for k, v in data['vocab'].items()}
        self.vocab_inv = data['vocab_inv']
        self.merges = [tuple(pair) for pair in data['merges']]
        self.merge_ranks = {pair: rank for rank, pair in enumerate(self.merges)}


# Alias pour la compatibilité avec l'ancien code
CharTokenizer = BPETokenizer
