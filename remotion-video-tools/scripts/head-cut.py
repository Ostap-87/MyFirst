# Вырезать оговорку из готового ролика Head: съёмка, расшифровка и черновик сдвигаются вместе.
# python3 scripts/head-cut.py <ролик> <черновик.json> <от> <до> [слово-замена для первого токена после выреза]
# Пример: python3 scripts/head-cut.py s29-intro data/head/s29.json 52.33 52.75
import sys, json, subprocess, shutil, os
name, draft, a, b = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4])
d = b - a
src = f'public/local/head/{name}.mp4'; bak = f'public/local/head/{name}-before-cut.mp4'
if not os.path.exists(bak): shutil.copy(src, bak)
tmp = f'public/local/head/{name}-cut.mp4'
dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', bak]))
if b >= dur - 0.05:
    # Вырез до самого конца: второй кусок пустой, acrossfade на нём висит вечно — просто обрезаем.
    b = dur
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', bak, '-t', f'{a:.3f}', '-af', 'afade=t=out:st=' + f'{max(0, a - 0.05):.3f}' + ':d=0.05',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', tmp], check=True)
else:
  subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', bak, '-filter_complex',
    f'[0:v]trim=0:{a},setpts=PTS-STARTPTS[v0];[0:v]trim={b},setpts=PTS-STARTPTS[v1];[v0][v1]concat=n=2:v=1:a=0[v];'
    f'[0:a]atrim=0:{a},asetpts=PTS-STARTPTS[a0];[0:a]atrim={b},asetpts=PTS-STARTPTS[a1];[a0][a1]acrossfade=d=0.02[a]',
    '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', tmp], check=True)
d = b - a
os.replace(tmp, src)
j = json.load(open(draft)); p = j['props']
cap = 'public/' + p['captionsSrc']; words = json.load(open(cap)); out = []
for w in words:
    s, e = w['startMs'] / 1000, w['endMs'] / 1000
    if s >= a and e <= b + 0.02: continue                     # слово целиком в вырезе
    if s < a and e > a: e = a                                 # хвост подрезан
    if s < b and e > b: s = b                                 # начало подрезано
    if s >= b: s -= d; e -= d
    out.append({**w, 'startMs': int(round(s * 1000)), 'endMs': int(round(e * 1000))})
json.dump(out, open(cap, 'w'), ensure_ascii=False, indent=1)
def sh(t): return round(t - d, 2) if t > b else (a if t > a else t)
for key, val in list(p.items()):
    if isinstance(val, list):
        for it in val:
            if isinstance(it, dict):
                for k in ('at', 'until'):
                    if k in it: it[k] = sh(it[k])
p['durationSeconds'] = round(p['durationSeconds'] - d, 2)
json.dump(j, open(draft, 'w'), ensure_ascii=False, indent=1)
print('cut', a, b, 'delta', round(d, 3), 'duration', p['durationSeconds'], 'words', len(out))
