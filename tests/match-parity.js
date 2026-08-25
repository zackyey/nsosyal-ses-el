// Locks frontend/js/match.js behavior to the shared fixtures in
// tests/fixtures/match-cases.json, so it can't silently drift from
// backend/matcher.py + backend/normalize.py (checked by
// tests/test-matcher-parity.py) without a test noticing. Run directly:
//
//   node tests/match-parity.js
"use strict";

const fs = require("fs");
const path = require("path");
const { matchText } = require("../frontend/js/match.js");

const fixtures = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures", "match-cases.json"), "utf8")
);

let failures = 0;

for (const testCase of fixtures.cases) {
  const { tokens, matchedWordCount, totalWordCount } = matchText(testCase.input, fixtures.vocabulary);
  const matched = tokens
    .filter((t) => t.kind === "match")
    .map((t) => ({ text: t.text, sign_id: t.sign_id, gloss: t.gloss }));

  const actual = { matched, matched_words: matchedWordCount, total_words: totalWordCount };
  const expected = testCase.expected_js;

  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures += 1;
    console.error(`FAIL ${testCase.name}`);
    console.error(`  expected: ${JSON.stringify(expected)}`);
    console.error(`  actual:   ${JSON.stringify(actual)}`);
  } else {
    console.log(`ok ${testCase.name}`);
  }
}

if (failures > 0) {
  console.error(`${failures} case(s) failed`);
  process.exit(1);
}
console.log(`all ${fixtures.cases.length} case(s) passed`);
