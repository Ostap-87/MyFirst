# Вырезка спикера из фона только на нужных отрезках (stages), остальное — прозрачные кадры.
# Итог — WebM VP9 с альфой той же длины, что съёмка: CutoutStage читает его по общей шкале времени.
# Нужны обе модели rembg (isnet-general-use, u2net_human_seg) — скачиваются при первом запуске.
# python3 scripts/cutout-ranges.py public/local/head/<ролик>.mp4 <out.webm> 14.6-19.5 41.7-47.2 ...
import sys, os, subprocess, shutil, tempfile
from PIL import Image, ImageChops
from rembg import remove, new_session
src, out, ranges = sys.argv[1], sys.argv[2], [tuple(map(float, r.split('-'))) for r in sys.argv[3:]]
FPS = 30
dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src]))
n = int(round(dur * FPS))
tmp = tempfile.mkdtemp(prefix='cut-')
frames = os.path.join(tmp, 'f'); os.makedirs(frames)
# кадры только нужных отрезков (с запасом 0,2 с) — иначе полный ролик в PNG не влезает на диск
for a, b in ranges:
    i0 = max(1, int((a - 0.2) * FPS) + 1)
    subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{(i0 - 1) / FPS:.4f}', '-i', src, '-t', f'{b - a + 0.4:.3f}', '-vf', f'fps={FPS}', '-q:v', '2', '-start_number', str(i0), os.path.join(frames, '%05d.jpg')], check=True)
w, h = Image.open(os.path.join(frames, sorted(os.listdir(frames))[0])).size
# Готовые кадры не складываются на диск (RGBA-PNG на 1080×1920 — по 2–3 МБ, полный ролик не влезал):
# они уходят в ffmpeg сырым потоком через stdin, прозрачные кадры — одним и тем же буфером нулей.
sess = new_session('isnet-general-use')
sess_h = new_session('u2net_human_seg')
def cut(im):
    a = remove(im, session=sess).split()[3]
    b = remove(im, session=sess_h).split()[3]
    o = im.convert('RGBA'); o.putalpha(ImageChops.darker(a, b)); return o
blank = bytes(w * h * 4)
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{w}x{h}', '-r', str(FPS), '-i', '-',
    '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '30', '-deadline', 'realtime', '-cpu-used', '8', '-row-mt', '1', '-auto-alt-ref', '0', out], stdin=subprocess.PIPE)
done = 0
for i in range(1, n + 1):
    t = (i - 1) / FPS
    f = os.path.join(frames, f'{i:05d}.jpg')
    if any(a - 0.2 <= t <= b + 0.2 for a, b in ranges) and os.path.exists(f):
        enc.stdin.write(cut(Image.open(f).convert('RGB')).tobytes()); os.remove(f); done += 1
        if done % 50 == 0: print('cut', done, flush=True)
    else:
        enc.stdin.write(blank)
enc.stdin.close(); enc.wait()
if enc.returncode: raise SystemExit(f'ffmpeg failed: {enc.returncode}')
shutil.rmtree(tmp); print('ok', out, 'frames', n, 'cut', done)
