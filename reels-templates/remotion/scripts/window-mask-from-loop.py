"""
Автоматическая маска окна: находит в видео-лупе пиксели, которые ДВИЖУТСЯ
(город за окном), и делает из них PNG-маску с мягкими краями.
Статичный интерьер в маску не попадает — он берётся из PNG и не «дышит».

Запуск:
  pip install opencv-python numpy --break-system-packages
  python scripts/window-mask-from-loop.py public/studio/night.mp4 public/studio/night-mask.png
Проверка: в Remotion Studio поставь debug = "mask".
Параметры: --pct (порог, по умолч. 80 — выше = маска меньше), --feather (размытие края, px).
"""
import argparse
import cv2
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("video")
ap.add_argument("out")
ap.add_argument("--pct", type=float, default=80)
ap.add_argument("--feather", type=int, default=41)
ap.add_argument("--size", default="1080x1920")
a = ap.parse_args()
W, H = map(int, a.size.split("x"))

cap = cv2.VideoCapture(a.video)
frames = []
while True:
    ok, f = cap.read()
    if not ok:
        break
    g = cv2.cvtColor(cv2.resize(f, (W // 2, H // 2)), cv2.COLOR_BGR2GRAY).astype(np.float32)
    frames.append(g)
if len(frames) < 10:
    raise SystemExit("Слишком мало кадров в видео")

std = np.stack(frames).std(axis=0)
std = cv2.GaussianBlur(std, (0, 0), 6)
thr = np.percentile(std, a.pct)
mask = (std > thr).astype(np.uint8) * 255

k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25))
mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, k, iterations=2)
mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, k, iterations=1)

# оставляем только крупные области (окно), мелкие «шевеления» интерьера выкидываем
n, labels, stats, _ = cv2.connectedComponentsWithStats(mask)
keep = np.zeros_like(mask)
min_area = 0.02 * mask.size
for i in range(1, n):
    if stats[i, cv2.CC_STAT_AREA] >= min_area:
        keep[labels == i] = 255

keep = cv2.resize(keep, (W, H), interpolation=cv2.INTER_LINEAR)
f = a.feather | 1
alpha = cv2.GaussianBlur(keep, (f, f), 0)
rgba = np.dstack([np.full_like(alpha, 255)] * 3 + [alpha])
cv2.imwrite(a.out, rgba)
print(f"✓ маска {a.out}: окно занимает {100 * (alpha > 127).mean():.1f}% кадра")
