# Перенос таймингов черновика на новую расшифровку того же ролика (после перерезки пауз):
# слова сопоставляются по тексту (difflib), каждое время события переезжает вместе с
# ближайшим словом, а между словами — пропорционально.
# python3 scripts/head-retime.py <старые captions.json> <новые captions.json> <черновик.json> [длительность нового ролика]
import sys, json, difflib, bisect
old, new, draft = [json.load(open(p)) for p in sys.argv[1:4]]
clean = lambda t: t.strip().lower().replace('ё','е')
so = difflib.SequenceMatcher(None, [clean(w['text']) for w in old], [clean(w['text']) for w in new], autojunk=False)
pairs = [(i + k, j + k) for tag, i1, i2, j1, j2 in so.get_opcodes() if tag == 'equal' for k in range(i2 - i1) for i, j in [(i1, j1)]]
xs = [old[i]['startMs'] / 1000 for i, j in pairs]; ys = [new[j]['startMs'] / 1000 for i, j in pairs]
xs.append(old[-1]['endMs'] / 1000); ys.append(new[-1]['endMs'] / 1000)
def f(t):
    k = bisect.bisect_left(xs, t)
    if k == 0: return round(t + ys[0] - xs[0], 2)
    if k >= len(xs): return round(t + ys[-1] - xs[-1], 2)
    x0, x1, y0, y1 = xs[k-1], xs[k], ys[k-1], ys[k]
    return round(y0 + (t - x0) * (y1 - y0) / max(x1 - x0, 1e-6), 2)
p = draft['props']; n = 0
for key, val in list(p.items()):
    if isinstance(val, list):
        for it in val:
            if isinstance(it, dict):
                for kk in ('at', 'until'):
                    if kk in it: it[kk] = f(it[kk]); n += 1
p['durationSeconds'] = float(sys.argv[4]) if len(sys.argv) > 4 else round(new[-1]['endMs'] / 1000 + 0.3, 2)
json.dump(draft, open(sys.argv[3], 'w'), ensure_ascii=False, indent=1)
print('matched words', len(pairs), '/', len(old), 'retimed', n, 'duration', p['durationSeconds'])
