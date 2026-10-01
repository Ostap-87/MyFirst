# Гейт пауз: участки, где после шумодава уровень ниже порога (нет речи), приглушаются
# на −30 дБ с плавными рампами и удержанием. Убирает посуду, пилу и чужие голоса
# в промежутках между словами — там, где шумодав оставляет остаток. Речь не трогает:
# порог −42 dBFS по огибающей 20 мс, слоги речи лежат выше −30.
#   python3 scripts/voice-gate.py <in.wav> <out.wav> [порог_дБ=-42] [ослабление_дБ=30] [удержание_мс=150]
import sys, numpy as np, soundfile as sf
src, dst = sys.argv[1], sys.argv[2]
thr = float(sys.argv[3]) if len(sys.argv) > 3 else -42.0
depth = float(sys.argv[4]) if len(sys.argv) > 4 else 30.0
hold_ms = float(sys.argv[5]) if len(sys.argv) > 5 else 150.0
x, sr = sf.read(src, dtype='float32')
if x.ndim > 1: x = x.mean(1)
hop = int(sr * 0.02)
n = len(x) // hop
rms = np.sqrt(np.mean(x[:n * hop].reshape(n, hop) ** 2, axis=1))
db = 20 * np.log10(rms + 1e-9)
open_ = db > thr
# удержание: после речи гейт закрывается не сразу
hold = int(hold_ms / 20)
ext = open_.copy()
for i in range(n):
    if open_[i]: ext[max(0, i - 2):min(n, i + hold + 1)] = True
mask = np.repeat(ext.astype(np.float32), hop)
mask = np.concatenate([mask, np.ones(len(x) - len(mask), dtype=np.float32)])
k = int(sr * 0.03); kern = np.ones(k) / k
sm = np.clip(np.convolve(mask, kern, mode='same'), 0, 1)
floor = 10 ** (-depth / 20)
sf.write(dst, x * (floor + (1 - floor) * sm), sr)
print('✔', dst, f'речь {ext.mean()*100:.0f}% времени, паузы −{depth:.0f} дБ')
