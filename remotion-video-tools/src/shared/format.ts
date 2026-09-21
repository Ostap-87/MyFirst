import { useVideoConfig } from "remotion";

/**
 * Работа с тремя форматами кадра: 16:9, 9:16 и 1:1 / 4:5.
 *
 * Главная ловушка мультиформатности — кегль в пикселях: 92px в кадре 1920
 * читаются как крупный заголовок, а в кадре 1080 занимают половину строки.
 * Поэтому размеры задаём долей от ширины кадра, а не абсолютом.
 */

export type Orientation = "landscape" | "vertical" | "square";

/**
 * Безопасные поля в долях от стороны кадра.
 *
 * Вертикаль перекрывают интерфейсы: сверху — шапка канала и прогресс сторис,
 * снизу — подпись, кнопки реакций и поле ответа. Текст, попавший под них,
 * зритель просто не увидит, поэтому низ режем сильнее верха.
 */
export const SAFE_AREAS = {
  /** Видео и кружки в Telegram, сторис. */
  telegram: { top: 0.07, bottom: 0.16, sides: 0.06 },
  /** Instagram Reels: снизу подпись, аватар и панель кнопок справа. */
  reels: { top: 0.1, bottom: 0.22, sides: 0.07 },
  /** YouTube Shorts: снизу описание и кнопка канала. */
  shorts: { top: 0.08, bottom: 0.24, sides: 0.06 },
  /** Горизонталь: полей нужно меньше, интерфейс кадр не перекрывает. */
  landscape: { top: 0.06, bottom: 0.08, sides: 0.05 },
  /** Лента 1:1 и 4:5: обрезается редко, но запас по краям нужен. */
  feed: { top: 0.06, bottom: 0.08, sides: 0.06 },
  /**
   * Карусель Instagram. Слайд 4:5 показывается в ленте целиком, но в сетке
   * профиля обрезается до квадрата по центру: верхние и нижние 10% высоты
   * там не видно. Поля считаны с этого запаса — заголовок и цифры должны
   * оставаться внутри квадрата, иначе превью в профиле теряет смысл.
   */
  carousel: { top: 0.12, bottom: 0.12, sides: 0.08 },
} as const;

export type SafeAreaName = keyof typeof SAFE_AREAS;

/**
 * Ориентация кадра и помощники для размеров, не зависящих от формата.
 *
 * `fs(0.05)` — кегль в 5% ширины кадра: одинаково читается и в 1920, и в 1080.
 * `sp(0.02)` — то же для отступов.
 */
export const useFormat = () => {
  const { width, height, fps, durationInFrames } = useVideoConfig();

  const orientation: Orientation =
    width > height ? "landscape" : width === height ? "square" : "vertical";

  return {
    width,
    height,
    fps,
    durationInFrames,
    orientation,
    isVertical: orientation === "vertical",
    isLandscape: orientation === "landscape",
    isSquare: orientation === "square",
    /** Размер шрифта долей ширины кадра. */
    fs: (fraction: number) => Math.round(width * fraction),
    /** Отступ долей ширины кадра. */
    sp: (fraction: number) => Math.round(width * fraction),
    /**
     * Отступ долей ВЫСОТЫ кадра — для вертикальных позиций.
     * Считать их от ширины нельзя: в кадре 1080×1920 отступ «12% ширины»
     * от низа поднимает элемент на 6.75% высоты, и субтитры уезжают в центр.
     */
    vh: (fraction: number) => Math.round(height * fraction),
    /** Безопасная зона по умолчанию для текущей ориентации. */
    defaultSafeArea: (orientation === "landscape"
      ? "landscape"
      : orientation === "square"
        ? "feed"
        : "telegram") as SafeAreaName,
  };
};
