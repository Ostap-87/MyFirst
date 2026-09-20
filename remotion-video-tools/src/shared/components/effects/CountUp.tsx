import { Easing, interpolate, useCurrentFrame } from "remotion";
import { z } from "zod";

/**
 * CountUp — отсчёт числа с торможением к финалу: 0 → 3 790.
 *
 * Главный приём для контента на статистике: зритель ждёт, на какой цифре
 * счётчик остановится, и досматривает сцену. Кривая `Easing.out(expo)` —
 * резкий старт и долгое затухание: число «почти доехало» уже к середине,
 * а последние проценты добираются медленно, что и создаёт ожидание.
 *
 * Цифры выводятся табличными (`tabular-nums`): у пропорциональных цифр
 * разная ширина, и число дёргается по горизонтали на каждом кадре.
 */
export const countUpSchema = z.object({
  from: z.number().describe("Начальное значение"),
  to: z.number().describe("Конечное значение"),
  delayInFrames: z
    .number()
    .int()
    .min(0)
    .describe("Через сколько кадров начать отсчёт"),
  durationInFrames: z
    .number()
    .int()
    .min(1)
    .describe("Длительность отсчёта в кадрах"),
  decimals: z.number().int().min(0).max(4).describe("Знаков после запятой"),
  compact: z
    .boolean()
    .describe(
      "Сокращать большие числа: 100000000 -> «100 млн», 2500000000 -> «2,5 млрд»",
    ),
  prefix: z.string().describe("Текст перед числом, например «+» или «₽»"),
  suffix: z.string().describe("Текст после числа, например «%» или «шт.»"),
});

export type CountUpParams = z.infer<typeof countUpSchema>;

/** Любой параметр можно опустить — возьмётся значение из countUpDefaults. */
export type CountUpProps = Partial<CountUpParams> & {
  readonly style?: React.CSSProperties;
};

export const countUpDefaults: CountUpParams = {
  from: 0,
  to: 100,
  delayInFrames: 0,
  durationInFrames: 45,
  decimals: 0,
  compact: false,
  prefix: "",
  suffix: "",
};

/** Неразрывный пробел: разделитель разрядов по-русски (3 790, а не 3,790). */
const NBSP = " ";

const groupDigits = (value: string): string => {
  const parts = value.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return parts.join(",");
};

/**
 * Форматирует число по-русски: разряды через неразрывный пробел, дробная
 * часть через запятую, при compact — «млн» и «млрд» вместо шести нулей.
 */
export const formatRu = (
  value: number,
  decimals: number,
  compact: boolean,
): string => {
  if (compact && Math.abs(value) >= 1_000_000) {
    const isBillions = Math.abs(value) >= 1_000_000_000;
    const divided = value / (isBillions ? 1_000_000_000 : 1_000_000);
    // У сокращённых чисел один знак после запятой читается лучше, чем ноль:
    // «2,5 млрд» информативнее, чем «3 млрд».
    const short = groupDigits(divided.toFixed(divided % 1 === 0 ? 0 : 1));
    return `${short}${NBSP}${isBillions ? "млрд" : "млн"}`;
  }

  return groupDigits(value.toFixed(decimals));
};

export const CountUp: React.FC<CountUpProps> = ({ style, ...params }) => {
  const {
    from,
    to,
    delayInFrames,
    durationInFrames,
    decimals,
    compact,
    prefix,
    suffix,
  } = { ...countUpDefaults, ...params };
  const frame = useCurrentFrame();

  const value = interpolate(
    frame - delayInFrames,
    [0, durationInFrames],
    [from, to],
    {
      easing: Easing.out(Easing.exp),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return (
    <span style={{ fontVariantNumeric: "tabular-nums", ...style }}>
      {prefix}
      {formatRu(value, decimals, compact)}
      {suffix}
    </span>
  );
};
