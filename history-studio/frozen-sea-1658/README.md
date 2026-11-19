# The Army That Walked Across the Sea

How Sweden's army crossed the frozen Belts in 1658, and why it changed the
map of Scandinavia for good. About 14½ minutes, stitched tapestry look,
Kokoro voice bm_george.

| Guide step | Status | Files |
| --- | --- | --- |
| 4 · Topic | Done | `../topics.md` (#1) |
| 5 · Script | Done | `script.md`, with sources and a list of claims to check |
| 6 · Images | **Your turn** | `image-list.md`: make the 38 images and send them to Claude |
| 7 · Voice | Done | `audio/narration.m4a` to listen to; `audio/segments.json` and `audio/transcript.json` for timing |
| 8 · Build the film | Waiting for images | |
| 9 · Review | After the first render | |
| 10 · Packaging | After the film | |

## Re-record the voice

After editing `script.md`, from `history-studio`:

```bash
source studio-env.sh
.venv/bin/python tools/voice.py frozen-sea-1658 --voice bm_george --speed 0.92
cd frozen-sea-1658 && npx hyperframes transcribe audio/narration.wav && cd ..
python3 tools/check-voice.py frozen-sea-1658
```

`check-voice.py` lists every place where Whisper heard something different
from the script, with its time, so you know which lines to listen to.
Fix a mispronounced name by adding it to `PRONOUNCE` in `tools/voice.py`.

The WAV files are not in git (about 80 MB). `voice.py` recreates them in
about three minutes.
