"""
Ce fichier implémente l'architecture d'un modèle Transformer de type décodeur (Mini-GPT).
Il contient les couches d'attention, le bloc Transformer et le modèle complet.
"""

import torch
import torch.nn as nn
from torch.nn import functional as F

class MultiHeadSelfAttention(nn.Module):
    """
    Mécanisme d'auto-attention multi-têtes avec masque causal.
    """
    def __init__(self, embed_dim, n_heads, block_size, dropout):
        super().__init__()
        assert embed_dim % n_heads == 0, "embed_dim doit être divisible par n_heads"

        self.n_heads = n_heads
        self.head_dim = embed_dim // n_heads
        self.embed_dim = embed_dim

        # Projections linéaires pour Query (Q), Key (K), et Value (V)
        # Q: Que cherche ce token ?
        # K: Que contient ce token ?
        # V: Quelle information ce token transmet-il si on s'y intéresse ?
        self.c_attn = nn.Linear(embed_dim, 3 * embed_dim)

        # Projection de sortie pour combiner les têtes
        self.c_proj = nn.Linear(embed_dim, embed_dim)

        self.attn_dropout = nn.Dropout(dropout)
        self.resid_dropout = nn.Dropout(dropout)

        # Masque causal: matrice triangulaire inférieure (1 en bas, 0 en haut).
        # Empêche un token d'attendre (de voir) les tokens futurs (à sa droite)
        # pour préserver le caractère autoregressif du modèle.
        self.register_buffer('bias', torch.tril(torch.ones(block_size, block_size)).view(1, 1, block_size, block_size))

    def forward(self, x):
        B, T, C = x.size() # Batch, Time (séquence), Channels (embed_dim)

        # Calcul de Q, K, V
        qkv = self.c_attn(x)
        q, k, v = qkv.split(self.embed_dim, dim=2)

        # Redimensionnement pour les multi-têtes: (B, T, n_heads, head_dim) -> (B, n_heads, T, head_dim)
        k = k.view(B, T, self.n_heads, self.head_dim).transpose(1, 2)
        q = q.view(B, T, self.n_heads, self.head_dim).transpose(1, 2)
        v = v.view(B, T, self.n_heads, self.head_dim).transpose(1, 2)

        # Attention Scaled Dot-Product: (Q @ K^T) / sqrt(d_k)
        # On divise par sqrt(d_k) pour éviter que le produit scalaire ne devienne trop grand,
        # ce qui pousserait le softmax dans des régions où les gradients sont très faibles.
        att = (q @ k.transpose(-2, -1)) * (1.0 / (self.head_dim ** 0.5))

        # Application du masque causal
        att = att.masked_fill(self.bias[:, :, :T, :T] == 0, float('-inf'))
        att = F.softmax(att, dim=-1)
        att = self.attn_dropout(att)

        # Pondération des valeurs (V) par l'attention
        y = att @ v # (B, n_heads, T, head_dim)

        # Recombinaison des têtes
        y = y.transpose(1, 2).contiguous().view(B, T, C)

        # Projection finale
        y = self.resid_dropout(self.c_proj(y))
        return y

class FeedForward(nn.Module):
    """
    Réseau de neurones à propagation avant (MLP) appliqué indépendamment à chaque position.
    """
    def __init__(self, embed_dim, dropout):
        super().__init__()
        # Le ratio d'expansion standard de 4 permet au modèle d'apprendre des
        # représentations intermédiaires plus riches avant de les projeter à nouveau.
        self.net = nn.Sequential(
            nn.Linear(embed_dim, 4 * embed_dim),
            nn.GELU(),
            nn.Linear(4 * embed_dim, embed_dim),
            nn.Dropout(dropout)
        )

    def forward(self, x):
        return self.net(x)

class TransformerBlock(nn.Module):
    """
    Un bloc Transformer standard (Pre-LayerNorm).
    """
    def __init__(self, embed_dim, n_heads, block_size, dropout):
        super().__init__()
        # Architecture Pre-LN: On applique la normalisation AVANT l'attention et le MLP.
        # Cela stabilise fortement l'entraînement pour les réseaux profonds par rapport
        # à la Post-LN du papier Transformer original.
        self.ln_1 = nn.LayerNorm(embed_dim)
        self.attn = MultiHeadSelfAttention(embed_dim, n_heads, block_size, dropout)
        self.ln_2 = nn.LayerNorm(embed_dim)
        self.mlp = FeedForward(embed_dim, dropout)

    def forward(self, x):
        # Connexions résiduelles (x + ...) pour faciliter le flux du gradient
        x = x + self.attn(self.ln_1(x))
        x = x + self.mlp(self.ln_2(x))
        return x

