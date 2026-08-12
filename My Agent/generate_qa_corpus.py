"""Génère le corpus supervisé de 2 000 questions-réponses CampusHubIA.

Le fichier produit est déterministe et peut être régénéré après une modification
des intentions métier. Les variantes comprennent des formulations courantes et
quelques fautes de frappe réalistes afin d'améliorer la tolérance du moteur.
"""

from __future__ import annotations

import argparse
import re
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_OUTPUT = BASE_DIR / "data" / "campushub_qa_2000.txt"


FAQS: list[tuple[str, str]] = [
    (
        "Qu'est-ce que CampusHub ?",
        "CampusHub est une plateforme d'orientation et de vie académique qui relie les visiteurs, les étudiants, les établissements vérifiés et l'administration autour d'informations fiables, d'admissions, d'offres et d'un réseau éducatif.",
    ),
    (
        "Quels sont les principaux utilisateurs de CampusHub ?",
        "CampusHub distingue quatre acteurs principaux : le visiteur, l'étudiant, le gestionnaire d'un établissement et l'administrateur de la plateforme. Chaque rôle possède des droits et un espace adaptés.",
    ),
    (
        "Un visiteur peut-il créer un compte ?",
        "Oui. Un visiteur peut créer un compte, confirmer son adresse e-mail puis accéder à son espace visiteur pour consulter le réseau, les établissements, les offres, le contact et l'aide.",
    ),
    (
        "Un visiteur peut-il publier une photo, une vidéo ou une story ?",
        "Le visiteur est en mode découverte : il peut consulter les contenus autorisés, mais il ne peut ni publier, ni créer une story. Ces actions sont réservées aux étudiants et aux établissements.",
    ),
    (
        "À quoi sert l'espace étudiant ?",
        "L'espace étudiant permet de gérer son profil, demander une affiliation à un établissement, recevoir des recommandations d'orientation, consulter les offres, rejoindre le réseau et suivre ses démarches académiques.",
    ),
    (
        "À quoi sert l'espace établissement ?",
        "L'espace établissement permet de gérer la fiche publique, les campus, facultés, filières, services, infrastructures, partenaires, offres, admissions, étudiants, publications, rapports et abonnement annuel.",
    ),
    (
        "Quel est le rôle de l'administrateur CampusHub ?",
        "L'administrateur contrôle les demandes d'établissements, les utilisateurs, la modération, les abonnements, les paiements, les messages de contact, les rapports et le journal d'audit.",
    ),
    (
        "Comment créer un compte étudiant ?",
        "Ouvrez la création de compte, choisissez le profil étudiant, renseignez vos informations, votre matricule, votre localisation et votre établissement, puis confirmez le code reçu par e-mail.",
    ),
    (
        "Le matricule est-il obligatoire pour un étudiant ?",
        "Oui. Le matricule étudiant est obligatoire lors de la création du compte, car il aide l'établissement choisi à vérifier l'identité académique de la personne.",
    ),
    (
        "Pourquoi faut-il confirmer son adresse e-mail ?",
        "La confirmation par code OTP vérifie que l'adresse appartient bien à l'utilisateur. Après une validation réussie, CampusHub connecte l'utilisateur et le redirige directement vers son espace.",
    ),
    (
        "Que faire si le code de confirmation n'arrive pas ?",
        "Vérifiez l'adresse saisie, le dossier des courriers indésirables et attendez quelques instants. Utilisez ensuite le bouton de renvoi du code ; ne communiquez jamais ce code à une autre personne.",
    ),
    (
        "Où arrive-t-on après la connexion ?",
        "Après la connexion, CampusHub détecte le rôle et redirige directement vers l'espace correspondant : étudiant, visiteur, établissement ou administration.",
    ),
    (
        "Comment changer sa photo de profil ?",
        "Ouvrez Profil et paramètres, choisissez la modification de la photo, sélectionnez une image depuis votre appareil puis enregistrez. Le fichier doit respecter les formats et la taille indiqués.",
    ),
    (
        "Un établissement peut-il changer sa photo de couverture ?",
        "Oui. Le gestionnaire peut charger une photo de couverture et une photo de profil depuis la fiche ou les paramètres de son établissement. Ces images apparaissent ensuite sur la fiche publique.",
    ),
    (
        "Comment choisir un pays, une province et une ville ?",
        "Le pays est choisi dans une liste, puis CampusHub affiche les provinces correspondantes et enfin les villes connues de la province. La République démocratique du Congo peut être proposée par défaut.",
    ),
    (
        "Que faire si ma ville n'est pas proposée ?",
        "Utilisez le signalement prévu sous le sélecteur de ville. La demande est transmise à l'administration, qui pourra vérifier et ajouter la localisation sans accepter une valeur incohérente.",
    ),
    (
        "Comment un étudiant rejoint-il son établissement ?",
        "L'étudiant choisit son établissement et sa filière, fournit son matricule puis envoie une demande d'affiliation. Le gestionnaire de l'établissement doit ensuite accepter ou refuser la demande.",
    ),
    (
        "Pourquoi l'établissement doit-il confirmer un étudiant ?",
        "La confirmation protège les profils académiques contre les fausses affiliations. Seul l'établissement peut attester que le matricule et les informations correspondent à un étudiant réellement inscrit.",
    ),
    (
        "Que se passe-t-il si une demande d'affiliation est refusée ?",
        "L'étudiant conserve son compte, mais il n'est pas affiché comme membre confirmé de l'établissement. Il peut consulter le motif, corriger ses informations et envoyer une nouvelle demande si cela est permis.",
    ),
    (
        "Comment une université gère-t-elle ses étudiants ?",
        "Le gestionnaire utilise la rubrique des étudiants pour rechercher, filtrer et consulter les profils affiliés. Selon la situation, il peut confirmer, suspendre, bloquer ou retirer une affiliation avec un motif.",
    ),
    (
        "Quelle est la différence entre suspendre et bloquer un étudiant ?",
        "Une suspension est généralement temporaire et peut avoir une date de fin. Un blocage limite l'accès institutionnel jusqu'à une décision du gestionnaire. Chaque action doit être motivée et enregistrée dans l'audit.",
    ),
    (
        "Le badge vérifié est-il acheté par l'établissement ?",
        "Non. La vérification est une décision de l'administration après contrôle du dossier de l'établissement. Elle est distincte de l'abonnement annuel et ne doit pas être vendue comme une certification payante.",
    ),
    (
        "Comment reconnaître un établissement vérifié ?",
        "La fiche et la carte de l'établissement affichent son statut vérifié. Il faut néanmoins consulter la fiche pour confirmer ses coordonnées, ses formations actives et ses conditions d'admission.",
    ),
    (
        "Que contient la fiche publique d'un établissement ?",
        "Elle peut présenter la couverture, le logo, la description, la catégorie, la localisation, les campus, facultés, filières, services, infrastructures, partenaires, offres et statistiques autorisées.",
    ),
    (
        "Comment voir un établissement sur la carte ?",
        "Ouvrez sa fiche puis la section de localisation. CampusHub utilise les coordonnées enregistrées pour afficher une carte ; si elles sont absentes, contactez l'établissement ou l'administration.",
    ),
    (
        "Comment filtrer les établissements ?",
        "Utilisez les filtres de catégorie, pays, province, ville, campus, domaine ou niveau. La pagination permet ensuite d'afficher un nombre limité de résultats par page.",
    ),
    (
        "Peut-on comparer une université avec une école secondaire ?",
        "Non. Choisissez d'abord le type d'établissement. CampusHub compare les universités entre elles ou les écoles secondaires entre elles afin de conserver des critères cohérents.",
    ),
    (
        "Quels critères utiliser pour comparer des formations ?",
        "Comparez le domaine, la filière, le niveau, la durée, la localisation, les frais disponibles, les conditions d'admission, les infrastructures et les services proposés.",
    ),
    (
        "Quelle est la différence entre campus, faculté et filière ?",
        "Un campus est un site géographique, une faculté regroupe des domaines académiques et une filière correspond à un parcours de formation précis rattaché à une faculté ou une structure.",
    ),
    (
        "Où voir les partenaires d'une université ?",
        "Les partenaires actifs peuvent être affichés sur la fiche publique de l'université. Ils aident les candidats à comprendre les collaborations académiques, professionnelles ou institutionnelles déclarées.",
    ),
    (
        "Comment une université ajoute-t-elle un partenaire ?",
        "Le gestionnaire ouvre la rubrique Partenaires, renseigne le nom, le type, la description, le site et le logo éventuel, puis enregistre. Seuls les partenaires actifs sont présentés publiquement.",
    ),
    (
        "Quels types d'offres trouve-t-on sur CampusHub ?",
        "Les établissements peuvent publier des offres d'inscription, de bourse, de formation, de stage, d'emploi, d'événement ou une autre annonce académique autorisée.",
    ),
    (
        "Comment lire et télécharger le PDF d'une offre ?",
        "La carte affiche d'abord un aperçu limité, généralement la première page. Ouvrez le document pour parcourir les autres pages ou utilisez le bouton de téléchargement si l'établissement l'autorise.",
    ),
    (
        "Que deviennent les offres expirées ?",
        "Les offres dont la date limite est dépassée sont automatiquement masquées de la liste publique active. Le gestionnaire peut toujours les retrouver dans son historique selon ses droits.",
    ),
    (
        "Comment s'inscrire en ligne dans une université ?",
        "Ouvrez la fiche de l'université ou son offre d'admission, choisissez le formulaire public actif, complétez les champs et documents demandés puis envoyez la candidature.",
    ),
    (
        "Une université peut-elle créer son propre formulaire d'admission ?",
        "Oui. Elle définit le titre, les instructions, la date de clôture et les champs requis, par exemple le nom, la naissance, le téléphone, la formation souhaitée et les pièces justificatives.",
    ),
    (
        "Comment envoyer une candidature en ligne ?",
        "Remplissez tous les champs obligatoires, vérifiez les pièces jointes et acceptez les déclarations demandées avant l'envoi. Une confirmation est affichée lorsque le dossier a bien été enregistré.",
    ),
    (
        "Comment suivre une candidature envoyée ?",
        "Connectez-vous à votre espace puis ouvrez la rubrique des inscriptions ou candidatures. Le statut indique si le dossier est reçu, en cours d'étude, accepté, refusé ou s'il exige un complément.",
    ),
    (
        "Comment fonctionne l'orientation des finalistes ?",
        "Le finaliste indique son option, son pourcentage, ses centres d'intérêt, son budget et sa localisation. CampusHubIA rapproche ces critères des formations actives des établissements vérifiés.",
    ),
    (
        "Quels critères CampusHubIA utilise-t-il pour orienter un étudiant ?",
        "Le conseiller examine notamment le parcours scolaire, le résultat obtenu, les domaines souhaités, le niveau visé, la localisation, le budget et les conditions d'admission disponibles.",
    ),
    (
        "Une recommandation de CampusHubIA garantit-elle l'admission ?",
        "Non. La recommandation aide à explorer et comparer. L'établissement reste seul responsable de ses conditions, de l'étude du dossier et de la décision officielle d'admission.",
    ),
    (
        "Qui peut accéder au réseau CampusHub ?",
        "Les visiteurs inscrits, les étudiants, les gestionnaires d'établissements et les administrateurs peuvent accéder au réseau avec des droits différents selon leur rôle.",
    ),
    (
        "Que peut faire un visiteur dans le réseau social ?",
        "Le visiteur peut découvrir les publications autorisées, rechercher des établissements et consulter les offres. Il ne peut pas publier de contenu ni ajouter une story.",
    ),
    (
        "Comment un étudiant publie-t-il sur le réseau ?",
        "Depuis le fil d'actualité, l'étudiant utilise la zone de création, rédige son texte, ajoute éventuellement un média et choisit un type autorisé avant de publier.",
    ),
    (
        "Comment un établissement publie-t-il une actualité ?",
        "Le gestionnaire ouvre le réseau ou la rubrique Publications, prépare le contenu, ajoute une image ou une vidéo et publie selon les règles de modération de CampusHub.",
    ),
    (
        "Peut-on publier des photos et des vidéos ?",
        "Oui, les étudiants et établissements autorisés peuvent joindre des photos ou des vidéos en respectant les formats, tailles, droits d'auteur et règles de modération affichés.",
    ),
    (
        "Qui peut créer une story ?",
        "Les stories sont réservées aux étudiants et aux établissements autorisés. Les visiteurs peuvent uniquement consulter les stories qui leur sont rendues visibles.",
    ),
    (
        "Peut-on répondre à un commentaire ?",
        "Oui. Les commentaires peuvent recevoir des réponses afin de créer une discussion structurée. Chaque contribution reste soumise aux règles de respect et de modération.",
    ),
    (
        "Comment fonctionnent les mentions J'aime et les abonnements ?",
        "Un utilisateur autorisé peut aimer un contenu et suivre un profil. Les compteurs d'abonnés, d'abonnements et de mentions J'aime sont ensuite affichés selon les paramètres de visibilité.",
    ),
    (
        "Comment republier une publication ou une offre ?",
        "Utilisez l'action Republier sur un contenu autorisé. CampusHub conserve le lien vers la publication ou l'offre d'origine afin d'identifier correctement sa source.",
    ),
    (
        "Comment envoyer une demande de relation ?",
        "Ouvrez la rubrique Relations, recherchez la personne avec les filtres disponibles puis envoyez une invitation. La relation devient active seulement après acceptation.",
    ),
    (
        "Peut-on envoyer un message sans être en relation ?",
        "Non. Une connexion acceptée est nécessaire avant de démarrer une conversation privée. Cette règle réduit les messages indésirables et protège les utilisateurs.",
    ),
    (
        "Quels fichiers peut-on joindre dans le chat ?",
        "Le chat peut accepter, selon la configuration, des photos, vidéos, documents et autres fichiers autorisés. L'utilisateur doit respecter la limite de taille et les formats de sécurité.",
    ),
    (
        "Comment savoir si une personne est en ligne ou écrit ?",
        "La conversation peut afficher un indicateur vert pour la présence en ligne et la mention en train d'écrire lorsque l'autre personne saisit activement un message.",
    ),
    (
        "Que signifient un trait, deux traits et deux traits bleus dans le chat ?",
        "Un trait indique l'envoi, deux traits indiquent la livraison et deux traits bleus indiquent la lecture, lorsque les confirmations de lecture sont disponibles.",
    ),
    (
        "Peut-on bloquer une personne ou envoyer un message éphémère ?",
        "Oui, les options de conversation peuvent permettre de bloquer une personne et d'utiliser des messages éphémères. Le blocage interrompt les nouveaux échanges jusqu'au déblocage.",
    ),
    (
        "Quand la cloche de notification affiche-t-elle un indicateur ?",
        "L'indicateur apparaît seulement lorsqu'il existe au moins une notification non lue. Après lecture ou marquage comme lu, il doit disparaître.",
    ),
    (
        "Comment activer les notifications push ?",
        "Ouvrez les paramètres de notifications, autorisez CampusHub dans le navigateur puis activez les catégories souhaitées. Le navigateur ou le système peut aussi exiger une autorisation séparée.",
    ),
    (
        "CampusHub envoie-t-il des notifications par e-mail ?",
        "Oui, certains événements importants peuvent générer un e-mail, par exemple la confirmation du compte, une décision sur une demande ou le suivi d'un message de contact.",
    ),
    (
        "Comment contacter l'administration de CampusHub ?",
        "Ouvrez Contact, renseignez votre nom, votre adresse e-mail, le sujet et un message précis puis envoyez. L'administration reçoit la demande et peut mettre à jour son état de traitement.",
    ),
    (
        "Les tableaux de bord utilisent-ils de vraies données ?",
        "Oui. Les indicateurs et graphiques doivent provenir de la base MySQL et respecter le rôle connecté. Ils ne doivent pas présenter des chiffres fictifs comme des données réelles.",
    ),
    (
        "Quels rapports sont disponibles pour l'administrateur ?",
        "L'administration peut produire des synthèses d'activité, contrats, factures, reçus, relevés de paiement par client ou globaux, abonnements, établissements, utilisateurs, modération et audit.",
    ),
    (
        "Quels rapports sont disponibles pour un établissement ?",
        "Un établissement peut produire des listes d'étudiants, états d'admission, factures, reçus, relevés de paiement, statistiques de publications, abonnements, offres et rapports de progression.",
    ),
    (
        "Quels rapports sont disponibles pour un étudiant ?",
        "Selon ses données et droits, l'étudiant peut imprimer des documents liés à son profil, ses demandes, son orientation, ses inscriptions et les confirmations rendues disponibles par l'établissement.",
    ),
    (
        "À quoi sert le journal d'audit ?",
        "Le journal d'audit conserve les actions importantes avec l'acteur, la date, l'entité et les changements utiles. Il facilite le contrôle, la recherche d'incidents et la traçabilité administrative.",
    ),
    (
        "Combien coûte l'abonnement annuel d'une université ou d'une école ?",
        "L'abonnement CampusHub est un abonnement annuel unique de 10 USD par établissement. Il n'inclut aucun badge certifié payant séparé.",
    ),
    (
        "Quels sont les avantages de l'abonnement annuel ?",
        "L'abonnement donne accès à la gestion de la fiche, des campus et formations, aux inscriptions et demandes étudiantes, aux publications et offres ainsi qu'aux statistiques, rapports et au support.",
    ),
    (
        "Quand le compte d'un établissement est-il activé ?",
        "L'administration vérifie d'abord la demande et le paiement annuel. L'activation dépend ensuite du statut du dossier et de l'abonnement enregistré dans CampusHub.",
    ),
    (
        "CampusHub prévient-il avant la fin d'un abonnement ?",
        "Oui. Le tableau de bord peut afficher un compte à rebours et des alertes lorsque la date de fin approche afin que l'établissement renouvelle son abonnement annuel.",
    ),
    (
        "Peut-on imprimer un contrat, une facture ou un reçu ?",
        "Oui. Les espaces autorisés peuvent générer des documents professionnels imprimables avec références, parties, clauses, montants, dates et informations de paiement disponibles.",
    ),
    (
        "Quelles langues sont proposées dans CampusHub ?",
        "CampusHub propose le français, l'anglais et l'espagnol. Les noms des langues restent écrits de façon stable dans le sélecteur pour être reconnaissables après un changement.",
    ),
    (
        "Pourquoi un chargement apparaît-il quand je change de langue ?",
        "Le chargement avec le logo indique que CampusHub applique les traductions de l'interface. Il disparaît dès que la nouvelle langue est prête.",
    ),
    (
        "Qu'est-ce que CampusHubIA ?",
        "CampusHubIA est l'assistant de CampusHub. Il combine un corpus local, les données publiques vérifiées de la plateforme et le contexte autorisé fourni par le backend pour répondre et orienter.",
    ),
    (
        "CampusHubIA peut-il utiliser des informations du web ?",
        "Pour une question générale et publique, le backend peut compléter la réponse avec des extraits de sources web publiques affichées dans le chat. Les données privées ne doivent jamais être envoyées à ces sources.",
    ),
    (
        "CampusHubIA comprend-il les fautes de frappe ?",
        "Le moteur normalise les accents, réduit certaines lettres répétées et recherche les termes proches. Il peut ainsi comprendre plusieurs fautes courantes, mais une reformulation claire reste parfois nécessaire.",
    ),
    (
        "Comment CampusHubIA protège-t-il les données personnelles ?",
        "Le corpus contient des informations publiques et documentaires. Les mots de passe, messages privés, codes OTP et données personnelles sensibles ne doivent jamais servir à l'entraînement.",
    ),
    (
        "Que fait CampusHubIA lorsqu'il n'est pas certain ?",
        "Il doit signaler qu'il ne dispose pas d'une réponse suffisamment fiable, demander une précision et inviter l'utilisateur à confirmer les conditions importantes auprès de l'établissement concerné.",
    ),
    (
        "Comment demander à CampusHubIA une recherche précise ?",
        "Indiquez le domaine, le niveau, la ville, le budget et éventuellement le nom de l'établissement. Plus les critères sont précis, plus la réponse peut sélectionner des données pertinentes.",
    ),
    (
        "Comment choisir un mot de passe sécurisé ?",
        "Utilisez un mot de passe long et unique combinant plusieurs types de caractères. Ne le partagez pas, ne le placez pas dans un message et évitez de le réutiliser sur un autre service.",
    ),
    (
        "Que faire sur un appareil partagé après avoir utilisé CampusHub ?",
        "Déconnectez-vous depuis la barre de navigation, fermez le navigateur et n'enregistrez pas le mot de passe sur l'appareil. Contactez le support si vous pensez qu'un tiers a accédé au compte.",
    ),
]


