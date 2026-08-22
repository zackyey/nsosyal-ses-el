import json
import uuid
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

from matcher import match_transcript
from transcribe import words_from_result

BASE_DIR = Path(__file__).parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
VOCAB_PATH = BASE_DIR / "vocabulary.json"

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".webm", ".mkv", ".avi"}
MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500 MB

app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH

_model_cache = {}


def get_whisper_model(size: str):
    import whisper

    if size not in _model_cache:
        _model_cache[size] = whisper.load_model(size)
    return _model_cache[size]


def load_vocabulary():
    return json.loads(VOCAB_PATH.read_text(encoding="utf-8"))


@app.route("/api/vocabulary")
def api_vocabulary():
    return jsonify(load_vocabulary())


@app.route("/api/process", methods=["POST"])
def api_process():
    if "video" not in request.files:
        return jsonify({"error": "no video file provided (expected form field 'video')"}), 400

    file = request.files["video"]
    if not file.filename:
        return jsonify({"error": "empty filename"}), 400

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        return jsonify({"error": f"unsupported file type '{ext}'"}), 400

    model_size = request.form.get("model", "small")

    video_id = uuid.uuid4().hex
    video_path = UPLOAD_DIR / f"{video_id}{ext}"
    file.save(video_path)

    try:
        model = get_whisper_model(model_size)
        result = model.transcribe(str(video_path), language="tr", word_timestamps=True)
        words = words_from_result(result)
    except Exception as exc:  # surfaced to the UI as an error message
        return jsonify({"error": f"transcription failed: {exc}"}), 500

    vocabulary = load_vocabulary()
    timeline, matched_word_count, total_word_count = match_transcript(words, vocabulary)

    return jsonify(
        {
            "video_url": f"/uploads/{video_path.name}",
            "timeline": timeline,
            "matched_words": matched_word_count,
            "total_words": total_word_count,
        }
    )


@app.route("/data/vocabulary.json")
def frontend_vocabulary():
    # frontend/data/vocabulary.json also exists (for the demo page without a backend), but
    # while this server runs, serve backend/vocabulary.json as the one source of truth.
    return jsonify(load_vocabulary())


@app.route("/uploads/<path:filename>")
def uploaded_file(filename):
    return send_from_directory(UPLOAD_DIR, filename)


@app.route("/")
@app.route("/<path:path>")
def frontend(path="index.html"):
    full = FRONTEND_DIR / path
    if not full.exists() or full.is_dir():
        path = "index.html"
    return send_from_directory(FRONTEND_DIR, path)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
