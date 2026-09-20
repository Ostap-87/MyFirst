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
  globaltechtour/    theme.ts + compositions/ + assets/
  aura-robotics/     theme.ts + compositions/ + assets/
  ostapdotcenko/     theme.ts + compositions/ + assets/
  shared/
    components/effects/   FadeIn, SlideInSpring, ZoomParallax, GlitchTransition
    fonts/                локальная загрузка шрифтов из public/fonts
    theme.ts              общий тип BrandTheme
    EffectsLab.tsx        витрина эффектов на нейтральных данных
  Root.tsx           реестр всех композиций
public/fonts/        Inter, Unbounded, Golos Text, JetBrains Mono (вариативные TTF)
scripts/             new-effect / new-composition / set-theme
```

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

Лежат локально в `public/fonts` (вариативные TTF с кириллицей, OFL) и грузятся
через `@remotion/fonts`, который держит кадр до готовности шрифта. Сеть при
рендере не нужна — см. `public/fonts/README.md`.
