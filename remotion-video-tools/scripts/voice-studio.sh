#!/bin/bash
# Студийный голос для роликов Head (утверждено владельцем 01.10, вариант «A»):
#   DeepFilterNet3 два прохода с пост-фильтром → гейт по расшифровке (паузы −40 дБ)
#   → мягкий эквалайзер → компрессор 2,2:1 → loudnorm −16 LUFS → mux в ролик.
#   scripts/voice-studio.sh <ролик.mp4 или .wav> <captions.json> <out.mp4|out.wav>
# Нужен venv с deepfilternet (+ патч torchaudio.backend, см. docs/process.md) и модель DeepFilterNet3 в $DFN_MODEL.
# Не делать: Resemble enhance / VoiceFixer (хрип), сильные подъёмы 3–10 кГц на уже
# обработанном звуке (владелец забраковал: «шумы и хрип»).
set -e
src=$1; cap=$2; out=$3; S=${SCRATCH:-/tmp/claude-0/-home-user-MyFirst/d8f731fa-451e-5f50-828b-588e47c668d1/scratchpad}
VENV=${VENV:-$S/venv}; DFN_MODEL=${DFN_MODEL:-$S/audio/dfn3/DeepFilterNet3}
W=$(mktemp -d); trap 'rm -rf "$W"' EXIT
CHAIN="highpass=f=85,equalizer=f=220:t=q:w=1.0:g=-2.5,equalizer=f=2500:t=o:w=1.2:g=1.5,highshelf=f=9000:g=1,acompressor=threshold=-22dB:ratio=2.2:attack=10:release=150:makeup=3"
ffmpeg -v error -y -i "$src" -vn -ac 1 -ar 48000 -f wav $W/src.wav
source "$VENV/bin/activate"
python3 scripts/voice-dfn.py $W/src.wav $W/dfn.wav "$DFN_MODEL" 2 2>&1 | grep -v -i warn | tail -1
python3 scripts/voice-gate.py $W/dfn.wav $W/gated.wav "$cap"
ffmpeg -v error -y -i $W/gated.wav -af "$CHAIN" $W/eq.wav
LN=$(ffmpeg -hide_banner -i $W/eq.wav -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | python3 -c "
import sys,json; t=sys.stdin.read(); j=json.loads(t[t.rindex('{'):]); print(f\"loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true\")")
ffmpeg -v error -y -i $W/eq.wav -af "$LN" -ar 48000 $W/voice.wav
case "$out" in
  *.wav) cp $W/voice.wav "$out" ;;
  *) ffmpeg -v error -y -i "$src" -i $W/voice.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart "$out" ;;
esac
echo "✔ $out"
