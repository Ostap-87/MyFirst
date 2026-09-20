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
 * Все четыре файла — вариативные (weight 100–900 в одном файле) и содержат
 * кириллицу: тексты у нас русские.
 */

type FontName = "Inter" | "Unbounded" | "Golos Text" | "JetBrains Mono";

const FILES: Record<FontName, string> = {
  Inter: "fonts/Inter.ttf",
  Unbounded: "fonts/Unbounded.ttf",
  "Golos Text": "fonts/GolosText.ttf",
  "JetBrains Mono": "fonts/JetBrainsMono.ttf",
};

const FAMILIES = Object.keys(FILES) as FontName[];

for (const family of FAMILIES) {
  loadFont({
    family,
    url: staticFile(FILES[family]),
    weight: "100 900",
    format: "truetype",
  }).catch((err) => {
    // Кадр не должен молча уехать системным шрифтом — пусть видно в логе рендера.
    console.error(`Не удалось загрузить шрифт ${family}:`, err);
  });
}

const isKnown = (name: string): name is FontName =>
  (FAMILIES as string[]).indexOf(name) !== -1;

/**
 * Имя шрифта из theme.ts -> значение для CSS font-family.
 * Незнакомое имя отдаётся с системным стеком в хвосте, чтобы кадр не падал,
 * если в теме указали гарнитуру, которой нет в public/fonts.
 */
export const fontFamily = (name: string): string =>
  isKnown(name) ? `"${name}", sans-serif` : `"${name}", system-ui, sans-serif`;
