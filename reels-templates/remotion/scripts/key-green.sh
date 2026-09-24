#!/usr/bin/env bash
# Хромакей (если снимал на зелёном): → webm с альфой + звук.
# Запуск: bash scripts/key-green.sh take.mp4 public/speaker-keyed.webm
set -euo pipefail
IN="${1:?входное видео}"; OUT="${2:-public/speaker-keyed.webm}"
ffmpeg -y -i "$IN" -vf "chromakey=0x00b140:0.12:0.08,despill=type=green" \
  -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 4M -c:a libopus "$OUT"
echo "✓ $OUT"
