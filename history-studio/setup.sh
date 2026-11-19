#!/usr/bin/env bash
# Installs everything the studio needs, inside this folder. Safe to re-run:
# each step skips work that is already done.
#
#   ./setup.sh
#
# Needs: Node.js 22+, Python 3.10+, ffmpeg, curl, and (for Whisper) cmake and a
# C/C++ compiler. Nothing is installed system-wide.
set -euo pipefail
cd "$(dirname "$0")"
source ./studio-env.sh

say() { printf '\n==> %s\n' "$*"; }

sha256() {
  if command -v sha256sum >/dev/null; then sha256sum "$1" | cut -d' ' -f1
  else shasum -a 256 "$1" | cut -d' ' -f1; fi
}

# fetch URL DEST SHA256: download once, keep only if the checksum matches.
fetch() {
  local url=$1 dest=$2 sum=$3
  if [ -f "$dest" ] && [ "$(sha256 "$dest")" = "$sum" ]; then
    echo "already have $(basename "$dest")"
    return
  fi
  mkdir -p "$(dirname "$dest")"
  echo "downloading $(basename "$dest")..."
  curl -fsSL --retry 3 -o "$dest.part" "$url"
  if [ "$(sha256 "$dest.part")" != "$sum" ]; then
    rm -f "$dest.part"
    echo "checksum mismatch for $url" >&2
    exit 1
  fi
  mv "$dest.part" "$dest"
}

mkdir -p .studio/cache
chmod 700 .studio .studio/cache

say "1/4 HyperFrames"
npm ci --no-audit --no-fund --loglevel=error

say "2/4 ffmpeg"
if command -v ffmpeg >/dev/null; then
  ffmpeg -version | head -1
else
  echo "ffmpeg is missing. It is a system-wide install, so do it yourself:" >&2
  echo "  macOS: brew install ffmpeg   Ubuntu: sudo apt-get install -y ffmpeg   Windows: winget install Gyan.FFmpeg" >&2
  exit 1
fi

say "3/4 Kokoro text-to-speech (.venv, v1.0 model and voices)"
if [ ! -x .venv/bin/python ]; then
  if command -v uv >/dev/null; then uv venv -q .venv; else python3 -m venv .venv; fi
fi
if command -v uv >/dev/null; then
  uv pip install -q --python .venv/bin/python -r requirements.lock
else
  .venv/bin/pip install -q -r requirements.lock
fi
fetch https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx \
  "$HYPERFRAMES_CACHE_DIR/tts/models/kokoro-v1.0.onnx" \
  7d5df8ecf7d4b1878015a32686053fd0eebe2bc377234608764cc0ef3636a6c5
fetch https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin \
  "$HYPERFRAMES_CACHE_DIR/tts/voices/voices-v1.0.bin" \
  bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d

say "4/4 Whisper (whisper.cpp and the small.en model)"
if [ -x "$HYPERFRAMES_WHISPER_PATH" ]; then
  echo "already have whisper-cli"
elif command -v whisper-cli >/dev/null; then
  echo "using whisper-cli from PATH: $(command -v whisper-cli)"
elif command -v cmake >/dev/null; then
  # whisper.cpp v1.9.1 source, as vendored in the nodejs-whisper npm package.
  src=.studio/whisper.cpp
  rm -rf "$src" && mkdir -p "$src"
  tgz=$(npm pack nodejs-whisper@0.4.1 --silent --pack-destination .studio)
  tar xzf ".studio/$tgz" -C "$src" --strip-components=3 package/cpp/whisper.cpp
  rm -f ".studio/$tgz"
  echo "building whisper-cli (about a minute)..."
  cmake -S "$src" -B "$src/build" -DCMAKE_BUILD_TYPE=Release \
    -DWHISPER_BUILD_TESTS=OFF -DWHISPER_BUILD_SERVER=OFF >/dev/null
  cmake --build "$src/build" --config Release -j 4 --target whisper-cli >/dev/null
else
  echo "Skipping the whisper-cli build: cmake is missing. Either install cmake and a" >&2
  echo "C compiler and re-run, or install whisper.cpp yourself (macOS: brew install whisper-cpp)." >&2
fi
fetch https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-small.en.bin \
  "$HYPERFRAMES_CACHE_DIR/whisper/models/ggml-small.en.bin" \
  c6138d6d58ecc8322097e0f987c32f1be8bb0a18532a3f88f734d1bbf9c41e5d

say "Done. Check it with: source ./studio-env.sh && npx hyperframes doctor"
