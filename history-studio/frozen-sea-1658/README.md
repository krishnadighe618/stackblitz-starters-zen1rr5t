# The Army That Walked Across the Sea

How Sweden's army crossed the frozen Belts in 1658, and why it changed the
map of Scandinavia for good. About 14½ minutes, stitched tapestry look,
Kokoro voice bm_george.

| Guide step | Status | Files |
| --- | --- | --- |
| 4 · Topic | Done | `../topics.md` (#1) |
| 5 · Script | Done | `script.md`, with sources and a list of claims to check |
| 6 · Images | Drawn in code instead | The scenes are drawn with the tapestry kit (`../kit`), not generated. `image-list.md` is there if you want to make painted images later |
| 7 · Voice | Done | `audio/narration.m4a` to listen to; `audio/segments.json` and `audio/transcript.json` for timing |
| 8 · Build the film | **Storyboard ready for your notes** | `storyboard/page-1.jpg` to `page-5.jpg`, `renders/preview-first-minute.mp4` |
| 9 · Review | Next: your notes | |
| 10 · Packaging | After the film | |

## Build, check and render the film

From this folder, after `source ../studio-env.sh`:

```bash
node tools/build-film.mjs            # writes index.html and compositions/ from the shot list
npx hyperframes check                 # lint, layout and contrast
npx hyperframes preview               # watch it in the browser
npx hyperframes render -o renders/the-army-that-walked-across-the-sea.mp4
```

The film is 52 shots, one per paragraph group of the narration, each shot
defined in `tools/build-film.mjs`. Map labels, province colours and arrows
are timed to the exact words in `audio/transcript.json`.

Storyboard pages: `python3 ../tools/storyboard.py . <snapshot folder>` after
`npx hyperframes snapshot --at <the key times in storyboard/shots.json>`.

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
