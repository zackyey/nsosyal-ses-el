import re

_WORD_CHARS = re.compile(r"[^\w]", re.UNICODE)

_analyzer = None
_analyzer_load_failed = False


def _get_analyzer():
    # Cached: building the Zeyrek analyzer is slow and matcher.py calls this per request.
    global _analyzer, _analyzer_load_failed
    if _analyzer is None and not _analyzer_load_failed:
        try:
            import zeyrek

            _analyzer = zeyrek.MorphAnalyzer()
        except Exception:
            _analyzer_load_failed = True
    return _analyzer


def turkish_lower(text: str) -> str:
    # Plain .lower() maps I -> i, but Turkish I/ı and İ/i are distinct pairs.
    text = text.replace("İ", "i").replace("I", "ı")
    return text.lower()


def normalize_word(word: str) -> str:
    word = turkish_lower(word.strip())
    word = _WORD_CHARS.sub("", word)
    return word


def normalize_phrase(phrase: str) -> str:
    return " ".join(normalize_word(w) for w in phrase.split() if normalize_word(w))


def stem_word(word: str) -> str:
    # Falls back to the word unchanged if Zeyrek isn't installed or can't
    # analyze it (out-of-vocabulary words, proper nouns, etc.).
    analyzer = _get_analyzer()
    if analyzer is None or not word:
        return word
    try:
        parses = analyzer.analyze(word)[0]
    except Exception:
        return word
    if not parses:
        return word
    # Zeyrek can return multiple readings for an ambiguous form; shortest
    # lemma is the best guess at the true root rather than a compound.
    return min((p.lemma for p in parses), key=len).lower()
