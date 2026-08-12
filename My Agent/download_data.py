"""
Script de téléchargement de données d'entraînement depuis Wikipedia.
Récupère des articles en français pour constituer un corpus d'entraînement.
"""
import requests
import re
import os
import sys
import io
import time
import random

# Fix encodage Windows
if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Sujets variés pour avoir un corpus diversifié
TOPICS = [
    # Science & Technologie
    "Intelligence artificielle", "Informatique quantique", "Réseau de neurones artificiels",
    "Apprentissage automatique", "Internet", "Algorithme", "Programmation informatique",
    "Robotique", "Nanotechnologie", "Biotechnologie", "Énergie solaire",
    "Physique quantique", "Théorie de la relativité", "ADN", "Génétique",
    "Astronomie", "Trou noir", "Big Bang", "Système solaire", "Exoplanète",
    "Mathématiques", "Statistique", "Cryptographie",

    # Histoire
    "Révolution française", "Seconde Guerre mondiale", "Première Guerre mondiale",
    "Empire romain", "Civilisation égyptienne", "Renaissance (période historique)",
    "Moyen Âge", "Guerre froide", "Décolonisation", "Révolution industrielle",
    "Napoléon Ier", "Jules César", "Cléopâtre VII", "Alexandre le Grand",

    # Philosophie & Pensée
    "Philosophie", "Socrate", "Platon", "Aristote", "René Descartes",
    "Jean-Jacques Rousseau", "Voltaire", "Existentialisme", "Stoïcisme",
    "Éthique", "Logique", "Conscience (philosophie)",

    # Nature & Environnement
    "Changement climatique", "Biodiversité", "Forêt amazonienne",
    "Océan", "Écosystème", "Photosynthèse", "Évolution (biologie)",
    "Mammifère", "Insecte", "Cellule (biologie)", "Écologie",

    # Culture & Arts
    "Littérature française", "Musique classique", "Cinéma français",
    "Peinture", "Architecture", "Sculpture", "Photographie",
    "Victor Hugo", "Albert Camus", "Molière",

    # Géographie
    "France", "Paris", "Europe", "Afrique", "Asie",
    "Amérique du Sud", "Antarctique", "Océan Pacifique",
    "Montagne", "Volcan", "Désert du Sahara",

    # Société
    "Démocratie", "Droits de l'homme", "Éducation", "Médecine",
    "Psychologie", "Sociologie", "Économie", "Mondialisation",
    "Langue française", "Culture", "Sport", "Football",

    # Alimentation
    "Gastronomie française", "Vin", "Fromage", "Agriculture",
    "Nutrition", "Cuisine",

    # Sciences humaines
    "Anthropologie", "Archéologie", "Linguistique", "Histoire de l'art",
]

# Paires Q/R pour le format conversationnel
QA_TEMPLATES = [
    ("Q: Qu'est-ce que {topic} ?\nR: ", "summary"),
    ("Q: Pouvez-vous expliquer {topic} ?\nR: ", "summary"),
    ("Q: Parlez-moi de {topic}.\nR: ", "summary"),
    ("Q: Quelle est l'importance de {topic} ?\nR: ", "summary"),
]


def get_wikipedia_article(title, lang='fr'):
    """
    Récupère le contenu textuel d'un article Wikipedia.

    Args:
        title: Titre de l'article.
        lang: Langue de Wikipedia.

    Returns:
        str: Le contenu textuel nettoyé de l'article.
    """
    url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{requests.utils.quote(title)}"

    try:
        response = requests.get(url, headers={'User-Agent': 'MiniGPT-Training/1.0'}, timeout=10)
        if response.status_code == 200:
            data = response.json()
            extract = data.get('extract', '')
            return extract
    except Exception:
        pass

    return ""


def get_wikipedia_full_article(title, lang='fr'):
    """
    Récupère le contenu complet d'un article Wikipedia via l'API MediaWiki.

    Args:
        title: Titre de l'article.
        lang: Langue.

    Returns:
        str: Texte complet nettoyé.
    """
    url = f"https://{lang}.wikipedia.org/w/api.php"
    params = {
        'action': 'query',
        'titles': title,
        'prop': 'extracts',
        'explaintext': True,
        'exsectionformat': 'plain',
        'format': 'json',
    }

    try:
        response = requests.get(url, params=params,
                              headers={'User-Agent': 'MiniGPT-Training/1.0'},
                              timeout=15)
        if response.status_code == 200:
            data = response.json()
            pages = data.get('query', {}).get('pages', {})
            for page_id, page_data in pages.items():
                if page_id != '-1':
                    return page_data.get('extract', '')
    except Exception:
        pass

    return ""


