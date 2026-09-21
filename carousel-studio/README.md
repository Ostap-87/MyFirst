# AI Carousel Studio

Локальный инструмент: по брифу о продукте/услуге собирает фото-карусель из 5–10 слайдов
(3:4, 1080×1440) — генерирует структуру и текст через Claude API, подбирает или генерирует
визуал, даёт отредактировать всё в canvas-редакторе и публикует в Instagram и Facebook.

Видео/Reels — вне объёма этой итерации.

## Статус по шагам

| Шаг | Что | Статус |
| --- | --- | --- |
| 1 | Backend skeleton + SQLite-схема (projects, slides, brand_presets, carousel_templates) | ✅ готово |
| 2 | CRUD брендовых пресетов и библиотеки шаблонов карусели | ✅ готово |
| 3 | Canvas-редактор на Fabric.js + Google Fonts | в работе |
| 4 | Безопасные зоны, авто-fit текста, точечная регенерация | — |
| 5 | ИИ-генерация текста (Claude API, библиотека фреймворков) | — |
| 6 | Визуал: Higgsfield / Pexels / Unsplash / загрузка | — |
| 7 | Публикация через Meta Graph API | — |
| 8 | Превью в рамке телефона | — |
| 9 | Сквозной тест полного цикла | — |

## Стек

Node.js + Fastify · SQLite · React + Fabric.js · Claude API · Higgsfield / Pexels / Unsplash ·
Google Fonts API · Meta Graph API.

## Запуск

```bash
cp .env.example .env      # и заполнить ключи
cd server
npm install
npm run migrate           # применить миграции, показать их список
npm start                 # http://127.0.0.1:3001
npm test                  # тесты API на in-memory БД
```

## Архитектура

```
Canvas-редактор (React+Fabric.js) ─┐
ИИ-генерация текста (Claude API) ──┼─→ Backend + SQLite ──→ Публикация (Meta Graph API)
Визуал (Higgsfield/Pexels/Unsplash)┘     (единый проект карусели)
```

Backend — единственный полностью внутренний узел и единственный источник правды.
Доступ к БД идёт через адаптер (`server/src/db/adapter.js`): сейчас SQLite, при переносе
на VPS рядом с контент-дашбордом добавляется адаптер к сетевой СУБД, схема не меняется.

## Модель данных

- **brand_presets** — шрифты, цвета, стиль изображений на бренд. Переопределяются точечно на слайде.
- **carousel_templates** — готовые структуры карусели по типу контента (массив слотов слайдов).
- **projects** — бриф, язык (ru/en), выбранные пресет и шаблон, размер холста, настройки, caption, хэштеги.
- **slides** — позиция, роль (hook/proof/value/cta), тип крючка, текст, canvas-JSON, источник и файл картинки,
  метаданные генерации, флаг `locked` (защита слайда от массовой регенерации).

### JSON слайда

`slides.text_content` — текстовая начинка, её заполняет ИИ:

```json
{ "kicker": "", "headline": "", "body": "", "cta": "" }
```

`slides.canvas` — оформление, его читает Fabric.js в редакторе и рендерер перед публикацией:

```json
{
  "version": 1,
  "size": { "width": 1080, "height": 1440 },
  "background": { "color": "#0B1F3A", "image": null,
                  "overlay": { "color": "#000000", "opacity": 0 } },
  "layers": [
    { "id": "…", "type": "text", "name": "headline", "text": "…",
      "box":  { "x": 80, "y": 120, "width": 920, "height": 432 },
      "font": { "family": "Montserrat", "weight": 700, "size": 96,
                "lineHeight": 1.1, "letterSpacing": 0, "italic": false },
      "color": "#FFFFFF", "align": "left", "valign": "top",
      "autoFit": { "enabled": true, "min": 36, "max": 140 },
      "rotation": 0, "opacity": 1, "zIndex": 10, "locked": false, "visible": true },
    { "id": "…", "type": "image", "name": "photo", "src": "/uploads/…", "box": { … },
      "fit": "cover", "zIndex": 1 },
    { "id": "…", "type": "shape", "name": "plate", "shape": "rect", "box": { … },
      "fill": "#000000", "radius": 24, "opacity": 0.6, "zIndex": 5 }
  ]
}
```

Любой вход нормализуется на бэкенде (`server/src/lib/slide-schema.js`): мусор отклоняется
с 400, слои сортируются по `zIndex`, пропущенные поля получают значения по умолчанию из
брендового пресета.

## API (шаг 1)

