import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

/**
 * Загрузка шрифтов для всех брендов.
 *
 * Шрифты лежат локально в public/fonts и подключаются через @remotion/fonts:
 * он держит кадр (delayRender) до готовности шрифта, поэтому рендер никогда
 * не уходит с подменённой гарнитурой. Локальные файлы вместо CDN — чтобы
 * рендер не зависел от сети и был воспроизводим на любой машине и в CI.
 *
 * Все файлы вариативные (weight 100–900 в одном файле) и содержат кириллицу.
 * Noto Sans SC добавляется фоллбэком ко всем гарнитурам: в постах постоянно
 * встречаются китайские названия (NIO / 蔚来, XPeng / 小鹏), а в Inter,
 * Unbounded и Golos Text иероглифов нет — без него кадр уезжает на системный
 * шрифт или показывает пустые квадраты.
 */

type FontName = "Inter" | "Unbounded" | "Golos Text" | "JetBrains Mono";

/** Гарнитура с иероглифами: подставляется в конец каждого стека. */
const CJK_FALLBACK = "Noto Sans SC";

const FILES: Record<FontName | typeof CJK_FALLBACK, string> = {
  Inter: "fonts/Inter.ttf",
  Unbounded: "fonts/Unbounded.ttf",
  "Golos Text": "fonts/GolosText.ttf",
  "JetBrains Mono": "fonts/JetBrainsMono.ttf",
  [CJK_FALLBACK]: "fonts/NotoSansSC.woff2",
};

const FAMILIES = Object.keys(FILES) as (FontName | typeof CJK_FALLBACK)[];

for (const family of FAMILIES) {
  const file = FILES[family];
  loadFont({
    family,
    url: staticFile(file),
    weight: "100 900",
    format: file.endsWith(".woff2") ? "woff2" : "truetype",
  }).catch((err) => {
    // Кадр не должен молча уехать системным шрифтом — пусть видно в логе рендера.
    console.error(`Не удалось загрузить шрифт ${family}:`, err);
  });
}

const isKnown = (name: string): name is FontName =>
  (FAMILIES as string[]).indexOf(name) !== -1;

/**
 * Имя шрифта из theme.ts -> значение для CSS font-family.
 *
 * Иероглифы берутся из Noto Sans SC автоматически: браузер подставляет
 * следующую гарнитуру стека только для тех символов, которых нет в первой.
 * Незнакомое имя отдаётся с системным стеком в хвосте, чтобы кадр не падал,
 * если в теме указали гарнитуру, которой нет в public/fonts.
 */
export const fontFamily = (name: string): string =>
  isKnown(name)
    ? `"${name}", "${CJK_FALLBACK}", sans-serif`
    : `"${name}", "${CJK_FALLBACK}", system-ui, sans-serif`;
