"""Манэки-нэко: лапка вниз-вверх плавной деформацией всей картинки (puppet warp).

Фигурку не режем на слои — любой стык виден как рваная линия. Вместо этого
каждый кадр — вся картинка, деформированная полем весов w:
  w = 0 — якорь: голова со штрихом и каймой (круг), всё левее плеча, всё ниже лапы;
  w = 1 — ладошка с обводкой (правая часть, от x ≥ MX);
  между — w = dA / (dA + dM) по расстояниям до якоря и до ладошки: предплечье
  тянется, штрихи только изгибаются. Ширина перехода должна быть больше хода
  (AMP), иначе складка.
Сдвиг в кадре f: (DX, DY) · AMP · ½(1 − cos 2πf/PERIOD). Кадры — RGBA с
прозрачным фоном (белая подложка снята), бикубическая интерполяция.

Вход:  public/local/cat/open.png (стикер на белом, 1254×1254)
Выход: public/local/cat/warp/f00.png … f74.png, warp-w.png (поле весов),
       eyes-half.svg, eyes-closed.svg (заплатки глаз для моргания)
Запуск: python3 scripts/cat-warp.py [номера кадров]   (без аргументов — все)
Настройка через переменные окружения: AMP DX DY AR MX MDIL.
"""
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
from skimage import measure

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "public", "local", "cat") + os.sep
OUT = D + "warp" + os.sep
os.makedirs(OUT, exist_ok=True)
AMP = float(os.environ.get("AMP", 50))   # ход ладошки в нижней точке, px исходника
DX = float(os.environ.get("DX", 0))      # направление хода: строго вниз
DY = float(os.environ.get("DY", 1))
PERIOD = 37.5                            # 1,25 с при 30 fps
N = 75                                   # два периода — цикл на целом числе кадров

im = Image.open(D + "open.png").convert("RGB")
ImageDraw.Draw(im).ellipse((627 - 120, 855 - 120, 627 + 120, 855 + 120), fill=(255, 255, 255))  # кружок на груди — убрать
a = np.array(im).astype(float)
H, W = a.shape[:2]
s = a.sum(2)
nonwhite = s < 700
yy = np.arange(H)[:, None]
xx = np.arange(W)[None, :]
rr = np.hypot(xx - 618, yy - 384)        # круг головы: центр и радиус подобраны по внешнему краю каймы (r 352)

# --- якорь ---
A = rr <= int(os.environ.get("AR", 350))   # голова: штрих с запасом, переход начинается в белом предплечья
A |= (xx < 770) | (yy > 1010)              # всё левее плеча и ниже лапы; воротник не якорим — его конец плавно провисает
# --- ладошка ---
core = [(880, 663), (920, 652), (960, 650), (1000, 655), (1040, 670), (1070, 696), (1086, 730), (1088, 780),
        (1078, 820), (1058, 848), (1030, 856), (1000, 850), (975, 840), (950, 844), (925, 851), (898, 849),
        (878, 836), (858, 815), (841, 790), (834, 760), (837, 725), (845, 704), (855, 690)]
pc = Image.new("L", (W, H), 0)
ImageDraw.Draw(pc).polygon(core, fill=255)
M = (np.array(pc.filter(ImageFilter.MaxFilter(int(os.environ.get("MDIL", 31))))) > 0) & ~A
M &= xx >= int(os.environ.get("MX", 905))  # левая часть ладошки — уже в переходе: от якоря до неё не меньше 60 px
dA = ndimage.distance_transform_edt(~A)
dM = ndimage.distance_transform_edt(~M)
w = dA / np.maximum(dA + dM, 1e-6)
w[A] = 0
w[M] = 1
w = ndimage.gaussian_filter(w, 3)
w[A] = 0
w[M] = 1
Image.fromarray((w * 255).astype(np.uint8)).save(D + "warp-w.png")

# --- альфа: снять белую подложку, край каймы полупрозрачный ---
lab = measure.label(~nonwhite, connectivity=1)
ext = lab == lab[2, 2]
inside = ~ext
alpha = np.where(inside, 1.0, 0.0)
edge = ndimage.binary_dilation(ext, iterations=2) & inside
whiteness = np.clip((s - 600) / (765 - 600), 0, 1)
alpha[edge] = 1 - whiteness[edge]
al = alpha[:, :, None]
col = np.where(al > 0.02, (a - (1 - al) * 255) / np.maximum(al, 0.02), a)
rgba = np.dstack([np.clip(col, 0, 255), alpha * 255])

ys, xs = np.mgrid[0:H, 0:W].astype(float)


def frame(k):
    sy = ys - DY * AMP * k * w
    sx = xs - DX * AMP * k * w
    out = np.stack([ndimage.map_coordinates(rgba[:, :, c], [sy, sx], order=3, mode="nearest") for c in range(4)], 2)
    return np.clip(out, 0, 255).astype(np.uint8)


which = sys.argv[1:] or [str(i) for i in range(N)]
for f in which:
    f = int(f)
    k = 0.5 * (1 - math.cos(2 * math.pi * f / PERIOD))
    Image.fromarray(frame(k), "RGBA").save(OUT + f"f{f:02d}.png", optimize=True)


# --- глаза: заплатки для моргания (веко полуприкрыто / закрыто) ---
def eyes(kind):
    el = []
    for cx in (505, 735):
        if kind == "closed":
            el.append(f'<ellipse cx="{cx}" cy="425" rx="60" ry="58" fill="#fff"/>')
            el.append(f'<path d="M{cx-40} 447 A42 32 0 0 1 {cx+40} 447" fill="none" stroke="#000" stroke-width="17" stroke-linecap="round"/>')
        else:
            el.append(f'<rect x="{cx-58}" y="365" width="116" height="60" fill="#fff"/>')
            el.append(f'<path d="M{cx-40} 442 A42 32 0 0 1 {cx+40} 442" fill="none" stroke="#000" stroke-width="17" stroke-linecap="round"/>')
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">{"".join(el)}</svg>'


open(D + "eyes-closed.svg", "w").write(eyes("closed"))
open(D + "eyes-half.svg", "w").write(eyes("half"))
print("frames:", len(which), "→", OUT)
