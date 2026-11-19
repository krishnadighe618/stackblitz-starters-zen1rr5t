# history-studio

A video studio for animated history documentaries. Everything lives in this
folder; nothing was installed system-wide.

## What's installed

| Tool | What it does | Where it lives |
| --- | --- | --- |
| [HyperFrames](https://hyperframes.heygen.com) 0.9.70 | Builds videos as HTML and renders them to MP4 | `node_modules/` |
| HyperFrames skills (`hyperframes`, `hyperframes-cli`, `media-use`) | Teach Claude Code how to write and render HyperFrames videos | `.claude/skills/` |
| ffmpeg | Audio and video encoding (HyperFrames uses it) | Already on the machine, not installed here |
| Whisper (whisper.cpp 1.9.1, `small.en` model) | Word-level timing for narration and captions | `.studio/whisper.cpp/`, `.studio/cache/whisper/` |
| Kokoro (kokoro-onnx 0.6.1, v1.0 model and voices) | Local text-to-speech | `.venv/`, `.studio/cache/tts/` |

`studio-env.sh` points HyperFrames at these copies. Claude Code loads it on
start through the hook in `.claude/settings.json`. In your own terminal, run
`source ./studio-env.sh` first.

`node_modules/`, `.venv/` and `.studio/` are not in git (about 900 MB). On a
new machine or a fresh cloud session, recreate them with:

```bash
./setup.sh
```

## Folder layout

One subfolder per video, so Claude can reuse what it built last time:

```
history-studio/
  style-test/            one scene in four looks, for picking the channel style
  test-video/            the 10-second test (title card + one Kokoro line)
    index.html           root composition
    compositions/        one file per scene
    assets/              narration.wav, transcript.json
    renders/             finished MP4s
  <next-video>/
```

Start a new video with `npx hyperframes init <video-name> --skip-skills`.

## How to run each tool

Run these from inside a video folder (for example `cd test-video`) after
`source ../studio-env.sh`.

**Voice (Kokoro).** Write a line of narration to a WAV file:

```bash
npx hyperframes tts "In 1215, at Runnymede..." -v bm_george -o assets/narration.wav
```

`npx hyperframes tts --list` shows the voices. `bm_george` is British male.

**Word timing (Whisper).** Writes `assets/transcript.json` with the start and
end of every word:

```bash
npx hyperframes transcribe assets/narration.wav
```

Add `--to srt` for a subtitle file.

**Preview, check and render (HyperFrames):**

```bash
npx hyperframes preview          # live preview in the browser
npx hyperframes check            # lint, layout and contrast checks
npx hyperframes snapshot --at 0,2,5   # PNG frames to look at
npx hyperframes render -o renders/my-video.mp4
```

**ffmpeg** works on its own too, for example `ffprobe renders/my-video.mp4`.

**Health check:** `npx hyperframes doctor` lists every tool and whether it's found.

## Notes

- HyperFrames sends anonymous usage data by default. Turn it off with
  `npx hyperframes telemetry disable`.
- `setup.sh` is a bash script (macOS, Linux, or WSL on Windows). It needs
  Node.js 22+, Python 3.10+, ffmpeg and curl. Building Whisper also needs
  cmake and a C compiler; on a Mac, `brew install whisper-cpp` works instead.
- HyperFrames' other skills (`hyperframes-registry`, `reverse-any-video`,
  `style-sampling`) are not installed. Their installer clones from GitHub,
  which this cloud environment blocks. Run `npx hyperframes skills update` on
  a machine with GitHub access to add them.