def clean_text(text):
    """
    Nettoie le texte récupéré de Wikipedia.

    Args:
        text: Texte brut.

    Returns:
        str: Texte nettoyé.
    """
    # Supprimer les sections "Voir aussi", "Références", "Liens externes", "Notes"
    sections_to_remove = [
        r'== Voir aussi ==.*',
        r'== Références ==.*',
        r'== Liens externes ==.*',
        r'== Notes et références ==.*',
        r'== Notes ==.*',
        r'== Bibliographie ==.*',
        r'== Annexes ==.*',
    ]
    for pattern in sections_to_remove:
        text = re.split(pattern, text, flags=re.DOTALL)[0]

    # Supprimer les titres de section (== ... ==)
    text = re.sub(r'={2,}\s*[^=]+\s*={2,}', '\n', text)

    # Supprimer les lignes vides multiples
    text = re.sub(r'\n{3,}', '\n\n', text)

    # Supprimer les espaces multiples
    text = re.sub(r' {2,}', ' ', text)

    # Supprimer les caractères spéciaux Wikipedia
    text = re.sub(r'\[\d+\]', '', text)  # Références [1], [2]...

    return text.strip()


def generate_qa_pairs(topic, summary):
    """
    Génère des paires question/réponse à partir d'un résumé.

    Args:
        topic: Le sujet.
        summary: Le résumé Wikipedia.

    Returns:
        str: Texte formaté en Q/R.
    """
    if not summary or len(summary) < 50:
        return ""

    qa_text = ""
    # Choisir 1-2 templates aléatoires
    templates = random.sample(QA_TEMPLATES, min(2, len(QA_TEMPLATES)))

    for template, _ in templates:
        question = template.format(topic=topic)
        # Utiliser le résumé comme réponse
        answer = summary.split('.')[0:3]  # Prendre les 3 premières phrases
        answer_text = '. '.join(answer).strip()
        if answer_text and not answer_text.endswith('.'):
            answer_text += '.'
        qa_text += f"{question}{answer_text}\n\n"

    return qa_text


def main():
    """Fonction principale de téléchargement."""
    print("=" * 60)
    print("  Telechargement des donnees d'entrainement Wikipedia")
    print("=" * 60)

    os.makedirs('data', exist_ok=True)

    all_text = ""
    qa_text = ""
    success_count = 0
    total = len(TOPICS)

    for i, topic in enumerate(TOPICS):
        progress = f"[{i+1}/{total}]"
        print(f"{progress} Telechargement: {topic}...", end=" ")

        # Récupérer l'article complet
        full_text = get_wikipedia_full_article(topic)
        summary = get_wikipedia_article(topic)

        if full_text:
            cleaned = clean_text(full_text)
            if len(cleaned) > 100:
                all_text += cleaned + "\n\n---\n\n"
                success_count += 1
                print(f"OK ({len(cleaned):,} caracteres)")

                # Générer des Q/R
                if summary:
                    qa = generate_qa_pairs(topic, summary)
                    if qa:
                        qa_text += qa
            else:
                print("Trop court, ignore.")
        else:
            print("Echec.")

        # Pause pour ne pas surcharger l'API
        time.sleep(0.3)

    # Assembler le dataset final
    final_text = ""

    # Ajouter le texte principal
    final_text += all_text

    # Ajouter les paires Q/R
    if qa_text:
        final_text += "\n\n---\n\n"
        final_text += qa_text

    # Ajouter le contenu existant si présent
    existing_path = "data/training_data.txt"
    if os.path.exists(existing_path):
        with open(existing_path, 'r', encoding='utf-8') as f:
            existing = f.read()
        if existing.strip():
            final_text += "\n\n---\n\n" + existing

    # Sauvegarder
    output_path = "data/training_data.txt"
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(final_text)

    size_kb = len(final_text.encode('utf-8')) / 1024
    size_mb = size_kb / 1024

    print("\n" + "=" * 60)
    print(f"  Terminé!")
    print(f"  Articles telecharges: {success_count}/{total}")
    print(f"  Taille du dataset: {size_mb:.2f} Mo ({size_kb:.0f} Ko)")
    print(f"  Caracteres: {len(final_text):,}")
    print(f"  Sauvegarde dans: {output_path}")
    print("=" * 60)


if __name__ == '__main__':
    main()
