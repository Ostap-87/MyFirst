# Гейт по расшифровке: вне слов (с запасом) дорожка приглушается на −40 дБ плавными рампами.
# Убирает фоновые звуки в паузах между фразами (посуда, пила, чужие голоса), которые
# шумодав оставляет. Внутри речи ничего не трогает.
#   python3 scripts/voice-gate.py <in.wav> <out.wav> <captions.json> [запас_до_мс=120] [запас_после_мс=220]
import sys, json, numpy as np, soundfile as sf
src, dst, cap = sys.argv[1:4]
pre = int(sys.argv[4]) if len(sys.argv) > 4 else 120
post = int(sys.argv[5]) if len(sys.argv) > 5 else 220
x, sr = sf.read(src, dtype='float32')
if x.ndim > 1: x = x.mean(1)
mask = np.zeros(len(x), dtype=np.float32)
for w in json.load(open(cap)):
    a = max(0, int((w['startMs'] - pre) / 1000 * sr)); b = min(len(x), int((w['endMs'] + post) / 1000 * sr))
    mask[a:b] = 1.0
# сглаживание рамп 30 мс, чтобы гейт не щёлкал
k = int(sr * 0.03); kern = np.ones(k) / k
sm = np.convolve(mask, kern, mode='same'); sm = np.clip(sm, 0, 1)
floor = 10 ** (-40 / 20)
y = x * (floor + (1 - floor) * sm)
sf.write(dst, y, sr)
open_s = float(mask.mean()); print('✔', dst, f'речь {open_s*100:.0f}% времени, паузы приглушены на 40 дБ')
