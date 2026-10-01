#!/bin/bash
# Студийный голос для роликов Head: Resemble denoise (только denoise, без enhance) →
# эквалайзер «чистый» → де-эссер → мягкий компрессор → лимитер → loudnorm −16 LUFS → mux в ролик.
#   scripts/voice-studio.sh public/local/head/<ролик>-tight.mp4 public/local/head/<ролик>.mp4
# Нужен venv с resemble_enhance: $VENV (по умолчанию scratchpad/venv) и заглушки в $STUBS.
# Цепочка подобрана на съёмке с петличкой на груди: горб 120–500 Гц («звук из трубы»)
# срезается, 3–6 кГц поднимаются, «воздух» выше 10 кГц возвращается.
set -e
src=$1; out=$2; S=${SCRATCH:-/tmp/claude-0/-home-user-MyFirst/d8f731fa-451e-5f50-828b-588e47c668d1/scratchpad}
VENV=${VENV:-$S/venv}; STUBS=${STUBS:-$S/stubs}; DEN=${DEN:-$S/s27a/den1.py}
W=$(mktemp -d); trap 'rm -rf "$W"' EXIT
CHAIN="highpass=f=110:p=2,equalizer=f=160:t=o:w=1:g=-3,equalizer=f=320:t=o:w=1.5:g=-6,equalizer=f=650:t=o:w=1:g=-2,equalizer=f=1500:t=o:w=1:g=1,equalizer=f=3000:t=o:w=1.2:g=3.5,equalizer=f=6000:t=o:w=1:g=4,highshelf=f=10000:g=3,deesser=i=0.5,acompressor=threshold=-18dB:ratio=3.5:attack=5:release=110:makeup=4,alimiter=limit=0.95:level=false"
ffmpeg -v error -y -i "$src" -vn -ac 1 -ar 44100 -f wav $W/src.wav
source "$VENV/bin/activate"; PYTHONPATH="$STUBS" python3 "$DEN" $W/src.wav $W/den.wav >/dev/null
ffmpeg -v error -y -i $W/den.wav -af "$CHAIN" $W/eq.wav
LN=$(ffmpeg -hide_banner -i $W/eq.wav -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | python3 -c "
import sys,json; t=sys.stdin.read(); j=json.loads(t[t.rindex('{'):]); print(f\"loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true\")")
ffmpeg -v error -y -i $W/eq.wav -af "$LN" -ar 48000 $W/voice.wav
ffmpeg -v error -y -i "$src" -i $W/voice.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$out"
echo "✔ $out"
