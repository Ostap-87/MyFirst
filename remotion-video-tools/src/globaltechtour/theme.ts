import type { BrandTheme } from "../shared/theme";

/**
 * GlobalTechTour (GTT) — деловые туры и делегации.
 *
 * Значения сняты с боевого сайта globaltechtour.ru (CSS-переменные
 * --color-electric-iris, --color-bone-white, --color-surface, --color-ash-gray),
 * чтобы видео совпадало с сайтом по цвету один в один.
 * Правьте через `npm run set-theme -- --brand gtt --key colors.accent --value "#..."`.
 */
export const globaltechtourTheme: BrandTheme = {
  name: "GlobalTechTour",
  colors: {
    primary: "#eeeef2",
    accent: "#2563eb",
    text: "#17171d",
    muted: "#6b6b76",
    surface: "#ffffff",
    line: "#d5d5dd",
  },
  fonts: {
    heading: "Inter",
    body: "Inter",
    mono: "JetBrains Mono",
    headingWeight: 700,
    bodyWeight: 400,
  },
  spacing: {
    xs: 8,
    sm: 16,
    md: 32,
    lg: 64,
    xl: 120,
  },
};

export default globaltechtourTheme;
