// JS port of backend/normalize.py + backend/matcher.py, used by the standalone
// demo mode without a backend. Keep this logic in sync with the Python version.

function turkishLower(text) {
  return text.replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase();
}

function normalizeWord(word) {
  return turkishLower(word.trim()).replace(/[^\p{L}\p{N}_]/gu, "");
}

function normalizePhrase(phrase) {
  return phrase
    .split(/\s+/)
    .map(normalizeWord)
    .filter(Boolean)
    .join(" ");
}

function buildLookup(vocabulary) {
  const lookup = new Map();
  for (const entry of vocabulary) {
    const key = normalizePhrase(entry.text);
    if (key) lookup.set(key, entry);
  }
  return lookup;
}

// Returns { tokens, matchedWordCount, totalWordCount } where tokens is a
// list of { kind: "match"|"skip", text, sign_id?, gloss? }.
function matchText(text, vocabulary) {
  const lookup = buildLookup(vocabulary);
  const rawWords = text.split(/\s+/).filter(Boolean);
  const normalized = rawWords.map(normalizeWord);

  const tokens = [];
  let matchedWordCount = 0;
  const totalWordCount = rawWords.length;

  let i = 0;
  const n = rawWords.length;
  while (i < n) {
    if (!normalized[i]) {
      i += 1;
      continue;
    }

    let matched = false;

    if (i + 1 < n && normalized[i + 1]) {
      const phrase = `${normalized[i]} ${normalized[i + 1]}`;
      const entry = lookup.get(phrase);
      if (entry) {
        tokens.push({ kind: "match", text: phrase, sign_id: entry.sign_id, gloss: entry.gloss });
        matchedWordCount += 2;
        i += 2;
        matched = true;
      }
    }

    if (!matched) {
      const entry = lookup.get(normalized[i]);
      if (entry) {
        tokens.push({ kind: "match", text: normalized[i], sign_id: entry.sign_id, gloss: entry.gloss });
        matchedWordCount += 1;
      } else {
        tokens.push({ kind: "skip", text: rawWords[i] });
      }
      i += 1;
    }
  }

  return { tokens, matchedWordCount, totalWordCount };
}
