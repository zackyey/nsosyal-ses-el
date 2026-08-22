import argparse
import json
import sys
from pathlib import Path

from matcher import match_transcript

DEFAULT_VOCAB_PATH = Path(__file__).parent / "vocabulary.json"


def words_from_result(result: dict):
    words = []
    for segment in result.get("segments", []):
        for w in segment.get("words", []):
            token = w.get("word", "").strip()
            if token:
                words.append({"word": token, "start": w["start"], "end": w["end"]})
    return words


def transcribe_words(video_path: str, model_size: str = "small"):
    # Whisper's transcribe() extracts audio via ffmpeg internally, because of that there doesn't need to be a seperate extraction.
    import whisper  # imported lazily so --help doesn't require the model deps

    model = whisper.load_model(model_size)
    result = model.transcribe(video_path, language="tr", word_timestamps=True)
    return words_from_result(result)


def run(video_path: str, vocab_path: Path, model_size: str) -> dict:
    vocabulary = json.loads(Path(vocab_path).read_text(encoding="utf-8"))
    words = transcribe_words(video_path, model_size)
    timeline, matched_word_count, total_word_count = match_transcript(words, vocabulary)
    return {
        "timeline": timeline,
        "matched_words": matched_word_count,
        "total_words": total_word_count,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("video", help="Path to the input video file")
    parser.add_argument(
        "--vocab",
        default=str(DEFAULT_VOCAB_PATH),
        help="Path to the vocabulary JSON file (default: backend/vocabulary.json)",
    )
    parser.add_argument(
        "--model",
        default="small",
        choices=["tiny", "base", "small", "medium", "large"],
        help="Whisper model size (default: small)",
    )
    parser.add_argument("-o", "--output", help="Write JSON output to this file instead of stdout")
    args = parser.parse_args()

    if not Path(args.video).exists():
        print(f"error: video file not found: {args.video}", file=sys.stderr)
        sys.exit(1)

    output = run(args.video, Path(args.vocab), args.model)
    text = json.dumps(output, ensure_ascii=False, indent=2)

    if args.output:
        Path(args.output).write_text(text, encoding="utf-8")
        print(f"wrote {args.output} ({output['matched_words']}/{output['total_words']} words matched)")
    else:
        print(text)


if __name__ == "__main__":
    main()
