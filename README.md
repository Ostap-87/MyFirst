# MyFirst

Репозиторий контента и инструментов для трёх брендов: **GlobalTechTour**,
**Aura Robotics** и личного бренда **ostapdotcenko**.

В корне два блока: **чем делаем** и **что публикуем**.

```
MyFirst/
│
├── remotion-video-tools/     ИНСТРУМЕНТ — код, которым всё делается
│   ├── src/                  композиции и компоненты (Remotion)
│   ├── scripts/              команды: рендер, карусели, субтитры, публикация
│   ├── data/                 сценарии каруселей, подписи, контент-план
│   ├── public/               шрифты, звуки, сгенерированные картинки
│   ├── docs/                 разбор референсов, настройка публикации
│   └── out/                  результаты рендера (в git НЕ хранятся)
│
├── content/                  КОНТЕНТ — все каналы в одном месте
│   ├── instagram/
│   │   ├── globaltechtour/
│   │   │   ├── queue.json    очередь аккаунта: что и когда
│   │   │   ├── published.json  архив вышедшего
│   │   │   ├── photo/        карусели и фото
│   │   │   └── video/        ролики
│   │   ├── aura/
│   │   └── personal/
│   ├── youtube/              то же устройство, публикация не подключена
│   ├── threads/
│   └── tiktok/
│
├── tg-images/                Telegram — вне content/, см. ниже
│   ├── globaltechtour/
│   └── aura/
│
└── .github/workflows/        РАСПИСАНИЕ — публикация по времени
```

**Почему Telegram не в `content/`.** Он работает с августа 2026, посты уже
вышли, а Telegram забирает фото по вшитой ссылке
`raw.githubusercontent.com/.../tg-images/...`. Переезд папки сломает картинки
в опубликованных постах задним числом. Подробности и план подключения —
в [docs/channels.md](./remotion-video-tools/docs/channels.md).

## Канал → бренд → очередь

У каждого бренда **свой аккаунт в каждой сети**, поэтому у него своя папка,
своя очередь и свой токен:

```
content/instagram/globaltechtour/  → аккаунт GTT,  токен IG_TOKEN_GTT
content/instagram/aura/            → аккаунт Aura, токен IG_TOKEN_AURA
content/instagram/personal/        → личный,       токен IG_TOKEN_PERSONAL
```

Внутри аккаунта контент разведён по виду — это разные производственные
процессы: карусель собирается рендером слайдов, ролик монтируется со звуком
и субтитрами.

```
content/instagram/globaltechtour/photo/2026-09-25-carousel-robotics-expedition/
content/instagram/globaltechtour/video/2026-09-26-reel-china-hook/
```

**Очередь при этом одна на аккаунт.** Она описывает расписание ленты, а лента
у аккаунта одна: с раздельными очередями легко поставить карусель и ролик на
одно время и выдать два поста подряд.

Пост физически лежит в папке того аккаунта, куда он пойдёт, — перепутать
нельзя. Весь план по всем каналам и брендам показывает одна команда:

```bash
npm run q
```

```
━━ Instagram
   GlobalTechTour: в очереди 1, вышло 0
     · 25.09.2026, 10:00  carousel robotics-expedition
   Aura Robotics: пусто
   ostapdotcenko: пусто

━━ YouTube  (публикация ещё не подключена)
   …
```

Что нужно для подключения YouTube, Threads и TikTok —
в [docs/channels.md](./remotion-video-tools/docs/channels.md).

## Как отличить видео от карусели

**По имени папки.** Тип стоит в названии сразу после даты:

| Папка                                               | Что это                |
| --------------------------------------------------- | ---------------------- |
| `photo/2026-09-25-**carousel**-robotics-expedition` | карусель из 8 картинок |
| `video/2026-09-26-**reel**-china-hook`              | вертикальный ролик     |

Сначала папка вида, дальше дата — список внутри вида сортируется
хронологически, а тип виден без открытия папки. То же самое дублируется внутри — в `meta.json` поле
`type`, и в выводе `npm run q` отдельной колонкой:

```
  В очереди: 2
    · 25.09.2026, 10:00  carousel  robotics-expedition
    · 26.09.2026, 19:00  reel      china-hook
```

## Где что делается

| Задача              | Где                    | Команда                                                                         |
| ------------------- | ---------------------- | ------------------------------------------------------------------------------- |
| Собрать карусель    | `remotion-video-tools` | `npm run carousel -- --input data/<файл>.json`                                  |
| Собрать ролик       | `remotion-video-tools` | `npx remotion render <композиция> out/<имя>.mp4`                                |
| Поставить в очередь | `remotion-video-tools` | `npm run q:add -- --channel instagram --brand aura --carousel <имя> --at "..."` |
| Посмотреть план     | `remotion-video-tools` | `npm run q`                                                                     |
| Опубликовать        | расписание или вручную | `npm run publish -- --due`                                                      |

Правила работы с проектом — в [remotion-video-tools/CLAUDE.md](./remotion-video-tools/CLAUDE.md).
Каналы, лимиты и что нужно для подключения — в [docs/channels.md](./remotion-video-tools/docs/channels.md).
Настройка публикации в Instagram — в [docs/publishing.md](./remotion-video-tools/docs/publishing.md).
Хранилище картинок Telegram — в [tg-images/README.md](./tg-images/README.md).

## Что где хранится, а что нет

**В git хранится:** код инструмента, сценарии и подписи, готовый контент для
публикации, архив вышедшего, сгенерированные картинки.

**В git не хранится** (`.gitignore`): `node_modules`, результаты рендера в
`out/`, модели распознавания речи в `whisper.cpp/`, чужие и тяжёлые исходники
в `public/local/`. Поэтому рабочая папка весит больше гигабайта, а сам
репозиторий — десятки мегабайт.
