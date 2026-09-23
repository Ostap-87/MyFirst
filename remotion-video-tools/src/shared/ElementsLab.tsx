import { AbsoluteFill, Sequence } from "remotion";
import { z } from "zod";
import { VerticalBarChart } from "./components/elements/data/vertical-bar-chart/vertical-bar-chart";
import { LineChart } from "./components/elements/data/line-chart/line-chart";
import { PieChart } from "./components/elements/data/pie-chart/pie-chart";
import { NumberCounter } from "./components/elements/data/number-counter/number-counter";
import { AudioOscilloscope } from "./components/elements/audio/oscilloscope/audio-oscilloscope";

/**
 * ElementsLab — стенд для элементов Remotion.
 *
 * Нужен, чтобы посмотреть скачанные элементы вживую до того, как встраивать
 * их в брендовые композиции: у них зашиты свои данные, свои шрифты и свой
 * масштаб, и часть из этого придётся переделывать под наши правила.
 *
 * Элементы показываются как есть, без адаптации, — это проверка
 * работоспособности, а не образец вёрстки.
 */
export const elementsLabSchema = z.object({
  which: z
    .enum(["bars", "line", "pie", "counter", "scope"])
    .describe("Какой элемент показать"),
});

export type ElementsLabProps = z.infer<typeof elementsLabSchema>;

export const elementsLabDefaults: ElementsLabProps = { which: "bars" };

export const ElementsLab: React.FC<ElementsLabProps> = ({ which }) => (
  <AbsoluteFill
    style={{
      backgroundColor: "#0E1117",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Sequence>
      {which === "bars" ? <VerticalBarChart /> : null}
      {which === "line" ? <LineChart /> : null}
      {which === "pie" ? <PieChart /> : null}
      {which === "counter" ? <NumberCounter /> : null}
      {which === "scope" ? <AudioOscilloscope /> : null}
    </Sequence>
  </AbsoluteFill>
);

export default ElementsLab;
