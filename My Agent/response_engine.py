"""Moteur de réponse local fondé sur les données du projet.

Il fournit des réponses déterministes quand aucun checkpoint Mini-GPT entraîné
n'est disponible et évite ainsi de présenter des poids aléatoires comme une IA.
"""

from __future__ import annotations

import math
import re
import unicodedata
from collections import Counter
from difflib import get_close_matches
from pathlib import Path


STOP_WORDS = {
    "a", "ai", "au", "aux", "avec", "ce", "ces", "cette", "de", "des",
    "du", "elle", "en", "est", "et", "il", "je", "la", "le", "les",
    "mais", "me", "mon", "ne", "nous", "on", "ou", "par", "pas", "pour",
    "que", "quel", "quelle", "quels", "quelles", "qui", "quoi", "se", "son",
    "sur", "tu", "un", "une", "vous", "y", "bonjour", "bonsoir", "salut",
}

DOMAIN_WORDS = {
    "admission", "admissions", "campus", "campushub", "candidature", "candidatures",
    "ecole", "ecoles", "etablissement", "etablissements", "etudiant", "etudiants",
    "faculte", "facultes", "filiere", "filieres", "formation", "formations",
    "inscription", "inscriptions", "institut", "instituts", "orientation",
    "partenaire", "partenaires", "province", "universite", "universites",
}

COMMON_TERM_ALIASES = {
    "combien": "prix",
    "cout": "prix",
    "coute": "prix",
    "couter": "prix",
    "tarif": "prix",
    "unniversite": "universite",
    "unniversites": "universites",
    "universit": "universite",
    "etablisssement": "etablissement",
    "etablisssements": "etablissements",
    "etudient": "etudiant",
    "etudients": "etudiants",
    "inscripton": "inscription",
    "confirmatoin": "confirmation",
    "notifcation": "notification",
    "publicaton": "publication",
    "orientatoin": "orientation",
    "campushubb": "campushub",
    "coment": "comment",
    "pourqoui": "pourquoi",
    "qeuls": "quels",
    "qeulles": "quelles",
}


def _normalise(text: str) -> str:
    text = unicodedata.normalize("NFKD", text.casefold())
    return "".join(char for char in text if not unicodedata.combining(char))


def _terms(text: str) -> list[str]:
    return [
        word for word in re.findall(r"[a-z0-9]{2,}", _normalise(text))
        if word not in STOP_WORDS
    ]


def _reduce_repeated_letters(word: str) -> str:
    """Ramène trois lettres identiques ou plus à deux lettres.

    Cette correction légère suffit pour des saisies fréquentes comme
    ``établisssements`` sans déformer les mots correctement orthographiés.
    """
    return re.sub(r"(.)\1{2,}", r"\1\1", word)


