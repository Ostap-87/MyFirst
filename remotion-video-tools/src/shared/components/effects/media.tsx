import { Img, OffthreadVideo, staticFile } from "remotion";
import { z } from "zod";
import { SiteShowcase } from "./SiteShowcase";

/**
 * Фото или видео по пути внутри public — общая часть врезок.
 *
 * Тип определяется по расширению: у врезок в одном ролике бывает и то и
 * другое, а заводить два поля ради этого — лишняя ошибка при заполнении.
 * Видео всегда без звука: говорит спикер, врезка его иллюстрирует.
 */
export const mediaItemSchema = z.object({
  src: z.string().describe("Фото или видео внутри public"),
  caption: z.string().optional().describe("Подпись под врезкой или геометка"),
  present: z
    .enum(["site"])
    .optional()
    .describe("site — скриншот сайта подаётся витриной: телефон с прокруткой"),
  title: z.string().optional().describe("Для витрины сайта: название"),
  url: z.string().optional().describe("Для витрины сайта: адрес на кнопке"),
  scrollTo: z.number().optional().describe("Для витрины сайта: до какой доли долистать"),
  seconds: z
    .number()
    .optional()
    .describe("Сколько держится этот кадр; без — делят остаток поровну"),
});

export type MediaItem = z.infer<typeof mediaItemSchema>;

const isVideo = (src: string) => /\.(mp4|mov|webm|m4v)$/i.test(src);

export const Media: React.FC<{
  readonly src: string;
  readonly style?: React.CSSProperties;
  readonly item?: Partial<MediaItem>;
  /** Где показ: в части кадра или на весь кадр — от этого раскладка витрины. */
  readonly variant?: "part" | "full";
}> = ({ src, style, item, variant }) => {
  // Скриншот сайта голым не показываем: это выглядит как картинка из
  // чата. Витрина подаёт его как продукт — в телефоне, с прокруткой.
  if (item?.present === "site") {
    return (
      <SiteShowcase
        src={src}
        title={item.title}
        url={item.url}
        scrollTo={item.scrollTo}
        variant={variant}
      />
    );
  }
  const common: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    ...style,
  };
  return isVideo(src) ? (
    <OffthreadVideo src={staticFile(src)} muted style={common} />
  ) : (
    <Img src={staticFile(src)} style={common} />
  );
};

/**
 * Параметры поверх значений по умолчанию, без `undefined`.
 *
 * Обычный `{ ...defaults, ...params }` затирает умолчание, если поле
 * передано явно пустым: композиция пробрасывает `side={b.side}`, и при
 * незаданной стороне карточки теряли позицию и слипались у левого края.
 */
export const withDefaults = <T extends object>(defaults: T, params: Partial<T>): T => ({
  ...defaults,
  ...(Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined),
  ) as Partial<T>),
});
