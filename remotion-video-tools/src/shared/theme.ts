/**
 * Общий контракт темы бренда.
 *
 * Каждый бренд держит свой theme.ts в собственной папке
 * (src/<бренд>/theme.ts) и не знает о темах соседей.
 * Композиция бренда импортирует ТОЛЬКО свою тему — см. CLAUDE.md, правило 1.
 *
 * Скрипт `npm run set-theme` правит значения в этих файлах точечно,
 * поэтому структуру ниже (плоские группы colors / fonts / spacing
 * с литералами в кавычках) менять не стоит без правки скрипта.
 */

export type ThemeColors = {
  /** Основной цвет — фон сцены по умолчанию. */
  primary: string;
  /** Акцентный цвет — подсветка, плашки, ключевые слова. */
  accent: string;
  /** Цвет основного текста поверх primary. */
  text: string;
  /** Приглушённый текст: подписи, даты, служебные строки. */
  muted: string;
  /** Поверхность карточек и плашек поверх основного фона. */
  surface: string;
  /** Цвет тонких линий и разделителей. */
  line: string;
};

export type ThemeFonts = {
  /** Семейство для заголовков (имя как в Google Fonts). */
  heading: string;
  /** Семейство для основного текста. */
  body: string;
  /** Моноширинный: цифры, код, тех. подписи. */
  mono: string;
  /** Насыщенность заголовка. */
  headingWeight: number;
  /** Насыщенность основного текста. */
  bodyWeight: number;
};

/** Шаг сетки в пикселях для кадра 1920×1080. */
export type ThemeSpacing = {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
};

export type BrandTheme = {
  /** Человекочитаемое имя бренда — используется в титрах и логах. */
  name: string;
  colors: ThemeColors;
  fonts: ThemeFonts;
  spacing: ThemeSpacing;
};
