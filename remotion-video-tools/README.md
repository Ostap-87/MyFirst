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
