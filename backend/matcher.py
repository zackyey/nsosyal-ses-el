from normalize import normalize_phrase, normalize_word, stem_word


def build_lookup(vocabulary):
    lookup = {}
    for entry in vocabulary:
        key = normalize_phrase(entry["text"])
        if key:
            lookup[key] = entry
    return lookup


def build_stem_lookup(vocabulary):
    # Multi-word entries (e.g. "hoş geldin") are excluded: stemming them
    # could false-match on shared roots between unrelated phrases.
    lookup = {}
    for entry in vocabulary:
        key = normalize_phrase(entry["text"])
        if key and " " not in key:
            root = stem_word(key)
            lookup.setdefault(root, entry)
    return lookup


_cached_vocabulary = None
_cached_lookup = None
_cached_stem_lookup = None


def _get_lookups(vocabulary):
    # Stemming every single-word entry calls into Zeyrek, which is slow enough that
    # rebuilding this from scratch on every request would add real per-request latency.
    global _cached_vocabulary, _cached_lookup, _cached_stem_lookup
    if vocabulary != _cached_vocabulary:
        _cached_lookup = build_lookup(vocabulary)
        _cached_stem_lookup = build_stem_lookup(vocabulary)
        _cached_vocabulary = vocabulary
    return _cached_lookup, _cached_stem_lookup


def match_transcript(words, vocabulary):
    lookup, stem_lookup = _get_lookups(vocabulary)
    normalized = [normalize_word(w["word"]) for w in words]

    timeline = []
    matched_word_count = 0
    total_word_count = len(words)

    i = 0
    n = len(words)
    while i < n:
        if not normalized[i]:
            i += 1
            continue

        matched = False

        if i + 1 < n and normalized[i + 1]:
            phrase = f"{normalized[i]} {normalized[i + 1]}"
            entry = lookup.get(phrase)
            if entry:
                timeline.append(
                    {
                        "start": words[i]["start"],
                        "end": words[i + 1]["end"],
                        "text": phrase,
                        "sign_id": entry["sign_id"],
                        "gloss": entry["gloss"],
                    }
                )
                matched_word_count += 2
                i += 2
                matched = True

        if not matched:
            entry = lookup.get(normalized[i])
            if not entry:
                entry = stem_lookup.get(stem_word(normalized[i]))
            if entry:
                timeline.append(
                    {
                        "start": words[i]["start"],
                        "end": words[i]["end"],
                        "text": normalized[i],
                        "sign_id": entry["sign_id"],
                        "gloss": entry["gloss"],
                    }
                )
                matched_word_count += 1
            i += 1

    return timeline, matched_word_count, total_word_count
