#!/bin/bash
# Забирает бесплатные материалы со сторонних сайтов в public/local/ (в репозиторий
# они не коммитятся) и пререндерит Lottie в прозрачный WebM. Что это за файлы и
# на каких условиях — docs/sources.md. Повторный запуск докачивает только недостающее.
#
#   scripts/fetch-sources.sh            всё
#   scripts/fetch-sources.sh lottie     только Lottie (+ пререндер)
#   scripts/fetch-sources.sh mixkit     только вертикальные клипы Mixkit (1080×1920)
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
what=${1:-all}

# LottieFiles, бесплатные анимации (Lottie Simple License). Адрес .lottie берётся
# на странице анимации из ссылки «Edit with AI» (параметр lottieUrl).
LOTTIE="
up-arrow          460ede84-1179-11ee-bc25-e32a50b44d3e/gI5ccrsWbf
growth-chart      55092d42-1168-11ee-8db1-0b4fb66fa345/l3EGlF193j
handshake-loop    46ef1528-a41b-11ee-a79c-6b92c18b54d9/pwdgBFSy1c
handshake-icon    04e1d930-1178-11ee-8562-6f8e61c1d751/W1BmCsK1t1
successful-target bedd6162-117b-11ee-a43f-df26c1be619e/S6XGeaUwJI
rocket-launch     05fe782a-1185-11ee-b4a1-377ad5371ff2/eFJr9kWegJ
airplane-world    fdaf2fde-1152-11ee-b06c-1768e8699dfe/NY6HLn5EcI
airplane-flying   d4a55de0-1150-11ee-82c7-1f75bcdb65d3/4h7xnJeOO9
location-pin      6fea46dc-116d-11ee-a166-e3e11535e6a1/yzVf0srPhS
success-tick      759a11f0-1151-11ee-b2a3-9334b639f099/s9XqEErgZd
earth-globe       6201f61c-116a-11ee-bcd0-6f7c4dea242e/ZDTRB9mA8G
global-network    513547d2-1163-11ee-be5a-9396f87d81b4/PCQDagGwlU
trophy            745fc364-117b-11ee-b7ec-9f18a8a356e0/ctpFpJP75f
travel-map        ca2232ce-1152-11ee-b488-bf3c58b2281e/gSKrcVprjk
"

# Mixkit, вертикальные клипы (Mixkit Stock Video Free License). Номер клипа —
# из адреса превью на странице категории (assets.mixkit.co/videos/<id>/<id>-360.mp4);
# -1080.mp4 по тому же пути отдаёт 1080×1920 без регистрации.
MIXKIT="
49875 city-night-tower-aerial
49878 city-night-aerial
40747 street-skyscraper-walk
49873 city-night-roads-aerial
49849 city-dusk-aerial
49871 city-dusk-tour-aerial
49869 city-skyline-night
41373 highway-aerial
44787 woman-laptop-desk
42137 packing-box-tape
44748 man-phone-desk
30015 handshake-sky-silhouette
49939 woman-phone-sofa
41656 typing-keyboard-neon
41183 laptop-keyboard
"

if [ "$what" = all ] || [ "$what" = lottie ]; then
  L=$ROOT/public/local/lottie; mkdir -p "$L/src"
  echo "$LOTTIE" | while read -r name key; do
    [ -z "$name" ] && continue
    if [ ! -s "$L/src/$name.lottie" ]; then
      curl -sSL --max-time 60 -o "$L/src/$name.lottie" "https://assets-v2.lottiefiles.com/a/$key.lottie"
      echo "↓ $name.lottie"
    fi
    if [ ! -s "$L/$name.webm" ]; then
      rm -rf "$L/src/$name" && mkdir -p "$L/src/$name" && unzip -qo "$L/src/$name.lottie" -d "$L/src/$name"
      json=$(ls "$L/src/$name"/animations/*.json | head -1)
      node "$ROOT/scripts/lottie-render.cjs" "$json" "$L/$name.webm" 720 30
    fi
  done
fi

if [ "$what" = all ] || [ "$what" = mixkit ]; then
  M=$ROOT/public/local/mixkit; mkdir -p "$M"
  echo "$MIXKIT" | while read -r id slug; do
    [ -z "$id" ] && continue
    [ -s "$M/$id-$slug.mp4" ] && continue
    curl -sS --max-time 300 -o "$M/$id-$slug.mp4" "https://assets.mixkit.co/videos/$id/$id-1080.mp4" && echo "↓ $id-$slug.mp4"
  done
fi
echo "✔ готово: public/local/lottie, public/local/mixkit"
