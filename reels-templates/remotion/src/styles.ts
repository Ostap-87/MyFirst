import { cancelRender, continueRender, delayRender, staticFile } from "remotion";

// Округлый жирный гротеск с кириллицей — ближайший бесплатный аналог шрифта субтитров автора.
// Можно заменить на Montserrat (ExtraBold/Black), Rubik Bold или свой брендовый.
//
// Шрифт лежит в public/fonts, а не грузится с Google Fonts: браузер рендера
// не доверяет сертификату прокси и получает ERR_CERT_AUTHORITY_INVALID на
// fonts.gstatic.com. Субтитры тогда падали на системный шрифт. Файлы те же
// самые — Nunito 900, кириллица и латиница, — скачаны оттуда же, но заранее.
export const CAPTION_FONT = "Nunito";

const SUBSETS = [
  {
    file: "fonts/nunito-900-cyrillic.woff2",
    range: "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116",
  },
  {
    file: "fonts/nunito-900-latin.woff2",
    range:
      "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, " +
      "U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, " +
      "U+2212, U+2215, U+FEFF, U+FFFD",
  },
];

// Рендер ждёт шрифт: без этого первые кадры уходят системным шрифтом.
if (typeof document !== "undefined") {
  const waitForFont = delayRender("Шрифт субтитров Nunito 900");
  Promise.all(
    SUBSETS.map((s) => {
      const face = new FontFace(CAPTION_FONT, `url(${staticFile(s.file)}) format("woff2")`, {
        weight: "900",
        unicodeRange: s.range,
      });
      document.fonts.add(face);
      return face.load();
    }),
  )
    .then(() => continueRender(waitForFont))
    .catch((err) => cancelRender(err));
}

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