class MiniGPT(nn.Module):
    """
    Modèle de langage Mini-GPT (décodeur uniquement).
    """
    def __init__(self, config):
        """
        Initialise le modèle avec la configuration fournie.

        Args:
            config: Objet de configuration contenant les hyperparamètres.
        """
        super().__init__()
        self.config = config

        self.transformer = nn.ModuleDict(dict(
            wte = nn.Embedding(config.vocab_size, config.embed_dim), # Token embedding
            wpe = nn.Embedding(config.block_size, config.embed_dim), # Position embedding
            drop = nn.Dropout(config.dropout),
            h = nn.ModuleList([TransformerBlock(config.embed_dim, config.n_heads, config.block_size, config.dropout) for _ in range(config.n_layers)]),
            ln_f = nn.LayerNorm(config.embed_dim) # LayerNorm final
        ))

        # Tête de classification (projection vers le vocabulaire)
        self.lm_head = nn.Linear(config.embed_dim, config.vocab_size, bias=False)

        # Partage des poids entre l'embedding des tokens et la couche de sortie (Weight Tying)
        # Cela réduit le nombre de paramètres et améliore souvent les performances.
        self.transformer.wte.weight = self.lm_head.weight

        self.apply(self._init_weights)

    def _init_weights(self, module):
        if isinstance(module, nn.Linear):
            torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)
            if module.bias is not None:
                torch.nn.init.zeros_(module.bias)
        elif isinstance(module, nn.Embedding):
            torch.nn.init.normal_(module.weight, mean=0.0, std=0.02)

    def forward(self, idx, targets=None):
        """
        Passe avant du modèle.

        Args:
            idx: Tenseur de dimensions (B, T) contenant les indices des tokens.
            targets: Tenseur optionnel (B, T) pour calculer la perte.

        Returns:
            logits: Tenseur (B, T, vocab_size).
            loss: Perte (si targets est fourni), sinon None.
        """
        device = idx.device
        b, t = idx.size()
        assert t <= self.config.block_size, f"Séquence de longueur {t} dépasse la taille de bloc {self.config.block_size}"

        pos = torch.arange(0, t, dtype=torch.long, device=device) # (T)

        # Combinaison des embeddings de tokens et de positions
        tok_emb = self.transformer.wte(idx) # (B, T, C)
        pos_emb = self.transformer.wpe(pos) # (T, C)

        x = self.transformer.drop(tok_emb + pos_emb)

        for block in self.transformer.h:
            x = block(x)

        x = self.transformer.ln_f(x)
        logits = self.lm_head(x) # (B, T, vocab_size)

        loss = None
        if targets is not None:
            # CrossEntropyLoss s'attend à des inputs de forme (N, C) où C est le nombre de classes
            logits_view = logits.view(-1, logits.size(-1))
            targets_view = targets.view(-1)
            loss = F.cross_entropy(logits_view, targets_view)

        return logits, loss

    @torch.no_grad()
    def generate(self, idx, max_new_tokens, temperature=1.0, top_k=None, stop_token_id=None):
        """
        Génération autorégressive de nouveaux tokens.

        Args:
            idx: Séquence initiale (B, T).
            max_new_tokens: Nombre de tokens à générer.
            temperature: Contrôle le hasard (bas = plus conservateur).
            top_k: Limite l'échantillonnage aux k tokens les plus probables.

        Returns:
            La séquence étendue avec les nouveaux tokens générés.
        """
        if temperature <= 0:
            raise ValueError("La température doit être strictement positive.")
        if max_new_tokens < 0:
            raise ValueError("max_new_tokens ne peut pas être négatif.")

        for _ in range(max_new_tokens):
            # On tronque la séquence si elle dépasse la taille de bloc
            idx_cond = idx if idx.size(1) <= self.config.block_size else idx[:, -self.config.block_size:]

            # Prédiction du prochain token
            logits, _ = self(idx_cond)
            logits = logits[:, -1, :] / temperature # On prend seulement le dernier pas de temps

            if top_k is not None:
                v, _ = torch.topk(logits, min(top_k, logits.size(-1)))
                logits[logits < v[:, [-1]]] = -float('Inf')

            probs = F.softmax(logits, dim=-1)
            idx_next = torch.multinomial(probs, num_samples=1)

            # Concaténation du nouveau token à la séquence
            idx = torch.cat((idx, idx_next), dim=1)

            if stop_token_id is not None and torch.all(idx_next == stop_token_id):
                break

        return idx

    def count_parameters(self):
        """Retourne le nombre total de paramètres entraînables."""
        return sum(p.numel() for p in self.parameters() if p.requires_grad)
