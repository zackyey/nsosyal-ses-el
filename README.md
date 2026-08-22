# NSosyal Ses-El

![Project Status: Alpha](https://img.shields.io/badge/Status-Alpha-red.svg)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

*Turkish Sign Language captions for video, running entirely on your own machine.*

## What is Ses-El?

Ses-El is an accessibility layer for video on NSosyal, a Mastodon-based
social platform. Mastodon-based platforms have no native subtitle or caption
support for video, so Ses-El transcribes the spoken Turkish audio in an
uploaded video locally with Whisper, matches recognized words and short
phrases against a curated TİD (Türk İşaret Dili) vocabulary, and plays the
matched signs back as a picture-in-picture overlay on the video.

Built for the NSosyal İnovasyon Yarışması, entered under the Sosyal Yapay
Zeka (Social AI) theme.

## Scope

Ses-El does isolated word/phrase sign substitution, not full grammatically
correct TİD translation. Continuous, sentence-level sign translation is
still an open research problem, not a solved one. Unmatched words are
skipped, not guessed at, because a wrong sign is worse than no sign. See
[`frontend/about.html`](frontend/about.html) for the full rationale and
known limitations.

No paid or cloud AI API is used anywhere. Speech-to-text runs locally via
Whisper, and vocabulary matching is a local, rule-based lookup. That is a
deliberate design choice, not a budget workaround.

## Features

- Local Turkish speech-to-text with word-level timestamps (Whisper).
- Turkish-aware text normalization that correctly distinguishes İ/i from
  I/ı, which a naive `.lower()` gets wrong.
- Turkish suffix stemming via Zeyrek in the video pipeline, so a vocabulary
  entry like "ev" also matches "eve" and "evden".
- Greedy phrase-then-word matching against a curated sign vocabulary.
- Picture-in-picture sign playback synced to the source video, plus a
  sign-sequence-only view for judging translation accuracy in isolation.
- A type-to-match text demo that runs client-side, no upload or backend
  required.
- Turkish/English UI, switchable at runtime and persisted locally.
- No cloud AI API, no API key, no per-request cost.

## Pages

| Page | What it's for |
|---|---|
| `index.html` | Upload a video and start processing |
| `results.html` | Sign-sequence-only view, video + picture-in-picture overlay view, feedback |
| `demo.html` | Type Turkish text and see it matched, entirely client-side |
| `vocabulary.html` | Every word/phrase currently recognized |
| `about.html` | Scope and known limitations, stated plainly |

## Installation

### Requirements

- Python 3.9+.
- [ffmpeg](https://ffmpeg.org/download.html), installed and on your `PATH`
  (Whisper uses it to decode audio from the video file).
- About 1 to 2 GB of free disk space for the Whisper model, downloaded
  automatically on first run.

<details>
<summary>Installing ffmpeg on Windows</summary>

Using a package manager:

```bash
choco install ffmpeg
```

or

```bash
winget install ffmpeg
```

Or download a build from the [ffmpeg site](https://ffmpeg.org/download.html)
and add its `bin` folder to your `PATH` manually.
</details>

<details>
<summary>Installing ffmpeg on Linux</summary>

```bash
sudo apt install ffmpeg        # Debian/Ubuntu
sudo dnf install ffmpeg        # Fedora
sudo pacman -S ffmpeg          # Arch
```
</details>

<details>
<summary>Installing ffmpeg on macOS</summary>

```bash
brew install ffmpeg
```
</details>

### Setting up the backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate    # on Windows; use `source .venv/bin/activate` on macOS/Linux
pip install -r requirements.txt
```

`requirements.txt` also installs [Zeyrek](https://github.com/obulat/zeyrek),
a Turkish morphological analyzer used to stem word suffixes before matching.
It's pure Python, so no separate Java setup is needed.

Verify ffmpeg is on your `PATH`:

```bash
ffmpeg -version
```

## Usage

### Running the full site

Start the backend server. It also serves the frontend, so this is the only
process you need for the full upload flow:

```bash
cd backend
python server.py
```

Then open [http://localhost:5000](http://localhost:5000). Upload a video on
the home page, wait for transcription to finish, and you're taken to the
results page.

### Running the backend script directly (CLI)

Produces a JSON timeline for a single video without starting a server:

```bash
python backend/transcribe.py path/to/video.mp4 -o timeline.json
```

| Flag | Description | Default |
|---|---|---|
| `--model` | Whisper model size: `tiny`, `base`, `small`, `medium`, `large`. Larger is more accurate and slower. | `small` |
| `--vocab` | Path to a vocabulary JSON file. | `backend/vocabulary.json` |
| `-o`, `--output` | Write JSON output to this file instead of stdout. | stdout |

### Text-demo-only mode

The text demo, vocabulary reference, and about pages work without the
backend running at all. Matching happens client-side against
`frontend/data/vocabulary.json`. Video upload and processing still require
`backend/server.py`, since that's what performs the actual transcription.

```bash
cd frontend
python -m http.server 8080
```

This mode has one real gap: the browser has no Turkish morphological
analyzer available, so `frontend/js/match.js` only recognizes exact
vocabulary forms. The stemming described below applies to the video
pipeline only.

## Configuration

### Vocabulary

Each vocabulary entry is a word or short phrase mapped to a sign:

```json
{ "sign_id": "merhaba", "text": "merhaba", "gloss": "MERHABA" }
```

| Field | Description |
|---|---|
| `sign_id` | Identifier for the sign; multiple entries (e.g. "teşekkür ederim" and "teşekkürler") can share one |
| `text` | The word or phrase to match; matching tries two-word phrases before falling back to single words |
| `gloss` | The uppercase label shown alongside the sign |

`backend/vocabulary.json` currently holds 160 entries and is the source of
truth. When `server.py` is running, it also serves the frontend's copy from
that same file, so there's one place to edit. `frontend/data/vocabulary.json`
exists only as a fallback for when the frontend is served without the
backend (text-demo-only mode above); keep it in sync with the backend file
if you edit vocabulary while running that way.

For single-word entries, the video pipeline also matches on the Zeyrek stem
of the recognized word, so "ev" catches "eve" and "evden" too. Multi-word
entries like "hoş geldin" are matched exactly, since stemming a phrase risks
false matches on shared roots between unrelated phrases.

### UI copy / locales

Page copy (headings, body text, buttons, footer, etc.) isn't hardcoded in
the HTML. It's pulled from `frontend/content/tr.json` (default) or
`frontend/content/en.json` at load time, via `data-t="section.key"`
attributes and the loader in `frontend/js/app.js`. The locale toggle in the
nav bar, persisted in `localStorage` the same way the theme toggle is,
switches between them and reloads the page. To add a language, copy one of
those JSON files, translate the values, and wire it into the toggle in
`app.js`.

## Project layout

```
backend/
  vocabulary.json     seed TİD vocabulary (word/phrase -> sign_id, gloss)
  normalize.py        Turkish-aware text normalization (İ/i, I/ı) and Zeyrek stemming
  matcher.py           greedy phrase/word matching against the vocabulary, single words also matched by stem
  transcribe.py         CLI: video -> Whisper transcript -> matched JSON timeline
  server.py              Flask app: serves the frontend + /api/process, /api/vocabulary
  requirements.txt
frontend/
  index.html             upload flow
  results.html            sign-sequence view + video/PIP overlay view + feedback
  demo.html                text-demo mode, client-side only
  vocabulary.html           supported vocabulary reference
  about.html                 scope and known limitations
  content/tr.json, content/en.json    all UI copy, keyed by page
  css/, js/, data/
```

## Known limitations

- Not full TİD translation. Sentence-level grammar, word order, and
  non-manual markers (facial expression, body posture) aren't modeled.
- The client-side text demo doesn't stem suffixes, only the video pipeline
  does (see the note under Text-demo-only mode above).
- The vocabulary is intentionally small and will grow over time.
- The sign display is a simple animated glyph paired with text gloss, not
  motion-captured or photorealistic TİD animation.

See [`frontend/about.html`](frontend/about.html) for the full writeup.

## Contributing

Bug reports, vocabulary additions, and pull requests are welcome. This is an
early-stage, alpha project built for a competition entry, so expect rough
edges. If you're adding vocabulary, remember to update both
`backend/vocabulary.json` and, if you're testing text-demo-only mode,
`frontend/data/vocabulary.json`.

## License

This project is licensed under the [MIT license](./LICENSE). It uses
OpenAI's Whisper for local speech-to-text, ffmpeg (via Whisper) for audio
decoding, and Zeyrek for Turkish stemming. Each comes with its own license;
check those before reusing this code under a different license.

## About the name

"Ses-El" combines two Turkish words: *ses* (voice/sound) and *el* (hand),
voice-to-hand, which is exactly what the tool does. It takes spoken audio
and turns it into hand signs.
