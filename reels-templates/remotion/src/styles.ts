import { loadFont } from "@remotion/google-fonts/Nunito";

// Округлый жирный гротеск с кириллицей — ближайший бесплатный аналог шрифта субтитров автора.
// Можно заменить на Montserrat (ExtraBold/Black), Rubik Bold или свой брендовый.
export const { fontFamily: CAPTION_FONT } = loadFont("normal", {
  weights: ["900"],
  subsets: ["cyrillic", "latin"],
});

export const REEL = { width: 1080, height: 1920, fps: 30 } as const;

// Все «магические числа» стиля в одном месте — меняешь тут, меняется во всех шаблонах.
export const THEME = {
  captionColor: "#FFFFFF",
  captionStroke: "#15110E", // тёмная обводка текста
  captionStrokePx: 5,
  captionFontSize: 68, // при ширине кадра 1080
  captionTopPct: 0.53, // субтитры всегда на ~53% высоты (у автора 52–54%)
  captionMaxWidthPct: 0.86,
  splitRatio: 0.56, // где проходит шов сплит-скрина (56% высоты)
  featherPx: 160, // высота градиентной склейки между половинами
  splitZoom: 1.12, // «подъезд» к лицу, когда кадр сжимается в верхнюю половину
  stickerOutlinePx: 12, // толщина белой обводки у вырезанного спикера
  accent: "#FF3B30", // рамки-выделения на скринах
  grade: "contrast(1.06) saturate(1.08) sepia(0.06)", // лёгкий тёплый грейд
};
