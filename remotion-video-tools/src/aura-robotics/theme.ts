import type { BrandTheme } from "../shared/theme";

/**
 * Aura Robotics — поставка и внедрение роботов.
 *
 * Значения сняты с боевого сайта aura-robotics.ru (CSS-переменные
 * --color-accent, --color-ink, --color-warm-parchment, --color-ash, --color-fog).
 * Фирменный кислотно-жёлтый #fff65d работает только как акцент на светлом фоне —
 * заливать им большие площади не нужно.
 * Правьте через `npm run set-theme -- --brand aura --key colors.accent --value "#..."`.
 */
export const auraRoboticsTheme: BrandTheme = {
  name: "Aura Robotics",
  colors: {
    primary: "#f8f6f3",
    accent: "#fff65d",
    text: "#262626",
    muted: "#8f8e8d",
    surface: "#ffffff",
    line: "#d9d7d5",
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

export default auraRoboticsTheme;
