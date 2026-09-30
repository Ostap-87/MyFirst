import { AbsoluteFill } from "remotion";
import { z } from "zod";
import { FlagWave } from "./components/effects";

/**
 * Shared-FlagClip — развевающийся флаг на весь кадр, рендерится в файл и
 * подкладывается фоном за вырезанного спикера (stages в ChinaStories берут
 * видео так же, как фото). Первые полсекунды — вход пружиной, при сборке их
 * отрезаем: npx remotion render <bundle> Shared-FlagClip out.mp4 --props='{"src":"local/flags/cn.svg"}'
 */
export const flagClipSchema = z.object({
  src: z.string().describe("Флаг внутри public (3:2)"),
  widthFraction: z.number().describe("Ширина флага, доля ширины кадра: 2,7 закрывает вертикальный кадр"),
  amplitude: z.number().describe("Размах волны"),
  wavesPerSecond: z.number().describe("Скорость волны"),
  strips: z.number().int().describe("Полос в полотне"),
  x: z.number().describe("Центр флага по ширине, доля кадра: больше 1 — в кадре остаётся левая часть со звёздами"),
});

export const flagClipDefaults: z.infer<typeof flagClipSchema> = {
  src: "local/flags/cn.svg",
  widthFraction: 2.7,
  amplitude: 0.035,
  wavesPerSecond: 0.9,
  strips: 60,
  x: 1.15,
};

export const FlagClip: React.FC<z.infer<typeof flagClipSchema>> = (p) => (
  <AbsoluteFill style={{ backgroundColor: "#b3121b", overflow: "hidden" }}>
    <FlagWave
      src={p.src}
      x={p.x}
      y={0.5}
      widthFraction={p.widthFraction}
      amplitude={p.amplitude}
      wavesPerSecond={p.wavesPerSecond}
      strips={p.strips}
      exitFrames={1}
    />
  </AbsoluteFill>
);
