import { z } from "zod";

/**
 * Слайды карусели Instagram.
 *
 * Карусель — не «видео по кадрам», а последовательность самостоятельных
 * картинок: каждую листают отдельно, и каждая должна читаться без соседних.
 * Поэтому у слайда есть тип, который определяет вёрстку, а не свободный
 * набор блоков.
 */
// В "framed"-режиме (GTT) в левом верхнем углу лежит плашка с сайтом поверх
// резкой (не размытой) части фото — единого цвета текста на все фото не
// бывает: под ним то светлый интерьер, то насыщенное небо. cornerTheme
// говорит, что там на конкретном фото: "light" — тёмный текст на светлой
// подложке (по умолчанию), "dark" — светло-серый текст на тёмной подложке.
const cornerTheme = z
  .enum(["light", "dark"])
  .describe(
    "Что под плашкой сайта в левом верхнем углу фото: 'light' — светлый участок (тёмный текст), 'dark' — тёмный/насыщенный участок (светлый текст). По умолчанию 'light'",
  )
  .optional();

// Точечная поправка положения текстового блока для одного конкретного
// слайда (не меняет общий шаблон) — доля высоты кадра, на которую текст
// опускается ниже стандартной позиции.
const textLower = z
  .number()
  .min(0)
  .max(0.1)
  .describe("На сколько (доля высоты кадра) опустить текст ниже обычного — точечно для этого слайда")
  .optional();

// Обратное textLower — поднимает текстовый блок выше обычного (например,
// чтобы освободить место под крупную картинку/иероглифы над текстом).
const textRaise = z
  .number()
  .min(0)
  .max(0.1)
  .describe("На сколько (доля высоты кадра) поднять текст выше обычного — точечно для этого слайда")
  .optional();

export const slideSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("cover"),
    kicker: z.string().describe("Надстрочник: рубрика или дата"),
    title: z.string().describe("Крупный хук — ради него открывают карусель"),
    subtitle: z.string().describe("Подзаголовок под хуком"),
    image: z.string().describe("Фон-картинка из public; пусто — фирменный фон"),
    cornerTheme,
  }),
  z.object({
    type: z.literal("point"),
    index: z.number().int().min(1).describe("Номер пункта"),
    title: z.string().describe("Заголовок пункта"),
    text: z.string().describe("Раскрытие в 1–3 предложения"),
    image: z.string().describe("Фон-картинка из public; пусто — фирменный фон").optional(),
    logos: z
      .array(
        z.union([
          z.string(),
          z.object({
            src: z.string().describe("Путь к логотипу в public"),
            scale: z
              .number()
              .describe(
                "Во сколько раз увеличить логотип внутри чипа — нужно, когда у исходного файла лого много внутренних полей (квадратная иконка-марка вместо широкого ворднейма) и на стандартной высоте оно выглядит мельче соседних",
              )
              .optional(),
          }),
        ]),
      )
      .describe(
        "Реальные логотипы упомянутых брендов (пути в public) — показываются рядом с номером пункта, над заголовком",
      )
      .optional(),
    cornerTheme,
    noFrost: z
      .boolean()
      .describe(
        "Убрать размытую светлую frosted-панель снизу фото — нужно, когда панель закрывает слишком много важного на снимке (например лицо/задний план на портретном фото). Вместо панели — лёгкий тёмный градиент только у самого низа, текст белый, в компактной белой плашке.",
      )
      .optional(),
    logoStack: z
      .array(z.string())
      .describe(
        "Альтернатива logos для случая 'два-три крупных отдельных логотипа друг под другом' (например 'работал в X и Y') — каждый на своей полноширинной белой плашке, а не мелким чипом в ряд",
      )
      .optional(),
  }),
  z.object({
    type: z.literal("metric"),
    value: z.number().describe("Число"),
    prefix: z.string().describe("Текст перед числом"),
    suffix: z.string().describe("Текст после числа"),
    compact: z.boolean().describe("Сокращать до «млн» / «млрд»"),
    label: z.string().describe("Что означает цифра"),
    source: z.string().describe("Источник данных — подпись мелким"),
    image: z.string().describe("Фон-картинка из public; пусто — фирменный фон").optional(),
    cornerTheme,
  }),
  z.object({
    type: z.literal("quote"),
    text: z.string().describe("Цитата"),
    author: z.string().describe("Кто сказал"),
    image: z.string().describe("Фон-картинка из public; пусто — фирменный фон").optional(),
    cornerTheme,
    textScale: z
      .number()
      .describe("Во сколько раз увеличить размер текста цитаты (например для крупных иероглифов)")
      .optional(),
    textRaise,
  }),
  z.object({
    type: z.literal("image"),
    image: z.string().describe("Картинка из public"),
    caption: z.string().describe("Подпись под картинкой"),
    cornerTheme,
  }),
  z.object({
    type: z.literal("cta"),
    title: z.string().describe("Призыв"),
    text: z.string().describe("Что получит подписчик"),
    keyword: z.string().describe("Кодовое слово для директа; пусто — без поля"),
    handle: z.string().describe("Ник автора"),
    image: z.string().describe("Фон-картинка из public; пусто — фирменный фон").optional(),
    cornerTheme,
    textLower,
  }),
]);

export type Slide = z.infer<typeof slideSchema>;

export const carouselSchema = z.object({
  slides: z.array(slideSchema).min(1).describe("Слайды по порядку"),
  index: z.number().int().min(0).describe("Какой слайд рендерим (0 — первый)"),
  showCounter: z.boolean().describe("Показывать счётчик «3 / 7»"),
  showSwipeHint: z
    .boolean()
    .describe("Показывать подсказку «листай» на первом слайде"),
  footer: z
    .string()
    .describe(
      "Подпись внизу каждого слайда: сайт или ник. Пусто — без подписи",
    ),
});

export type CarouselProps = z.infer<typeof carouselSchema>;
