import {
  AbsoluteFill,
  interpolate,
  random,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";

/**
 * TetraField — поле мелких каркасных тетраэдров, дрейфующих в пространстве.
 *
 * Повторяет фон главной страницы сайта. Разбор по кадрам показал три вещи,
 * которые и определяют вид:
 *
 * 1. Фигуры каркасные — одни рёбра, без заливки, линии тонкие. Залитые
 *    треугольники выглядят плотнее и тяжелее, чем на сайте.
 * 2. Цвета разные: голубой, синий, серый, чёрный. Одноцветное поле читается
 *    как узор, разноцветное — как объём.
 * 3. Ничего никуда не собирается. Элементы просто висят в пространстве,
 *    вращаются каждый по-своему и медленно плывут.
 *
 * ——— Почему не WebGL ———
 *
 * На сайте это three.js. В рендере Remotion аппаратного ускорения нет, и
 * живой WebGL стоил бы втрое дороже за кадр при непредсказуемом результате.
 * У тетраэдра четыре вершины — проекцию дешевле посчитать самому.
 *
 * ——— Почему random из Remotion ———
 *
 * Math.random дал бы новую раскладку на каждом кадре, и поле бы мерцало.
 * random(seed) возвращает одно и то же для одного зерна, поэтому каждая
 * фигура всю сцену держится своей траектории и своего вращения.
 */
export const tetraFieldSchema = z.object({
  count: z.number().int().min(10).max(400).describe("Сколько фигур в кадре"),
  minSize: z.number().describe("Наименьший размер фигуры, доля ширины кадра"),
  maxSize: z.number().describe("Наибольший размер фигуры, доля ширины кадра"),
  speed: z.number().describe("Скорость дрейфа: 1 — спокойно, 2 — заметно"),
  spin: z.number().describe("Скорость вращения, оборотов в минуту примерно"),
  opacity: z.number().min(0).max(1).describe("Общая плотность поля"),
  seed: z.number().describe("Зерно раскладки: меняет расстановку целиком"),
});

export type TetraFieldProps = z.infer<typeof tetraFieldSchema>;

export const tetraFieldDefaults: TetraFieldProps = {
  count: 90,
  minSize: 0.03,
  maxSize: 0.115,
  speed: 1,
  spin: 1,
  opacity: 1,
  seed: 7,
};

/**
 * Палитра снята с кадров сайта: голубой и синий преобладают, серый и
 * чёрный идут реже и дают полю глубину.
 */
const PALETTE = [
  "#61CBFA",
  "#2563eb",
  "#1E5FD0",
  "#8FD4FF",
  "#9AA3AF",
  "#6B7280",
  "#1F2937",
  "#111827",
] as const;

type Vec3 = readonly [number, number, number];

/** Правильный тетраэдр вершиной вверх, вписанный в сферу радиуса 1. */
const BASE_RADIUS = Math.sqrt(8) / 3;
const BASE_Y = -1 / 3;

const VERTICES: readonly Vec3[] = [
  [0, 1, 0],
  ...([0, 1, 2].map((i) => {
    const a = Math.PI / 2 + (i * 2 * Math.PI) / 3;
    return [BASE_RADIUS * Math.cos(a), BASE_Y, BASE_RADIUS * Math.sin(a)] as Vec3;
  }) as Vec3[]),
];

const EDGES: readonly (readonly [number, number])[] = [
  [0, 1], [0, 2], [0, 3], [1, 2], [2, 3], [3, 1],
];

/** Поворот вокруг трёх осей: у каждой фигуры своя ось, как на сайте. */
const rotate = (v: Vec3, yaw: number, pitch: number, roll: number): Vec3 => {
  const [x, y, z] = v;
  const x1 = x * Math.cos(yaw) + z * Math.sin(yaw);
  const z1 = -x * Math.sin(yaw) + z * Math.cos(yaw);
  const y2 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
  const z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch);
  const x3 = x1 * Math.cos(roll) - y2 * Math.sin(roll);
  const y3 = x1 * Math.sin(roll) + y2 * Math.cos(roll);
  return [x3, y3, z2];
};

const PERSPECTIVE = 4.5;

/** Один каркасный тетраэдр: только рёбра, тонкой линией. */
const WireTetra: React.FC<{
  readonly size: number;
  readonly yaw: number;
  readonly pitch: number;
  readonly roll: number;
  readonly color: string;
  readonly opacity: number;
  readonly stroke: number;
}> = ({ size, yaw, pitch, roll, color, opacity, stroke }) => {
  const half = size / 2;
  const projected = VERTICES.map((v) => {
    const [x, y, z] = rotate(v, yaw, pitch, roll);
    const k = PERSPECTIVE / (PERSPECTIVE - z);
    return [half + x * half * 0.62 * k, half - y * half * 0.62 * k];
  });

  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      {EDGES.map(([a, b], i) => (
        <line
          key={i}
          x1={projected[a][0]}
          y1={projected[a][1]}
          x2={projected[b][0]}
          y2={projected[b][1]}
          stroke={color}
          strokeOpacity={opacity}
          strokeWidth={stroke}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
};

export const TetraField: React.FC<TetraFieldProps> = ({
  count,
  minSize,
  maxSize,
  speed,
  spin,
  opacity,
  seed,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const second = frame / fps;

  const fade = interpolate(second, [0, 1.2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const items = [];
  for (let i = 0; i < count; i += 1) {
    const s = seed * 977 + i;

    // Глубина решает всё: и размер, и яркость, и насколько быстро фигура
    // плывёт. Дальние мельче, бледнее и почти не двигаются — так поле
    // читается объёмным без настоящей перспективы.
    const depth = random(`d${s}`);
    const size = width * (minSize + (maxSize - minSize) * depth);

    // Каждая фигура плывёт по своей замкнутой траектории. Синус и косинус
    // с разными периодами дают движение, которое не повторяется на глаз,
    // но никуда не уходит за кадр.
    const px = random(`x${s}`);
    const py = random(`y${s}`);
    const wx = 0.12 + random(`wx${s}`) * 0.22;
    const wy = 0.1 + random(`wy${s}`) * 0.2;
    const ax = (0.04 + random(`ax${s}`) * 0.09) * (0.4 + depth);
    const ay = (0.03 + random(`ay${s}`) * 0.08) * (0.4 + depth);

    const x =
      width * (px + Math.sin(second * wx * speed + random(`ph${s}`) * 6.28) * ax);
    const y =
      height * (py + Math.cos(second * wy * speed + random(`pv${s}`) * 6.28) * ay);

    // Вращение: у каждой фигуры свой набор скоростей по трём осям.
    const turn = (k: string, base: number) =>
      (random(k) - 0.5) * 2 * base * spin * second + random(`${k}o`) * 6.28;

    const color = PALETTE[Math.floor(random(`c${s}`) * PALETTE.length)];
    const alpha = (0.4 + depth * 0.5) * opacity * fade;

    items.push(
      <div
        key={i}
        style={{ position: "absolute", left: x - size / 2, top: y - size / 2 }}
      >
        <WireTetra
          size={size}
          yaw={turn(`ry${s}`, 0.9)}
          pitch={turn(`rp${s}`, 0.6)}
          roll={turn(`rr${s}`, 0.5)}
          color={color}
          opacity={alpha}
          stroke={Math.max(1.4, size * 0.022)}
        />
      </div>,
    );
  }

  return <AbsoluteFill style={{ overflow: "hidden" }}>{items}</AbsoluteFill>;
};

export default TetraField;
