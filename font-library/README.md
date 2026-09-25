# Библиотека креативных шрифтов

Локальная база бесплатных шрифтов для карусельных/видео-креативов
(GlobalTechTour, Aura Robotics, ostapdotcenko и будущие проекты) —
чтобы не искать шрифт заново каждый раз, а быстро показать пользователю
визуальные варианты и выбрать один по запросу.

## Структура

```
font-library/
├── catalog.json        — метаданные всех шрифтов (единственный источник правды)
├── fonts/<slug>/*.ttf   — сами файлы, лежат локально (без обращения к сети при рендере)
├── previews/<slug>.png — образец каждого шрифта (заголовок + текст + теги настроения)
├── previews/gallery.png — контактный лист со всеми шрифтами разом
└── scripts/
    ├── render-previews.mjs — генерирует previews/<slug>.png из catalog.json
    └── build-gallery.mjs   — собирает contact-sheet (весь каталог или по фильтру)
```

## Как выбрать шрифт по запросу пользователя

1. Открой `catalog.json` — у каждого шрифта есть `category` (стиль:
   `display-serif`, `editorial-serif`, `geometric-sans`, `handwritten-script`,
   `monospace` и т.д.) и `mood` (теги настроения: "роскошь", "техно",
   "дружелюбный" и т.п.) — фильтруй по смыслу задачи, а не перебирай всё руками.
2. Покажи пользователю картинку:
   - один шрифт — отправь `previews/<slug>.png` через SendUserFile;
   - несколько кандидатов — собери отфильтрованную галерею:
     ```bash
     node font-library/scripts/build-gallery.mjs <category-или-slug> <ещё...>
     # -> previews/gallery-filtered.png
     ```
     и отправь один файл вместо кучи мелких.
   - «покажи вообще всё, что есть» — отправь готовый `previews/gallery.png`
     (не нужно перегенерировать, если каталог не менялся).
3. После того как пользователь выбрал шрифт — используй файл из
   `fonts/<slug>/...ttf` напрямую в проекте (Remotion шрифты подключаются
   через `remotion-video-tools/src/shared/fonts`, см. его `README.md`;
   для других инструментов — просто путь к `.ttf`).

## Как добавить новый шрифт

Формат письма в `catalog.json` — смотри существующие записи как образец.
Обязательные поля: `slug`, `family`, `category`, `mood`, `cyrillic`,
`weights` (список `{weight, file}`), `source`, `source_url`, `license`.

Самый надёжный бесплатный источник — Google Fonts. Файлы удобнее всего
тянуть не из git-репозитория `google/fonts` (он у нас недоступен напрямую),
а через CSS API, который отдаёт прямую ссылку на `.ttf` на fonts.gstatic.com:

```bash
curl -s -A "Mozilla/5.0" \
  "https://fonts.googleapis.com/css2?family=Имя+Шрифта:wght@400;700&subset=cyrillic,latin" \
  | grep -oE 'https://fonts.gstatic.com/[^)]+\.ttf'
# затем curl -o fonts/<slug>/<Имя>-<Начертание>.ttf <ссылка>
```

Проверяй лицензию на странице `https://fonts.google.com/specimen/<Имя>` —
почти всё там под OFL-1.1 или Apache-2.0, обе разрешают хранить файлы в
репозитории и использовать в коммерческих креативах.

После добавления записи в `catalog.json` — перегенерируй превью:

```bash
node font-library/scripts/render-previews.mjs   # обновит previews/<slug>.png
node font-library/scripts/build-gallery.mjs      # обновит previews/gallery.png
```

## Почему так, а не иначе

- **Локальные файлы, не CDN-ссылки** — тот же принцип, что и в
  `remotion-video-tools/public/fonts/`: рендер не должен зависеть от сети
  и должен давать одинаковый результат на любой машине.
- **Один `catalog.json`, а не разбросанные заметки** — чтобы выборку по
  стилю/настроению можно было делать программно (grep/jq/скрипт), а не
  вспоминать, что где лежит.
- **Картинки, а не только имена шрифтов** — пользователь выбирает шрифт
  визуально, а не по названию, которое ничего не говорит без примера
  кириллического текста (многие шрифты выглядят прилично на латинице и
  разваливаются на кириллице — поэтому у каждой записи есть флаг `cyrillic`
  и образец рендерится именно на русском тексте).
- **Playwright для рендера превью** — уже установлен и настроен в этом
  окружении (Chromium в `/opt/pw-browsers`), не тянет новых зависимостей.

## Текущий каталог (2026-09-23, 16 шрифтов)

| Категория | Шрифты |
|---|---|
| display-serif / editorial-serif | Yeseva One, Playfair Display, Spectral, Alegreya, PT Serif, Philosopher |
| geometric / modern sans | Rubik, Comfortaa, Montserrat Alternates, Wix Madefor Display, Ruda |
| handwritten | Amatic SC, Bad Script, Neucha |
| monospace | IBM Plex Mono, Fira Code (только латиница) |

Источник вдохновения по части подбора — статья [«Где брать (действительно)
модные шрифты для digital»](https://medium.com/design-pub/где-брать-действительно-модные-шрифты-для-digital-28ccf0cb9c65)
(Denis Zolotarev): бóльшая часть упомянутых там гарнитур платная, в каталог
взяты только явно бесплатные идеи оттуда (Spectral, IBM Plex, PT Root UI и
Fira Code — из них PT Root UI не найден в открытом доступе как отдельный
загружаемый файл, поэтому заменён на PT Serif от того же ParaType с той же
философией «кириллица как родная», а не адаптация с латиницы).
