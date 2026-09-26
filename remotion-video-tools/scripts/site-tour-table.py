#!/usr/bin/env python3
"""Монтажный стол промо сайта: картинка с таймингом по блокам.

    python3 scripts/site-tour-table.py <lang> <папка с кадрами> <выход.jpg>

Время идёт сверху вниз, как лента на телефоне. По каждому блоку — кадр из
готового ролика, реплика, куски записи со скоростью, планы камеры и
наложения, всё с секундами.
"""
import json, sys, os, glob
from PIL import Image, ImageDraw, ImageFont

lang, frames_dir, out = sys.argv[1:4]
P = json.load(open(f'data/site-tour/{lang}.json'))
TXT = {
 'ru': ['А вы тоже сталкивались с тем, что организаторы технологических экспедиций напускают загадочности…',
        'Больше девятисот компаний. Семнадцать индустрий. Всё в одном месте — globaltechtour.ru.',
        'Каталог индустрий — это всё, что можно изучить…',
        'В «Экспедициях» — готовые маршруты. Вот, например, программа по робототехнике…',
        'Всё то же самое — с телефона, в дороге…',
        'Если готового маршрута нет — жмёте «Собрать свою программу»…',
        'Отдельный раздел — корпоративное обучение… Huawei, Alibaba, Xiaomi…',
        'Заявка — прямо на сайте… от заявки до посещения… десять дней.'],
 'en': ['Have you also dealt with tech expedition organizers who play it mysterious…',
        'Over nine hundred companies. Seventeen industries…',
        'The Catalogue is everything you can explore…',
        'Expeditions are ready-made routes. Take the robotics program…',
        'All the same from your phone…',
        'No ready route? Click “Build your own program”…',
        'A separate section is Corporate training… Huawei, Alibaba, Xiaomi…',
        'Apply right on the site… From application to visit… ten days.'],
}[lang]
PAGES = {2: ['адрес', 'главная'], 3: ['клик «Каталог»', 'каталог индустрий'], 4: ['меню «Экспедиции»', '«Готовые экспедиции»', 'карточка Robotics', 'страница программы, карта'],
         6: ['«Собрать свою программу»', 'выбор индустрии'], 7: ['меню', 'корпоративное обучение']}
SHOT = {1.0: 'общий план'}
F = lambda s, w='Inter': ImageFont.truetype(f'public/fonts/{w}.ttf', s)
col = {'head': '#f59e0b', 'screen': '#3b82f6', 'phone': '#10b981'}
ts = lambda f: f'{f/30:05.2f}'
thumbs = sorted(glob.glob(os.path.join(frames_dir, 'f*.jpg')))

W = 1080
rows = []
for bi, b in enumerate(P['blocks']):
    ev = []
    segs = [s for s in P['screen'] if b['from'] <= s['from'] < b['to']]
    for k, s in enumerate(segs):
        name = PAGES.get(b['i'], [''] * 9)[k] if k < len(PAGES.get(b['i'], [])) else ''
        ev.append((s['from'], f'запись {s["rec"]:.1f} с · ×{s["rate"]:.2f} · {name}', '#9cc2ff'))
    for sh in P['shots']:
        if b['from'] <= sh['frame'] < b['to'] and b['kind'] == 'screen':
            what = 'общий план' if sh['scale'] == 1 else f'наезд ×{sh["scale"]:.2f}'
            ev.append((sh['frame'], f'камера: {what}', '#c4b5fd'))
    if P['stat']['from'] < b['to'] and P['stat']['from'] >= b['from']:
        ev.append((P['stat']['from'], f'«{P["stat"]["value"]}+ {P["stat"]["label"]}»', '#fcd34d'))
    if b['from'] <= P['ticker']['from'] < b['to']:
        ev.append((P['ticker']['from'], 'бегущая строка индустрий', '#fcd34d'))
    if b['i'] == 4:
        for c, f in zip(P['route']['cities'], P['route']['frames']):
            if f is not None: ev.append((f, f'город: {c}', '#fcd34d'))
    if b['i'] == 5:
        ev.append((P['phone']['from'], f'телефон · запись ×{P["phone"]["rate"]:.2f}', '#6ee7b7'))
    if b['kind'] == 'head':
        h = [x for x in P['heads'] if x['from'] <= b['from'] + 5][-1]
        ev.append((b['from'], 'в кадре пока прогулка (заглушка) — сюда встанет твой дубль', '#fdba74'))
    if b['i'] == 8:
        ev.append((P['cta']['from'], 'плашка globaltechtour.ru, затем «10 дней»', '#fcd34d'))
    ev.sort()
    rows.append((b, ev))

H = 170 + sum(290 + max(0, len(ev) - 4) * 34 for _, ev in rows) + 40
img = Image.new('RGB', (W, H), '#0b0e14'); d = ImageDraw.Draw(img)
d.text((40, 36), f'МОНТАЖНЫЙ СТОЛ · ПРОМО {lang.upper()}', font=F(32, 'Unbounded'), fill='#8FD4FF')
d.text((40, 90), f'60,00 с · 1800 кадров · 1080×1920 · 30 к/с', font=F(28), fill='#c9ccd6')
y = 150
for (b, ev), th in zip(rows, thumbs):
    h = 270 + max(0, len(ev) - 4) * 34
    d.rounded_rectangle((24, y, W - 24, y + h), radius=18, fill='#141922', outline=col[b['kind']], width=3)
    im = Image.open(th); im.thumbnail((140, 250)); img.paste(im, (40, y + 12))
    x = 200
    d.text((x, y + 14), f'{b["i"]}  {ts(b["from"])} – {ts(b["to"])} с', font=F(30, 'JetBrainsMono'), fill=col[b['kind']])
    line, words, yy = '', TXT[b['i'] - 1].split(), y + 58
    for w in words:
        if d.textlength(line + ' ' + w, font=F(24)) > W - x - 50:
            d.text((x, yy), line, font=F(24), fill='#eef0f5'); yy += 30; line = w
        else: line = (line + ' ' + w).strip()
    d.text((x, yy), line, font=F(24), fill='#eef0f5'); yy += 42
    for f, txt, c in ev:
        d.text((x, yy), ts(f), font=F(22, 'JetBrainsMono'), fill='#8a90a0')
        d.text((x + 100, yy), txt, font=F(22), fill=c); yy += 34
    y += h + 20
img = img.crop((0, 0, W, y + 20))
img.save(out, quality=90)
print(out, img.size)