QUESTION_TEMPLATES = [
    "{question}",
    "Pouvez-vous m'expliquer ceci : {lower}",
    "J'aimerais savoir : {lower}",
    "Dites-moi, {lower}",
    "Je voudrais comprendre : {lower}",
    "Expliquez-moi clairement : {lower}",
    "Comment répondre à cette question : {lower}",
    "Aidez-moi à comprendre : {lower}",
    "Sur CampusHub, {lower}",
    "Dans l'application, {lower}",
    "Concernant CampusHub, {lower}",
    "Pourriez-vous préciser : {lower}",
    "Je cherche une information : {lower}",
    "J'ai une question : {lower}",
    "Pouvez-vous me renseigner : {lower}",
    "En pratique, {lower}",
    "Concrètement, {lower}",
    "Je ne comprends pas bien : {lower}",
    "Pouvez-vous me guider : {lower}",
    "Quelle est la règle pour ceci : {lower}",
    "Question d'un visiteur : {lower}",
    "Question d'un étudiant : {lower}",
    "Question d'un établissement : {lower}",
    "Avec quelques fautes, {typo}",
    "Recherche rapide CampusHubb : {typo}",
]


TYPO_REPLACEMENTS = (
    ("établissement", "etablisssement"),
    ("établissements", "etablisssements"),
    ("université", "unniversité"),
    ("étudiant", "etudient"),
    ("inscription", "inscripton"),
    ("confirmation", "confirmatoin"),
    ("notification", "notifcation"),
    ("publication", "publicaton"),
    ("orientation", "orientatoin"),
    ("CampusHub", "CampusHubb"),
    ("Comment", "Coment"),
    ("Pourquoi", "Pourqoui"),
    ("Quels", "Qeuls"),
    ("Quelles", "Qeulles"),
    ("Peut-on", "Peuton"),
)