class LocalResponseEngine:
    """Recherche une réponse pertinente dans le corpus d'entraînement."""

    def __init__(self, data_path: str | Path = "data/training_data.txt"):
        self.data_path = Path(data_path)
        self.faqs: list[tuple[str, str]] = []
        self.passages: list[str] = []
        self._documents: list[tuple[str, Counter[str]]] = []
        self._idf: dict[str, float] = {}
        self._vocabulary: set[str] = set(DOMAIN_WORDS)
        self.reload()

    def reload(self) -> None:
        self.faqs = []
        self.passages = []
        if not self.data_path.exists():
            return

        text = self.data_path.read_text(encoding="utf-8")
        self.faqs = [
            (question.strip(), answer.strip())
            for question, answer in re.findall(
                r"(?ms)^Q:\s*(.+?)\s*^R:\s*(.+?)(?=\n\s*\n|\nQ:|\Z)", text
            )
        ]

        seen = set()
        for passage in re.split(r"\n\s*\n", text):
            passage = re.sub(r"\s+", " ", passage).strip()
            if len(passage) < 80 or passage.startswith(("Q:", "R:", "---", "(")):
                continue
            key = _normalise(passage)
            if key not in seen:
                seen.add(key)
                self.passages.append(passage)

        # Pour une FAQ, le classement porte sur la question. Inclure toute la
        # réponse favoriserait artificiellement les mots génériques comme
        # « établissement vérifié » au détriment de l'intention utilisateur.
        texts = [question for question, _ in self.faqs] + self.passages
        self._documents = [(text, Counter(_terms(text))) for text in texts]
        document_frequency = Counter()
        for _, terms in self._documents:
            document_frequency.update(terms.keys())
        count = max(1, len(self._documents))
        self._idf = {
            term: math.log((count + 1) / (frequency + 1)) + 1
            for term, frequency in document_frequency.items()
        }
        self._vocabulary = set(DOMAIN_WORDS)
        self._vocabulary.update(document_frequency.keys())

    @property
    def document_count(self) -> int:
        return len(self._documents)

    def _score(self, query: Counter[str], document: Counter[str]) -> float:
        common = query.keys() & document.keys()
        if not common:
            return 0.0
        numerator = sum(query[t] * document[t] * self._idf.get(t, 1) ** 2 for t in common)
        query_norm = math.sqrt(sum((v * self._idf.get(t, 1)) ** 2 for t, v in query.items()))
        doc_norm = math.sqrt(sum((v * self._idf.get(t, 1)) ** 2 for t, v in document.items()))
        return numerator / (query_norm * doc_norm) if query_norm and doc_norm else 0.0

    def _corrected_terms(self, text: str) -> list[str]:
        corrected = []
        for original in _terms(text):
            word = _reduce_repeated_letters(original)
            word = COMMON_TERM_ALIASES.get(word, word)
            if word in self._vocabulary or len(word) < 4:
                corrected.append(word)
                continue
            threshold = 0.76 if len(word) >= 7 else 0.84
            matches = get_close_matches(word, self._vocabulary, n=1, cutoff=threshold)
            corrected.append(matches[0] if matches else word)
        return corrected

    @staticmethod
    def _conversation_reply(normalised: str) -> str | None:
        compact = re.sub(r"[^a-z0-9' ]+", " ", normalised)
        compact = re.sub(r"\s+", " ", compact).strip()

        if re.search(r"\b(suicide|me suicider|en finir|plus envie de vivre|me faire du mal)\b", compact):
            return (
                "Je suis vraiment désolé que vous traversiez cela. Votre sécurité compte plus que cette conversation. "
                "Restez si possible avec une personne de confiance et contactez immédiatement un proche, un professionnel "
                "de santé ou les urgences de votre région. Si le danger est immédiat, ne restez pas seul. Je peux rester "
                "avec vous pendant que vous cherchez cette aide, mais je ne remplace pas un professionnel."
            )
        if re.search(
            r"\b(tu ne sers a rien|tu sers a rien|inutile|tu es nul|t'es nul|stupide|idiot|"
            r"mauvais assistant|mauvaise reponse|n'importe quoi)\b",
            compact,
        ):
            return (
                "Je comprends que ma réponse vous ait déçu, et je suis désolé de ne pas avoir été utile. "
                "Dites-moi simplement ce qui était incorrect ou ce que vous attendiez : je vais reprendre calmement, "
                "avec une réponse plus précise et des sources lorsque c’est nécessaire."
            )
        if re.search(r"\b(je suis perdu|je ne comprends rien|je suis bloque|j'abandonne|decourage|frustre|enerve)\b", compact):
            return (
                "Je comprends, cela peut être frustrant. Prenons une seule étape à la fois. "
                "Expliquez-moi où vous êtes bloqué ou indiquez votre objectif, et je vous proposerai une démarche courte et claire."
            )
        if re.search(r"\b(je suis stresse|j'ai peur|je suis inquiet|angoisse|anxieux|triste)\b", compact):
            return (
                "Je suis désolé que vous vous sentiez ainsi. Nous pouvons avancer doucement, sans jugement. "
                "Si votre inquiétude concerne les études ou l’orientation, dites-moi ce qui vous préoccupe le plus et "
                "je vous aiderai à transformer cela en prochaines étapes concrètes."
            )
        if re.search(r"\b(je suis content|je suis heureux|bonne nouvelle|j'ai reussi|j'ai ete admis)\b", compact):
            return (
                "C’est une excellente nouvelle, félicitations ! Je suis heureux de la partager avec vous. "
                "Souhaitez-vous préparer la prochaine étape, par exemple l’inscription, les documents ou le choix de la formation ?"
            )
        if re.search(r"\b(ca va|comment vas tu|comment allez vous|tu vas bien)\b", compact):
            return (
                "Ça va très bien, merci ! Je suis prêt à vous aider avec CampusHub, "
                "une formation, un établissement, une admission ou une question générale."
            )
        if re.fullmatch(r"(bonjour|bonsoir|salut|hello|hey)( a toi)?", compact):
            return "Bonjour ! Comment puis-je vous aider aujourd’hui ?"
        if re.search(r"\b(merci|merci beaucoup|c'est gentil)\b", compact) and len(compact.split()) <= 5:
            return "Avec plaisir ! Si vous avez une autre question, je suis là."
        if re.search(r"\b(au revoir|a bientot|bye|bonne journee|bonne soiree)\b", compact):
            return "Au revoir ! Revenez quand vous voulez, CampusHubIA reste disponible."
        if re.search(r"\b(qui es tu|quel est ton nom|comment tu t'appelles|tu es qui)\b", compact):
            return (
                "Je suis CampusHubIA, l’assistant de CampusHub. Je combine le corpus du projet, "
                "les données vérifiées de la plateforme et, lorsque c’est nécessaire, des sources web affichées."
            )
        if re.search(r"\b(que peux tu faire|aide moi|comment peux tu m'aider|tes fonctions)\b", compact):
            return (
                "Je peux expliquer CampusHub, rechercher des établissements et des formations, "
                "clarifier les admissions, aider à l’orientation et répondre à des questions générales "
                "en indiquant mes sources."
            )
        if re.fullmatch(r"(ok|okay|d'accord|compris|parfait|super)", compact):
            return "Parfait. Quelle est la prochaine information que vous souhaitez ?"
        name_match = re.search(r"\bje m'appelle\s+([a-z][a-z'-]{1,30})", compact)
        if name_match:
            name = name_match.group(1).capitalize()
            return f"Enchanté, {name} ! Que souhaitez-vous découvrir sur CampusHub ?"
        return None

    def answer(
        self,
        message: str,
        extra_documents: list[str] | None = None,
    ) -> tuple[str, str, float]:
        clean_message = re.sub(r"\s+", " ", message).strip()
        normalised = _normalise(clean_message)
        if not clean_message:
            return "Écrivez une question pour que je puisse vous répondre.", "validation", 1.0
        conversation_reply = self._conversation_reply(normalised)
        if conversation_reply:
            return conversation_reply, "conversation", 1.0

        query = Counter(self._corrected_terms(clean_message))
        documents = list(self._documents)
        for document in extra_documents or []:
            clean_document = re.sub(r"\s+", " ", str(document)).strip()
            if clean_document:
                documents.append((clean_document, Counter(_terms(clean_document))))

        if not query or not documents:
            return self._fallback(), "fallback", 0.0

        scored = []
        for index, (text, document_terms) in enumerate(documents):
            score = self._score(query, document_terms)
            if index >= len(self._documents):
                coverage = len(query.keys() & document_terms.keys()) / max(1, len(query))
                score = max(score, coverage * 0.55)
            scored.append((score, index, text))
        score, index, text = max(scored)
        faq_count = len(self.faqs)

        if score >= 0.18 and index < faq_count:
            return self.faqs[index][1], "knowledge_base", score
        if score >= 0.18 and index >= len(self._documents):
            return text, "live_context", score
        if score >= 0.24:
            return text, "knowledge_base", score
        return self._fallback(), "fallback", score

    def _fallback(self) -> str:
        return (
            "Je n’ai pas trouvé une réponse suffisamment fiable pour cette question. "
            "Vous pouvez la reformuler avec un sujet, une ville ou un établissement précis."
        )
