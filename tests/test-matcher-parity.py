import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

from matcher import match_transcript  # noqa: E402
from normalize import stem_word  # noqa: E402

FIXTURES = json.loads((ROOT / "tests" / "fixtures" / "match-cases.json").read_text(encoding="utf-8"))


def stemming_available() -> bool:
    return stem_word("evden") != "evden"


def words_from_text(text):
    return [{"word": w, "start": i, "end": i + 1} for i, w in enumerate(text.split())]


def make_test(case):
    def test(self):
        words = words_from_text(case["input"])
        timeline, matched_words, total_words = match_transcript(words, FIXTURES["vocabulary"])
        matched = [{"text": e["text"], "sign_id": e["sign_id"], "gloss": e["gloss"]} for e in timeline]
        expected = case["expected_python"]
        self.assertEqual(matched, expected["matched"])
        self.assertEqual(matched_words, expected["matched_words"])
        self.assertEqual(total_words, expected["total_words"])

    return test


class MatcherParityTest(unittest.TestCase):
    pass


for _case in FIXTURES["cases"]:
    _test = make_test(_case)
    if _case.get("requires_stemming") and not stemming_available():
        _test = unittest.skip("Zeyrek not installed/working: no stemming divergence to lock in")(_test)
    setattr(MatcherParityTest, f"test_{_case['name']}", _test)


if __name__ == "__main__":
    unittest.main()
