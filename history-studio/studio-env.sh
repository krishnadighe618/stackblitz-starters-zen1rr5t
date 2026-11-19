# Points HyperFrames at the tools installed inside this studio folder.
# Use it in a terminal with:  source ./studio-env.sh
# Claude Code loads it automatically (see .claude/settings.json).
STUDIO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
export STUDIO_DIR
export HYPERFRAMES_CACHE_DIR="$STUDIO_DIR/.studio/cache"
export HYPERFRAMES_PYTHON="$STUDIO_DIR/.venv/bin/python"
export HYPERFRAMES_WHISPER_PATH="$STUDIO_DIR/.studio/whisper.cpp/build/bin/whisper-cli"

# Behind an HTTPS proxy (as in Claude Code cloud sessions), let Node's own
# downloads, such as Whisper models, go through it too.
if [ -n "${HTTPS_PROXY:-}${https_proxy:-}" ]; then
  export NODE_USE_ENV_PROXY=1
fi
