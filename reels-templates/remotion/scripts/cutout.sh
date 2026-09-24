#!/usr/bin/env bash
# Вырезает спикера из фона → webm с альфа-каналом + отдельная аудиодорожка (для шаблона T2).
# Запуск: bash scripts/cutout.sh public/speaker.mp4 public/cutout.webm
set -euo pipefail
IN="${1:?укажи входное видео}"
OUT="${2:-public/cutout.webm}"

pip install --quiet backgroundremover
backgroundremover -i "$IN" -tv -o /tmp/cutout.mov          # прозрачное видео (AI-сегментация)
ffmpeg -y -i /tmp/cutout.mov -c:v libvpx-vp9 -pix_fmt yuva420p -b:v 4M -an "$OUT"
ffmpeg -y -i "$IN" -vn -c:a aac -b:a 192k "${OUT%.*}-audio.m4a"
echo "✓ $OUT и ${OUT%.*}-audio.m4a готовы"