def with_typo(question: str) -> str:
    for correct, typo in TYPO_REPLACEMENTS:
        if correct in question:
            return question.replace(correct, typo, 1)
        lower_correct = correct.casefold()
        if lower_correct in question.casefold():
            return re.sub(re.escape(correct), typo, question, count=1, flags=re.IGNORECASE)
    words = question.split()
    for index, word in enumerate(words):
        clean = re.sub(r"[^A-Za-zÀ-ÿ]", "", word)
        if len(clean) >= 7:
            middle = max(2, len(word) // 2)
            words[index] = word[:middle] + word[middle - 1] + word[middle:]
            return " ".join(words)
    return "svp " + question


def generate_pairs() -> list[tuple[str, str]]:
    if len(FAQS) != 80:
        raise ValueError(f"80 intentions sont requises, {len(FAQS)} trouvées.")
    if len(QUESTION_TEMPLATES) != 25:
        raise ValueError("25 variantes sont requises pour produire exactement 2 000 paires.")

    pairs: list[tuple[str, str]] = []
    for question, answer in FAQS:
        clean = question.rstrip(" ?")
        values = {
            "question": question,
            "lower": clean[:1].lower() + clean[1:] + " ?",
            "typo": with_typo(clean[:1].lower() + clean[1:]) + " ?",
        }
        for template in QUESTION_TEMPLATES:
            pairs.append((template.format(**values), answer))

    if len(pairs) != 2000:
        raise ValueError(f"2 000 paires attendues, {len(pairs)} générées.")
    questions = [question.casefold() for question, _ in pairs]
    if len(set(questions)) != len(questions):
        raise ValueError("Le corpus contient des questions dupliquées.")
    return pairs


def write_corpus(output: Path) -> None:
    pairs = generate_pairs()
    content = "\n\n".join(
        f"Q: {question}\nR: {answer}" for question, answer in pairs
    ) + "\n"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(content, encoding="utf-8")
    print(f"CampusHubIA : {len(pairs)} questions-réponses écrites dans {output}.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Génère 2 000 questions-réponses CampusHubIA")
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    args = parser.parse_args()
    write_corpus(Path(args.output))


if __name__ == "__main__":
    main()
