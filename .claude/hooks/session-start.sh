#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

VIDEO_USE_DIR="$HOME/Developer/video-use"
SKILLS_DIR="$HOME/.claude/skills"

if [ -d "$VIDEO_USE_DIR/.git" ]; then
  git -C "$VIDEO_USE_DIR" pull --ff-only >/dev/null 2>&1 || true
else
  mkdir -p "$(dirname "$VIDEO_USE_DIR")"
  git clone --depth 1 https://github.com/browser-use/video-use "$VIDEO_USE_DIR" >/dev/null 2>&1
fi

mkdir -p "$SKILLS_DIR"
ln -sfn "$VIDEO_USE_DIR" "$SKILLS_DIR/video-use"

if ! command -v ffmpeg >/dev/null 2>&1; then
  if command -v apt-get >/dev/null 2>&1; then
    sudo apt-get update -y >/dev/null 2>&1 && sudo apt-get install -y ffmpeg >/dev/null 2>&1 || true
  elif command -v brew >/dev/null 2>&1; then
    brew install ffmpeg >/dev/null 2>&1 || true
  fi
fi

if [ -f "$VIDEO_USE_DIR/pyproject.toml" ]; then
  if command -v uv >/dev/null 2>&1; then
    (cd "$VIDEO_USE_DIR" && uv sync >/dev/null 2>&1) || true
  else
    (cd "$VIDEO_USE_DIR" && pip install -e . >/dev/null 2>&1) || true
  fi
fi

if [ ! -f "$VIDEO_USE_DIR/.env" ] || ! grep -q '^ELEVENLABS_API_KEY=..' "$VIDEO_USE_DIR/.env" 2>/dev/null; then
  echo "NOTE: video-use skill installed, but ELEVENLABS_API_KEY is not set." >&2
  echo "Set it manually: printf 'ELEVENLABS_API_KEY=your_key\\n' > $VIDEO_USE_DIR/.env" >&2
fi

exit 0
