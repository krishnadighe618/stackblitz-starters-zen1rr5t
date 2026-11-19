"""Voice a video's script.md with Kokoro, paragraph by paragraph.

Usage (from history-studio, after `source studio-env.sh`):

    .venv/bin/python tools/voice.py <video-folder> [--voice bm_george] [--speed 1.0]

Reads <video-folder>/script.md. Every "## " section before "## Sources" is
spoken; lines starting with ">" are notes and are skipped. Writes:

    audio/narration.wav        the whole narration
    audio/sections/NN-*.wav    one file per section, to re-check a part
    audio/segments.json        each paragraph's text, section, start and end (s)
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

# Spellings the voice should say differently from how captions show them.
PRONOUNCE = {
    "Kraków": "Krakov",
    "Bohuslän": "Bohuslen",
    "Malmö": "Malmo",
    "Dahlbergh": "Dahlberg",
    "Corfitz": "Korfits",
    "Ulfeldt": "Ulfelt",
    "snapphanar": "snap hanar",
    "Funen": "Foo-nen",
    "Lolland": "Lollan",
    "Blekinge": "Bleking-eh",
}
PARAGRAPH_PAUSE = 0.55
SECTION_PAUSE = 1.2
LEAD_IN = 0.3


def parse(script: str):
    body = script.split("\n## Sources")[0]
    sections = []
    for block in re.split(r"^## ", body, flags=re.M)[1:]:
        title, _, rest = block.partition("\n")
        paras = [
            " ".join(p.split())
            for p in re.split(r"\n\s*\n", rest)
            if p.strip() and not p.lstrip().startswith(">")
        ]
        sections.append((title.strip(), paras))
    return sections


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("folder")
    ap.add_argument("--voice", default="bm_george")
    ap.add_argument("--speed", type=float, default=1.0)
    args = ap.parse_args()

    folder = Path(args.folder)
    cache = Path(os.environ.get("HYPERFRAMES_CACHE_DIR", ".studio/cache")) / "tts"
    model = Kokoro(str(cache / "models/kokoro-v1.0.onnx"), str(cache / "voices/voices-v1.0.bin"))
    lang = "en-gb" if args.voice.startswith("b") else "en-us"

    sections = parse((folder / "script.md").read_text(encoding="utf-8"))
    out = folder / "audio"
    (out / "sections").mkdir(parents=True, exist_ok=True)
    for old in (out / "sections").glob("*.wav"):
        old.unlink()

    sr = 24000
    silence = lambda s: np.zeros(int(round(s * sr)), dtype=np.float32)
    timeline = [silence(LEAD_IN)]
    t = LEAD_IN
    segments = []
    for si, (title, paras) in enumerate(sections, 1):
        section_audio = []
        for pi, text in enumerate(paras):
            spoken = text
            for word, say in PRONOUNCE.items():
                spoken = spoken.replace(word, say)
            samples, sr = model.create(spoken, voice=args.voice, speed=args.speed, lang=lang)
            samples = samples.astype(np.float32)
            dur = len(samples) / sr
            segments.append({"section": si, "title": title, "paragraph": pi + 1, "text": text,
                             "start": round(t, 3), "end": round(t + dur, 3)})
            pause = PARAGRAPH_PAUSE if pi < len(paras) - 1 else SECTION_PAUSE
            timeline += [samples, silence(pause)]
            section_audio += [samples, silence(PARAGRAPH_PAUSE)]
            t += dur + pause
            print(f"  {si}.{pi + 1:02d}  {dur:5.1f}s  {text[:60]}", flush=True)
        sf.write(out / "sections" / f"{si:02d}-{slug(title)}.wav", np.concatenate(section_audio), sr)

    full = np.concatenate(timeline)
    sf.write(out / "narration.wav", full, sr)
    (out / "segments.json").write_text(json.dumps(segments, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"narration: {len(full) / sr / 60:.1f} min, {len(segments)} paragraphs, {len(sections)} sections")


if __name__ == "__main__":
    sys.exit(main())