| Метод | Путь | Что делает |
| --- | --- | --- |
| GET | `/api/health` | проверка живости |
| GET | `/api/config` | размер холста, безопасные зоны, какие интеграции настроены |
| GET | `/api/projects` | список проектов (`limit`, `offset`, `status`) |
| POST | `/api/projects` | создать проект |
| GET | `/api/projects/:id` | проект (`?include=slides`) |
| PATCH | `/api/projects/:id` | обновить проект |
| DELETE | `/api/projects/:id` | удалить проект (слайды каскадом) |
| GET | `/api/projects/:id/slides` | слайды проекта по порядку |
| POST | `/api/projects/:id/slides` | добавить слайд (в конец или на `position`) |
| PUT | `/api/projects/:id/slides/reorder` | переставить: `{ "order": [slideId, …] }` |
| GET | `/api/slides/:id` | слайд |
| PATCH | `/api/slides/:id` | обновить текст / canvas / картинку / `locked` |
| DELETE | `/api/slides/:id` | удалить слайд (позиции уплотняются) |

## API (шаг 2)

| Метод | Путь | Что делает |
| --- | --- | --- |
| GET | `/api/brand-presets` | список пресетов |
| POST | `/api/brand-presets` | создать свой пресет |
| GET/PATCH | `/api/brand-presets/:id` | прочитать / заполнить шрифты, цвета, стиль |
| DELETE | `/api/brand-presets/:id` | удалить (встроенный — 409) |
| GET | `/api/carousel-templates` | список шаблонов (`?contentType=`) |
| POST | `/api/carousel-templates` | создать свой шаблон |
| GET/PATCH | `/api/carousel-templates/:id` | прочитать / изменить структуру |
| POST | `/api/carousel-templates/:id/clone` | склонировать (в т.ч. встроенный) под свои правки |
| DELETE | `/api/carousel-templates/:id` | удалить (встроенный — 409) |
| POST | `/api/projects/:id/apply-template` | развернуть шаблон в слайды-заготовки |

### Брендовые пресеты

Три встроенных пресета — `gtt`, `aura_robotics`, `ostapdotcenko` — создаются при первом старте
**пустыми**, со статусом `draft`: шрифты, цвета и стиль изображений не придуманы, их задаёт Остап
через `PATCH /api/brand-presets/:id` (позже — через UI). Пресет со статусом `draft` означает
«значений ещё нет» — редактор берёт нейтральные дефолты. Встроенные пресеты защищены от удаления,
но полностью редактируемы; посев идемпотентен и правки не затирает.

### Шаблоны карусели

Пять встроенных шаблонов: презентация товара, до/после, топ-5 фактов, разбор кейса,
мифы vs реальность. Каждый — массив слотов по схеме **хук → подтверждение → ценности → CTA**:

```json
{ "role": "value", "hookType": "myth_reality",
  "intent": "Миф 1 → реальность. Формулировка мифа, затем как на самом деле.",
  "fields": ["kicker", "headline", "body"] }
```

`intent` идёт в промпт ИИ на шаге 5, `fields` говорит, какие текстовые поля заполнять.
`POST /api/projects/:id/apply-template` разворачивает структуру в слайды-заготовки: текст пустой,
оформление — из брендового пресета проекта. `replace: true` пересобирает карусель,
сохраняя слайды с флагом `locked`.

## Генерация: агент-мост или API-ключ

Генерация текста (Claude) и изображений (Higgsfield) может идти двумя путями за одним интерфейсом.

**`agent` — через коннекторы Claude Code (ключи не нужны).** Приложение кладёт задание в очередь
в БД, агент-сессия Claude Code с подключёнными коннекторами забирает его, генерирует и пишет
результат обратно в проект. Работает на том доступе, который уже есть в аккаунте claude.ai.
Ограничение: генерация не мгновенная и требует запущенной агент-сессии — само по себе
приложение на `localhost:3001` к коннекторам обратиться не может, у него нет ни OAuth-клиента,
ни токена.

**`api` — по ключу из `.env` (приложение автономно).** Прямые HTTP-вызовы Claude API и
Higgsfield API. Нужны `ANTHROPIC_API_KEY` и `HIGGSFIELD_API_KEY`. Без ключа соответствующий
роут отвечает 503 с подсказкой, а не падает.

Путь выбирается в `.env` и переключается без изменения кода вызывающей стороны.

## Ключи

Все внешние ключи — в `.env` (шаблон в `.env.example`), в репозиторий не коммитятся.
Реальные значения брендовых пресетов, ключи и учётные данные задаёт Остап — код их не выдумывает.
