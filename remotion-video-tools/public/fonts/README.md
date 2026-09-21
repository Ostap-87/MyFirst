# Шрифты проекта

Вариативные TTF (вес 100–900 в одном файле, с кириллицей), скачаны из
официального репозитория [google/fonts](https://github.com/google/fonts).

| Файл | Гарнитура | Где используется |
| --- | --- | --- |
| `Inter.ttf` | Inter | GlobalTechTour, Aura Robotics — заголовки и текст |
| `Unbounded.ttf` | Unbounded | ostapdotcenko — заголовки |
| `GolosText.ttf` | Golos Text | ostapdotcenko — основной текст |
| `JetBrainsMono.ttf` | JetBrains Mono | все бренды — цифры и тех. подписи |

Все четыре распространяются по [SIL Open Font License 1.1](https://openfontlicense.org/),
которая разрешает хранить их в репозитории и использовать в видео.

Лежат локально, а не тянутся с fonts.gstatic.com, чтобы рендер не зависел от
сети и давал одинаковый результат на любой машине. Подключение — в
`src/shared/fonts/index.ts`.
