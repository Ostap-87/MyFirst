# Вырезка спикера из фона только на нужных отрезках (stages), остальное — прозрачные кадры.
# Итог — WebM VP9 с альфой той же длины, что съёмка: CutoutStage читает его по общей шкале времени.
# python3 scripts/cutout-ranges.py public/local/head/<ролик>.mp4 <out.webm> 14.6-19.5 41.7-47.2 ...
import sys, os, subprocess, shutil, tempfile
from PIL import Image
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
blank = os.path.join(tmp, 'blank.png'); Image.new('RGBA', (w, h), (0, 0, 0, 0)).save(blank)
sess = new_session('isnet-general-use')
outdir = os.path.join(tmp, 'o'); os.makedirs(outdir)
done = 0
for i in range(1, n + 1):
    t = (i - 1) / FPS
    dst = os.path.join(outdir, f'{i:05d}.png')
    if any(a - 0.2 <= t <= b + 0.2 for a, b in ranges):
        f = os.path.join(frames, f'{i:05d}.jpg')
        if not os.path.exists(f): os.link(blank, dst); continue
        remove(Image.open(f).convert('RGB'), session=sess).save(dst); done += 1
        if done % 50 == 0: print('cut', done, flush=True)
    else:
        os.link(blank, dst)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(FPS), '-i', os.path.join(outdir, '%05d.png'), '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', '30', '-deadline', 'realtime', '-cpu-used', '8', '-row-mt', '1', '-auto-alt-ref', '0', out], check=True)
shutil.rmtree(tmp); print('ok', out, 'frames', n, 'cut', done)
