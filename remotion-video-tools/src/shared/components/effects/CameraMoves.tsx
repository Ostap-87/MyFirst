import { Easing, interpolate, useCurrentFrame } from "remotion";
import { z } from "zod";

/**
 * CameraMoves — движения камеры по готовой съёмке.
 *
 * Говорящая голова снята одним дублем с одной точки, и через 4–6 секунд
 * одинаковый кадр начинает утомлять. Настоящей второй камеры нет, поэтому
 * крупность меняется кадрированием — отрезками поверх речи:
 *
 *   punch — быстрый зум. Наезд за 4 кадра и резкий возврат: читается
 *           как удар, ставится на хук и ударное слово. 1–2 с.
 *   push  — лёгкий наезд. Плавно через весь отрезок, почти незаметно:
 *           держит внимание на длинной фразе без событий. 3–8 с.
 *   cut   — смена кадра. Крупность меняется мгновенно, без движения,
 *           как склейка со второй камерой. Ставится на границе фраз.
 *
 * Центр увеличения — на глазах (`originY`), а не в центре кадра: при
 * наезде в центр глаза уходят вверх и режутся шапкой.
 */
export const cameraMoveSchema = z.object({
  fromFrame: z.number().int().min(0).describe("Кадр начала"),
  toFrame: z.number().int().min(1).describe("Кадр конца: здесь крупность возвращается"),
  kind: z
    .enum(["punch", "push", "cut"])
    .describe("punch — быстрый зум, push — лёгкий наезд, cut — смена кадра"),
  scale: z.number().min(1).max(1.6).describe("Во сколько раз крупнее"),
});

export const cameraMovesSchema = z.object({
  moves: z.array(cameraMoveSchema).describe("Отрезки движений, не пересекаются"),
  originX: z.number().min(0).max(1).describe("Центр увеличения по ширине"),
  originY: z.number().min(0).max(1).describe("Центр увеличения по высоте — глаза"),
  punchFrames: z.number().int().min(1).describe("За сколько кадров доезжает быстрый зум"),
});

export type CameraMove = z.infer<typeof cameraMoveSchema>;
export type CameraMovesParams = z.infer<typeof cameraMovesSchema>;

/** Любой параметр можно опустить — возьмётся значение из cameraMovesDefaults. */
export type CameraMovesProps = Partial<CameraMovesParams> & {
  readonly children: React.ReactNode;
};

export const cameraMovesDefaults: CameraMovesParams = {
  moves: [],
  originX: 0.5,
  originY: 0.4,
  punchFrames: 4,
};

/** Масштаб в кадре: без активного отрезка — 1. */
export const cameraScaleAt = (
  frame: number,
  moves: readonly CameraMove[],
  punchFrames: number,
): number => {
  const m = moves.find((x) => frame >= x.fromFrame && frame < x.toFrame);
  if (!m) return 1;
  const since = frame - m.fromFrame;
  if (m.kind === "cut") return m.scale;
  if (m.kind === "punch") {
    return interpolate(since, [0, punchFrames], [1, m.scale], {
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
  }
  return interpolate(since, [0, m.toFrame - m.fromFrame], [1, m.scale], {
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.sin),
  });
};

export const CameraMoves: React.FC<CameraMovesProps> = ({ children, ...params }) => {
  const { moves, originX, originY, punchFrames } = {
    ...cameraMovesDefaults,
    ...params,
  };
  const frame = useCurrentFrame();
  const scale = cameraScaleAt(frame, moves, punchFrames);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        transform: `scale(${scale})`,
        transformOrigin: `${originX * 100}% ${originY * 100}%`,
      }}
    >
      {children}
    </div>
  );
};
