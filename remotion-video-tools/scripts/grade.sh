#!/bin/bash
# Киношная цветокоррекция съёмки — штатный шаг подготовки Head (принято владельцем 03.10.2026).
#
#   scripts/grade.sh <in.mp4> <out.mp4> [preset] [strength 0..1] [lut.cube]
#
# Пресеты (все мягкие, лицо не перекрашивают):
#   cinematic  — холодные тени, чуть приглушённая насыщенность, лёгкая резкость (по умолчанию; это «до/после» из демо 03.10)
#   warm       — тёплые полутона, кожа румянее, для уличных съёмок в пасмурную погоду
#   clean      — нейтрально: контраст и чистота без оттенка, для кадров с логотипами
#   teal       — лёгкий «teal & orange»: тени в бирюзу, кожа в тёплое, не агрессивно
#   lut        — внешний .cube (например, с freshluts.com под своим аккаунтом); пятый аргумент — путь к файлу
# strength — доля эффекта: 1 — полностью, 0.5 — наполовину (смешивание с исходником).
# Звук копируется без перекодирования. Видео — H.264 crf 18, чтобы не терять качество до рендера.
set -e
src=$1; out=$2; preset=${3:-cinematic}; k=${4:-1}; lut=$5
[ -f "$src" ] || { echo "нет файла $src"; exit 1; }
case "$preset" in
  cinematic) F="curves=r='0/0.02 0.5/0.49 1/0.96':g='0/0.02 0.5/0.5 1/0.97':b='0/0.06 0.5/0.52 1/0.98',colorbalance=rs=-0.03:bs=0.05:rh=-0.02:bh=0.03,eq=contrast=1.06:saturation=0.92,unsharp=3:3:0.4" ;;
  warm)      F="curves=r='0/0.03 0.5/0.52 1/0.98':g='0/0.02 0.5/0.5 1/0.97':b='0/0.0 0.5/0.47 1/0.95',colorbalance=rm=0.03:bm=-0.03:rh=0.02:bh=-0.02,eq=contrast=1.04:saturation=1.03,unsharp=3:3:0.3" ;;
  clean)     F="curves=r='0/0.0 0.5/0.5 1/1':g='0/0.0 0.5/0.5 1/1':b='0/0.0 0.5/0.5 1/1',eq=contrast=1.05:saturation=0.97:brightness=0.01,unsharp=3:3:0.5" ;;
  teal)      F="colorbalance=rs=-0.06:gs=0.01:bs=0.06:rm=0.03:bm=-0.02:rh=0.02:bh=-0.03,eq=contrast=1.07:saturation=0.95,unsharp=3:3:0.4" ;;
  lut)       [ -f "$lut" ] || { echo "нужен .cube пятым аргументом"; exit 1; }; F="lut3d=file='$lut':interp=tetrahedral" ;;
  *) echo "неизвестный пресет $preset (cinematic|warm|clean|teal|lut)"; exit 1 ;;
esac
if [ "$k" = "1" ]; then
  ffmpeg -v error -y -i "$src" -vf "$F" -c:v libx264 -crf 18 -preset fast -c:a copy -movflags +faststart "$out"
else
  # Смешивание с исходником: исходник × (1−k) + коррекция × k.
  ffmpeg -v error -y -i "$src" -filter_complex "[0:v]split[a][b];[b]$F[c];[a][c]blend=all_mode=normal:all_opacity=$k[v]" -map "[v]" -map 0:a? -c:v libx264 -crf 18 -preset fast -c:a copy -movflags +faststart "$out"
fi
echo "✔ $out ($preset, сила $k)"
