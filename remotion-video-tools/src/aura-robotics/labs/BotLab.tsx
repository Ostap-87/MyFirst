import { AbsoluteFill, useCurrentFrame } from "remotion";
import { z } from "zod";
import { AuraBot3D } from "../../shared/components/effects";

/** Лаборатория 3D-робота: позы по кадрам для стоп-кадров и короткого теста. */
export const botLabSchema = z.object({ walk: z.number().min(0).max(1), facing: z.number(), look: z.number() });
export const BotLab: React.FC<z.infer<typeof botLabSchema>> = ({ walk, facing, look }) => {
  const frame = useCurrentFrame();
  const gestures = [
    { at: 30, kind: "wave" as const },
    { at: 130, kind: "nod" as const },
    { at: 190, kind: "jump" as const },
    { at: 260, kind: "point" as const },
    { at: 340, kind: "scan" as const },
    { at: 440, kind: "shrug" as const },
  ];
  return (
    <AbsoluteFill style={{ background: "#f8f6f3" }}>
      <AuraBot3D gestures={gestures} walk={frame >= 520 ? 1 : walk} facing={frame >= 520 ? 35 : facing} look={look} />
    </AbsoluteFill>
  );
};
