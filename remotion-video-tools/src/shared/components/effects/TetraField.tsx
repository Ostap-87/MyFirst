import {
  AbsoluteFill,
  interpolate,
  random,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { chinaOutline } from "../../data/china-outline";

/**
 * TetraField — поле летающих тетраэдров, собирающееся в контур страны.
 *
 * Повторяет приём с главной страницы сайта: сначала элементы разбросаны по
 * пространству и дрейфуют, затем сходятся в очертания Китая.
 *
 * ——— Почему не WebGL ———
 *
 * На сайте это three.js. В рендере Remotion живой WebGL пришлось бы ждать
 * покадрово и надеяться, что драйвер в контейнере отдаст тот же результат.
 * Плоские треугольники в SVG дают ту же картину, считаются предсказуемо и
 * не зависят от видеокарты.
 *
 * Глубина изображается размером и прозрачностью: дальние элементы мельче и
 * бледнее. Этого хватает, чтобы поле читалось объёмным.
 *
 * ——— Почему random из Remotion ———
 *
 * Math.random дал бы новую раскладку на каждом кадре, и поле бы мерцало.
 * random(seed) возвращает одно и то же для одного зерна, поэтому каждая
 * частица всю сцену держится своей траектории.
 */
export const tetraFieldSchema = z.object({
  count: z
    .number()
    .int()
    .min(20)
    .max(400)
    .describe("Сколько тетраэдров в кадре"),
  gatherFrom: z
    .number()
    .describe("Секунда, когда элементы начинают сходиться в фигуру"),
  gatherTo: z.number().describe("Секунда, когда фигура собрана"),
  scale: z
    .number()
    .min(0.2)
    .max(1.5)
    .describe("Размер собранной фигуры в долях ширины кадра"),
  centerY: z
    .number()
    .min(0)
    .max(1)
    .describe("Где по высоте стоит центр фигуры"),
  color: z.string().describe("Цвет элементов"),
  seed: z.number().describe("Зерно раскладки: меняет расстановку целиком"),
});

export type TetraFieldProps = z.infer<typeof tetraFieldSchema>;

export const tetraFieldDefaults: TetraFieldProps = {
  count: 200,
  gatherFrom: 1.2,
  gatherTo: 3.6,
  scale: 0.78,
  centerY: 0.42,
  color: "#2563eb",
  seed: 7,
};

/** Треугольник, изображающий тетраэдр: грань плюс два ребра внутрь. */
const Tetra: React.FC<{
  readonly size: number;
  readonly turn: number;
  readonly color: string;
  readonly opacity: number;
}> = ({ size, turn, color, opacity }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 100 100"
    style={{ transform: `rotate(${turn}deg)`, overflow: "visible" }}
  >
    <polygon
      points="50,8 92,80 8,80"
      fill={color}
      fillOpacity={opacity * 0.45}
      stroke={color}
      strokeOpacity={opacity}
      strokeWidth={5}
      strokeLinejoin="round"
    />
    <line x1="50" y1="8" x2="50" y2="80" stroke={color} strokeOpacity={opacity * 0.5} strokeWidth={3} />
  </svg>
);

export const TetraField: React.FC<TetraFieldProps> = ({
  count,
  gatherFrom,
  gatherTo,
  scale,
  centerY,
  color,
  seed,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const second = frame / fps;

  const span = width * scale;
  const cx = width / 2;
  const cy = height * centerY;

  // Насколько поле собралось: 0 — разбросано, 1 — фигура готова.
  const gather = interpolate(second, [gatherFrom, gatherTo], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const eased = gather * gather * (3 - 2 * gather); // плавный вход и выход

  const items = [];
  for (let i = 0; i < count; i += 1) {
    const target = chinaOutline[i % chinaOutline.length];
    const s = seed * 1000 + i;

    // Стартовая точка — за пределами кадра по кругу: элементы влетают
    // снаружи, а не проявляются на месте.
    const angle = random(`a${s}`) * Math.PI * 2;
    const far = 0.75 + random(`r${s}`) * 0.7;
    const startX = cx + Math.cos(angle) * width * far;
    const startY = cy + Math.sin(angle) * height * far * 0.7;

    // Глубина: дальние мельче, бледнее и дрейфуют медленнее.
    const depth = 0.35 + random(`d${s}`) * 0.65;

    // Дрейф не прекращается и после сборки — иначе кадр замирает.
    const drift = Math.sin(second * (0.5 + random(`w${s}`) * 0.7) + random(`p${s}`) * 6.28);
    const driftAmp = (1 - eased * 0.82) * 26 + 5;

    const tx = cx + target[0] * span + drift * driftAmp * depth;
    const ty = cy + target[1] * span + Math.cos(second * 0.6 + i) * driftAmp * 0.6 * depth;

    const x = startX + (tx - startX) * eased;
    const y = startY + (ty - startY) * eased;

    // Размер и плотность отмерены по кадру, а не абсолютом: при 7-20 px
    // на кадре 1080 элементы читались как пыль, а не как фигуры.
    const unit = width / 1080;
    const size = (14 + depth * 26) * unit * (0.7 + eased * 0.3);
    const opacity = (0.3 + depth * 0.55) * interpolate(second, [0, 0.8], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const turn = random(`t${s}`) * 360 + second * (12 + random(`v${s}`) * 26);

    items.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: x - size / 2,
          top: y - size / 2,
        }}
      >
        <Tetra size={size} turn={turn} color={color} opacity={opacity} />
      </div>,
    );
  }

  return <AbsoluteFill style={{ overflow: "hidden" }}>{items}</AbsoluteFill>;
};

export default TetraField;
