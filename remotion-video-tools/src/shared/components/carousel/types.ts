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
    cornerTheme,
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
