import type { BrandTheme } from "../shared/theme";

/**
 * ostapdotcenko — личный бренд (B2B-маркетинг, Китай и ЮВА).
 *
 * Значения сняты с боевого сайта ostapdotcenko.ru (CSS-переменные
 * --color-deep, --color-yellow, --color-bone, --color-fog, --color-panel,
 * --color-dline). Тёмная версия: фон #12121a, акцент — фирменный жёлтый.
 * Правьте через `npm run set-theme -- --brand personal --key colors.accent --value "#..."`.
 */
export const ostapdotcenkoTheme: BrandTheme = {
  name: "ostapdotcenko",
  colors: {
    primary: "#12121a",
    accent: "#ffd92e",
    text: "#edeae2",
    muted: "#a3a2b0",
    surface: "#1c1c27",
    line: "#2a2a38",
  },
  fonts: {
    heading: "Unbounded",
    body: "Golos Text",
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

export default ostapdotcenkoTheme;
