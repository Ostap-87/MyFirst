import { AbsoluteFill, Img, OffthreadVideo, staticFile, useVideoConfig } from "remotion";
import { z } from "zod";
import { AuraLogo } from "../components/AuraLogo";

/**
 * Лаборатория знака: сборка монограммы из элементов, кольцо с названием,
 * блик и пересборка — на белом, на тёмном и поверх съёмки.
 */
export const logoLabSchema = z.object({
  footage: z.string().describe("Съёмка для третьего варианта; пусто — серый фон"),
  size: z.number().min(100).max(1000),
  reassembleEverySeconds: z.number().min(2).max(60),
  shineEverySeconds: z.number().min(1).max(60),
  ringSecondsPerTurn: z.number().min(3).max(120),
});
export type LogoLabProps = z.infer<typeof logoLabSchema>;
export const logoLabDefaults: LogoLabProps = { footage: "local/head/s28-third.mp4", size: 420, reassembleEverySeconds: 6, shineEverySeconds: 3, ringSecondsPerTurn: 14 };

export const LogoLab: React.FC<LogoLabProps> = ({ footage, size, reassembleEverySeconds, shineEverySeconds, ringSecondsPerTurn }) => {
  const { width, height } = useVideoConfig();
  const col = width / 3;
  return (
    <AbsoluteFill style={{ background: "#f8f6f3" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: col, height, background: "#ffffff" }} />
      <div style={{ position: "absolute", left: col, top: 0, width: col, height, background: "#262626" }} />
      <div style={{ position: "absolute", left: col * 2, top: 0, width: col, height, overflow: "hidden", background: "#8f8e8d" }}>
        {footage ? <OffthreadVideo src={staticFile(footage)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
      </div>
      <AuraLogo size={size} cx={col * 0.5} cy={height * 0.5} reassembleEverySeconds={reassembleEverySeconds} shineEverySeconds={shineEverySeconds} ringSecondsPerTurn={ringSecondsPerTurn} />
      <AuraLogo size={size} cx={col * 1.5} cy={height * 0.5} reassembleEverySeconds={reassembleEverySeconds} shineEverySeconds={shineEverySeconds} ringSecondsPerTurn={ringSecondsPerTurn} />
      <AuraLogo size={size} cx={col * 2.5} cy={height * 0.5} reassembleEverySeconds={reassembleEverySeconds} shineEverySeconds={shineEverySeconds} ringSecondsPerTurn={ringSecondsPerTurn} />
      <Img src={staticFile("aura/logo.svg")} style={{ position: "absolute", left: col * 0.5 - 200, top: height * 0.5 + size * 0.75, width: 400 }} />
    </AbsoluteFill>
  );
};
