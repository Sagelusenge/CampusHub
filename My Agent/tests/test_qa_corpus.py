import re
import unittest
from pathlib import Path

from generate_qa_corpus import generate_pairs


class TrainingCorpusTests(unittest.TestCase):
    def test_generator_produces_exactly_8000_unique_pairs(self):
        pairs = generate_pairs()
        self.assertEqual(len(pairs), 8000)
        self.assertEqual(len({question.casefold() for question, _ in pairs}), 8000)
        self.assertTrue(all(question.strip() and answer.strip() for question, answer in pairs))

    def test_committed_corpus_contains_8000_pairs(self):
        path = Path(__file__).resolve().parents[1] / "data" / "campushub_qa_8000.txt"
        pairs = re.findall(
            r"(?ms)^Q:\s*(.+?)\s*^R:\s*(.+?)(?=\n\s*\n|\nQ:|\Z)",
            path.read_text(encoding="utf-8"),
        )
        self.assertEqual(len(pairs), 8000)


if __name__ == "__main__":
    unittest.main()
