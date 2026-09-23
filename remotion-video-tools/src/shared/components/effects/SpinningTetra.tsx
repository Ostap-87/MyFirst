import { useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";

/**
 * SpinningTetra — вращающийся тетраэдр логотипа GlobalTechTour.
 *
 * На сайте это настоящий 3D-объект на three.js: canvas 82×82, автоповорот
 * вокруг вертикальной оси плюс параллакс от мыши. Здесь та же фигура, но
 * проекция считается вручную и рисуется в SVG.
 *
 * Почему не WebGL. Рендер Remotion идёт в headless-браузере, где аппаратного
 * ускорения нет: three.js там уходит на программный растеризатор, кадр
 * становится втрое дороже, а результат перестаёт быть побитово одинаковым от
 * прогона к прогону. У тетраэдра четыре вершины — матрицу поворота и
 * перспективу дешевле посчитать самому, и тогда кадр воспроизводим всегда.
 *
 * Грани полупрозрачные и рисуются от дальней к ближней (алгоритм художника),
 * рёбра — все, включая задние: именно сквозные линии дают на сайте ощущение
 * стеклянной фигуры, а не плоского треугольника.
 */
export const spinningTetraSchema = z.object({
  size: z.number().min(8).describe("Сторона квадрата с фигурой, px"),
  faceColor: z.string().describe("Цвет граней (с сайта — #61CBFA)"),
  edgeColor: z.string().describe("Цвет рёбер"),
  faceOpacity: z.number().min(0).max(1).describe("Прозрачность граней"),
  edgeWidthFraction: z
    .number()
    .min(0)
    .describe("Толщина ребра долей размера фигуры"),
  degreesPerSecond: z
    .number()
    .describe("Скорость автоповорота вокруг вертикали, градусов в секунду"),
  tiltDegrees: z
    .number()
    .describe("Наклон камеры сверху: при 0 основание не видно"),
  startDegrees: z.number().describe("Начальный угол поворота"),
  perspective: z
    .number()
    .min(1)
    .describe("Удаление камеры: меньше — сильнее перспектива"),
});

export type SpinningTetraParams = z.infer<typeof spinningTetraSchema>;

/** Любой параметр можно опустить — возьмётся значение из spinningTetraDefaults. */
export type SpinningTetraProps = Partial<SpinningTetraParams>;

export const spinningTetraDefaults: SpinningTetraParams = {
  size: 220,
  // Цвета сняты пипеткой со скриншота сайта, а не подобраны на глаз.
  faceColor: "#61CBFA",
  edgeColor: "#1E5FD0",
  faceOpacity: 0.62,
  edgeWidthFraction: 0.011,
  degreesPerSecond: 28,
  tiltDegrees: 17,
  startDegrees: 18,
  perspective: 5.2,
};

type Vec3 = readonly [number, number, number];

/**
 * Правильный тетраэдр вершиной вверх, вписанный в сферу радиуса 1.
 * Основание — треугольник на высоте -1/3, радиус описанной окружности √8/3.
 */
const BASE_RADIUS = Math.sqrt(8) / 3;
const BASE_Y = -1 / 3;

const VERTICES: readonly Vec3[] = [
  [0, 1, 0],
  ...([0, 1, 2].map((i) => {
    const angle = (Math.PI / 2) + (i * 2 * Math.PI) / 3;
    return [
      BASE_RADIUS * Math.cos(angle),
      BASE_Y,
      BASE_RADIUS * Math.sin(angle),
    ] as Vec3;
  }) as Vec3[]),
];

/** Грани: основание и три боковых. Индексы — в VERTICES. */
const FACES: readonly (readonly number[])[] = [
  [1, 2, 3],
  [0, 1, 2],
  [0, 2, 3],
  [0, 3, 1],
];

/** Рёбра рисуем все: сквозные линии и создают ощущение стекла. */
const EDGES: readonly (readonly [number, number])[] = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [2, 3],
  [3, 1],
];

const rotate = (v: Vec3, yaw: number, pitch: number): Vec3 => {
  const [x, y, z] = v;

  // Поворот вокруг вертикали — это и есть автоповорот логотипа.
  const x1 = x * Math.cos(yaw) + z * Math.sin(yaw);
  const z1 = -x * Math.sin(yaw) + z * Math.cos(yaw);

  // Наклон камеры сверху: без него основание не видно и фигура читается
  // плоским треугольником.
  const y2 = y * Math.cos(pitch) - z1 * Math.sin(pitch);
  const z2 = y * Math.sin(pitch) + z1 * Math.cos(pitch);

  return [x1, y2, z2];
};

export const SpinningTetra: React.FC<SpinningTetraProps> = (params) => {
  const {
    size,
    faceColor,
    edgeColor,
    faceOpacity,
    edgeWidthFraction,
    degreesPerSecond,
    tiltDegrees,
    startDegrees,
    perspective,
  } = { ...spinningTetraDefaults, ...params };

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const yaw = ((startDegrees + (frame / fps) * degreesPerSecond) * Math.PI) / 180;
  const pitch = (tiltDegrees * Math.PI) / 180;

  const rotated = VERTICES.map((v) => rotate(v, yaw, pitch));

  // Перспектива: чем дальше точка, тем сильнее она стягивается к центру.
  const projected = rotated.map(([x, y, z]) => {
    const scale = perspective / (perspective - z);
    return {
      x: 50 + x * scale * 26,
      // В SVG ось Y смотрит вниз, в модели — вверх.
      y: 52 - y * scale * 26,
      z,
    };
  });

  // Алгоритм художника: дальние грани рисуем первыми, ближние поверх.
  const faces = FACES.map((face) => ({
    points: face.map((i) => `${projected[i].x},${projected[i].y}`).join(" "),
    depth: face.reduce((sum, i) => sum + projected[i].z, 0) / face.length,
  })).sort((a, b) => a.depth - b.depth);

  const stroke = edgeWidthFraction * 100;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ display: "block", overflow: "visible" }}
      aria-hidden
    >
      {faces.map((face) => (
        <polygon
          key={face.points}
          points={face.points}
          fill={faceColor}
          fillOpacity={faceOpacity}
        />
      ))}
      {EDGES.map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          x1={projected[a].x}
          y1={projected[a].y}
          x2={projected[b].x}
          y2={projected[b].y}
          stroke={edgeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          // Задние рёбра бледнее — иначе фигура читается плоской сеткой.
          strokeOpacity={
            (projected[a].z + projected[b].z) / 2 > 0 ? 0.95 : 0.42
          }
        />
      ))}
    </svg>
  );
};
