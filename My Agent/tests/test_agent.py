import os
import tempfile
import unittest
from pathlib import Path

from campushub_agent import CampusHubAgent


class CampusHubAgentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        knowledge = Path(self.temp.name) / "knowledge.txt"
        knowledge.write_text(
            "Q: Qu’est-ce que CampusHub ?\nR: CampusHub relie les étudiants aux établissements vérifiés.\n",
            encoding="utf-8",
        )
        self.agent = CampusHubAgent(knowledge)

    def tearDown(self):
        self.temp.cleanup()

    def test_orientation_uses_verified_context(self):
        result = self.agent.respond("Où étudier l’informatique ?", "ORIENTATION", {
            "objectif": "Étudier l’informatique",
            "recommandations": [{
                "code_filiere": "FIL001",
                "nom_filiere": "Informatique de gestion",
                "nom_universite": "Institut Test",
                "ville": "Goma",
                "province": "Nord-Kivu",
                "frais_minimum": 400,
                "devise": "USD",
                "score_compatibilite": 91,
                "raisons": ["Correspond à votre domaine"],
            }],
        })
        self.assertIn("Institut Test", result.response)
        self.assertIn("400 USD", result.response)
        self.assertEqual(result.source, "live_context")

    def test_copilot_never_invents_missing_admissions(self):
        result = self.agent.respond("Crée un guide", "COPILOTE_INSTITUTION", {
            "universite": {"code_universite": "UNI001", "nom": "Université Test"},
            "conditions": [],
            "demande": {"type": "ADMISSION", "demande": "Guide", "publicCible": "candidats"},
        })
        self.assertIn("Aucune condition", result.response)

    def test_general_question_prefers_platform_faq(self):
        result = self.agent.respond("Qu’est-ce que CampusHub ?")
        self.assertIn("établissements vérifiés", result.response)
        self.assertEqual(result.source, "knowledge_base")

    def test_small_talk_is_natural(self):
        result = self.agent.respond("Salut, ça va ?")
        self.assertIn("très bien", result.response)
        self.assertEqual(result.source, "conversation")

    def test_typo_is_corrected_before_retrieval(self):
        result = self.agent.respond("Qu’est-ce que CampusHub pour les établisssements ?")
        self.assertIn("établissements vérifiés", result.response)
        self.assertEqual(result.source, "knowledge_base")

    def test_general_chat_remembers_the_name_from_history(self):
        result = self.agent.respond("Quel est mon nom ?", context={
            "historique": [{"role": "UTILISATEUR", "contenu": "Je m’appelle Sage"}],
        })
        self.assertIn("Sage", result.response)
        self.assertEqual(result.source, "conversation_memory")


if __name__ == "__main__":
    unittest.main()
