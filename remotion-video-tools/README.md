# remotion-video-tools

Remotion-проект (React + TypeScript) для видео трёх независимых брендов:

| Бренд          | Папка                 | Композиции   | Сайт              |
| -------------- | --------------------- | ------------ | ----------------- |
| GlobalTechTour | `src/globaltechtour/` | `GTT-*`      | globaltechtour.ru |
| Aura Robotics  | `src/aura-robotics/`  | `Aura-*`     | aura-robotics.ru  |
| ostapdotcenko  | `src/ostapdotcenko/`  | `Personal-*` | ostapdotcenko.ru  |

Темы (`theme.ts`) заполнены реальными токенами с боевых сайтов — цвета в видео
совпадают с сайтом один в один.

Правила, по которым агент работает в этом репозитории, — в [CLAUDE.md](./CLAUDE.md).

## Старт

```bash
npm install
npm run dev          # Remotion Studio на http://localhost:3000
```

## Структура

```
src/
  globaltechtour/    theme.ts + compositions/ (Intro, Stats, PostReel) + assets/
  aura-robotics/     theme.ts + compositions/ (Intro, PostReel) + assets/
  ostapdotcenko/     theme.ts + compositions/ (Intro, Reel) + assets/
  shared/
    components/effects/   FadeIn, SlideInSpring, ZoomParallax, GlitchTransition,
                          CountUp, FilmGrain, MotionTrail
    components/           MetricCard, SafeArea, PostReelLayout, KaraokeCaptions
    fonts/                локальная загрузка шрифтов из public/fonts
    format.ts             useFormat + безопасные зоны площадок
    theme.ts              общий тип BrandTheme
    EffectsLab.tsx        витрина эффектов на нейтральных данных
    MotionLab.tsx         витрина переходов, смаза и зерна
  Root.tsx           реестр всех композиций
public/fonts/        Inter, Unbounded, Golos Text, JetBrains Mono, Noto Sans SC
public/tg-images     симлинк на ../../tg-images — картинки постов
data/posts.json      контент-план, разобранный для пакетного рендера
scripts/             new-effect / new-composition / set-theme /
                     parse-content-plan / render-batch / transcribe
```

## Ролики из контент-плана

Сорок постов из `tg-images/20-day-batch.md` и картинки к ним превращаются
в вертикальные ролики без ручной сборки:

```bash
npm run parse-plan                                  # -> data/posts.json (40 постов)
npm run render-batch -- --brand gtt --limit 3       # три ролика GTT
npm run render-batch -- --brand all --platform reels
npm run render-batch -- --brand aura --dry-run      # только показать план
```

Бандл собирается один раз на весь пакет, поэтому сорок роликов занимают
около двенадцати минут, а не сорок отдельных сборок. `--crf` управляет весом
файла: 23 по умолчанию (≈3,6 МБ на 8 секунд), 18 — визуально без потерь и вчетверо тяжелее.

## Субтитры

```bash
npm run transcribe -- --audio public/audio/reel.wav --model small
```

Локальный whisper.cpp: ни ключей, ни отправки аудио наружу. Результат —
`data/captions.json` для компонента `KaraokeCaptions` с пословной подсветкой.
Нужен ffmpeg (приведение к 16 кГц моно). Модели качаются в `whisper.cpp/`,
эта папка в `.gitignore`.

## Форматы

`useFormat()` даёт `fs()` и `sp()` — размеры долей ширины кадра, поэтому одна
вёрстка работает в 16:9, 9:16 и 1:1. `<SafeArea platform="telegram" />`
держит текст вне зоны, которую перекрывает интерфейс площадки
(`telegram`, `reels`, `shorts`, `landscape`, `feed`).

## Скрипты

```bash
# новый эффект в shared/components/effects (+ экспорт + строка в README эффектов)
npm run new-effect -- --name ZoomBlur --what "резкий наезд со смазом"

# новая композиция бренда (+ автоматическая регистрация в Root.tsx)
npm run new-composition -- --brand aura --name CaseStudy
npm run new-composition -- --brand personal --name Reel --format vertical --duration 300

# точечная правка одного значения темы
npm run set-theme -- --brand aura --key colors.accent --value "#40e0d0"
npm run set-theme -- --brand gtt --key colors.accent          # показать текущее

# проверки и рендер
npm run lint
npx remotion still Shared-EffectsLab out/test.png --frame=60
npx remotion render GTT-Intro out/gtt-intro.mp4
```

Бренды в `--brand`: `gtt`, `aura`, `personal`.
Форматы в `--format`: `landscape` (1920×1080), `vertical` (1080×1920), `square` (1080×1080).

## Шрифты

Лежат локально в `public/fonts` (вариативные, с кириллицей, OFL) и грузятся
через `@remotion/fonts`, который держит кадр до готовности шрифта. Сеть при
рендере не нужна — см. `public/fonts/README.md`.

Noto Sans SC подставляется фоллбэком ко всем гарнитурам: в постах постоянно
встречаются китайские названия (NIO / 蔚来, XPeng / 小鹏), а в Inter, Unbounded
и Golos Text иероглифов нет.

## Разговорный формат

`Personal-TalkingHead` — готовая раскладка ролика с говорящей головой:
номер пункта, вставка скриншота, переписка с индикатором набора, счётчик,
нижний призыв с печатающимся кодовым словом, финальная карточка и звуковые
акценты. Место под съёмку помечено в коде комментарием — туда ставится
`<OffthreadVideo>` и `<Audio>`.

Откуда взялись эти приёмы и какие у них замеренные тайминги —
в [docs/reference-breakdown.md](./docs/reference-breakdown.md).

## Звук

```bash
npm run make-sfx     # click, pop, swoosh, notify, counter -> public/audio/sfx
```

Звуки синтезируются ffmpeg прямо в проекте: ни лицензий, ни атрибуции,
и результат воспроизводим. Ставятся компонентом `SoundCue`.

## Материалы и субтитры

Съёмка, звук и субтитры передаются путями в пропсах — код править не нужно:

```bash
npm run transcribe -- --audio public/local/speech.wav --model small --language ru \
  --out public/local/captions.json

npx remotion render Personal-TalkingHead out/reel.mp4 --props='{
  "captionsSrc": "local/captions.json",
  "footageSrc":  "local/talk.mp4",
  "audioSrc":    "local/speech.m4a",
  "captionFont": "Onest",
  "captionStyle":"outline"
}'
```

Длительность ролика считается сама по последнему слову субтитров. Гарнитуры
субтитров: Onest, Inter, Golos Text, Montserrat, Manrope — сравнение с
референсом в [docs/reference-breakdown.md](./docs/reference-breakdown.md).
Оформление: `shadow`, `outline`, `plate`.

`public/local/` в `.gitignore` — туда кладутся тяжёлые и чужие исходники.

## Карусели Instagram

```bash
npm run carousel -- --input data/carousel.example.json      # по сценарию
npm run carousel -- --slug nio-battery-swap --points 3      # из поста плана
npm run carousel -- --slug ... --square --footer "сайт.ру"  # 1:1 с подписью
npm run carousel -- --input ... --dry-run                   # только план слайдов
```

Каждый слайд сохраняется отдельным PNG 1080×1350 с нумерацией — загружать
в Instagram в том же порядке. Типы слайдов: `cover`, `point`, `metric`,
`quote`, `image`, `cta`. Композиции `GTT-Carousel`, `Aura-Carousel`,
`Personal-Carousel` доступны и в Studio — слайды листаются полем `index`.

Главное на слайде держится в центральном квадрате: в сетке профиля кадр 4:5
обрезается до 1:1, и верх с низом там не видно.
