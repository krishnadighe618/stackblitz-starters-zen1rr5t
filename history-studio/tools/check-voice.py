"""Compare what Whisper heard with what the script says.

Usage: python3 -I tools/check-voice.py <video-folder>

Reads audio/segments.json (from voice.py) and audio/transcript.json (Whisper
word timings) and prints every place where the heard words differ from the
script, with its time in the narration, so you know which lines to listen to.
"""

import difflib
import json
import re
import sys
from pathlib import Path

NUMBERS = {"1": "one", "2": "two", "3": "three", "4": "four", "5": "five"}


def norm(word: str) -> str:
    w = re.sub(r"[^\w']", "", word.lower()).replace("'", "")
    return NUMBERS.get(w, w)


def main():
    folder = Path(sys.argv[1])
    segments = json.loads((folder / "audio/segments.json").read_text(encoding="utf-8"))
    heard = json.loads((folder / "audio/transcript.json").read_text(encoding="utf-8"))
    words = heard if isinstance(heard, list) else heard.get("words", [])

    script = []  # (word, segment index)
    for i, seg in enumerate(segments):
        script += [(norm(w), i) for w in seg["text"].split() if norm(w)]
    got = [(norm(w["text"]), w["start"]) for w in words if norm(w["text"])]

    a, b = [w for w, _ in script], [w for w, _ in got]
    matcher = difflib.SequenceMatcher(None, a, b, autojunk=False)
    issues = 0
    for op, i1, i2, j1, j2 in matcher.get_opcodes():
        if op == "equal":
            continue
        said = " ".join(a[i1:i2]) or "(nothing)"
        heard_text = " ".join(b[j1:j2]) or "(nothing)"
        at = got[j1][1] if j1 < len(got) else (got[-1][1] if got else 0)
        m, s = divmod(int(at), 60)
        issues += 1
        print(f"{m:2d}:{s:02d}  script: {said:<40}  heard: {heard_text}")
    ratio = matcher.ratio()
    print(f"\n{len(a)} script words, {len(b)} heard, {ratio:.1%} match, {issues} places to listen to")


if __name__ == "__main__":
    main()
