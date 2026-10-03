import { AbsoluteFill, Audio, Img, Sequence, staticFile, useVideoConfig } from "remotion";
import { z } from "zod";
import { AuraBot3D, CameraFX, type CameraFxKind } from "../../shared/components/effects";
import { fontFamily } from "../../shared/fonts";

/**
 * Лаборатория приёмов камеры: шесть движений по 3 с на съёмке интро
 * (dolly zoom и orbit — на отрезках с вырезкой спикера) и три настоящих
 * движения камеры вокруг объёмного робота. Подпись внизу — что показано.
 */
export const cameraLabSchema = z.object({
  footage: z.string(),
  cutout: z.string(),
  sceneSeconds: z.number().min(1).max(10),
});
export type CameraLabProps = z.infer<typeof cameraLabSchema>;
export const cameraLabDefaults: CameraLabProps = { footage: "local/head/s29-intro.mp4", cutout: "local/head/s29-intro-cutout.webm", sceneSeconds: 3 };

type Scene = { label: string; sub: string; offset: number; kind?: CameraFxKind; direction?: "left" | "right"; withCutout?: boolean; bot?: { orbit: [number, number]; elev: [number, number]; dist: [number, number] } };
const SCENES: Scene[] = [
  { label: "Push in", sub: "наезд на глаза — настоящий", offset: 20.0, kind: "pushIn" },
  { label: "Whip pan", sub: "отмах с размытием — настоящий переход", offset: 25.0, kind: "whipPan", direction: "right" },
  { label: "Dolly zoom", sub: "спикер на месте, фон уезжает — через вырезку", offset: 14.3, kind: "dollyZoom", withCutout: true },
  { label: "Low angle", sub: "низкий ракурс — перспектива снизу", offset: 30.0, kind: "lowAngle" },
  { label: "Crane", sub: "кран: подъём с отъездом и наклоном", offset: 36.0, kind: "crane" },
  { label: "Orbit", sub: "псевдо-орбита 12° — параллакс через вырезку", offset: 41.4, kind: "orbit", direction: "right", withCutout: true },
  { label: "Orbit · робот", sub: "настоящая орбита камеры вокруг робота", offset: 0, bot: { orbit: [-40, 40], elev: [0, 0], dist: [1, 1] } },
  { label: "Crane · робот", sub: "камера поднимается и отъезжает", offset: 0, bot: { orbit: [10, 10], elev: [-5, 35], dist: [0.8, 1.25] } },
  { label: "Low angle · робот", sub: "камера снизу, близко", offset: 0, bot: { orbit: [-15, -15], elev: [-28, -24], dist: [0.75, 0.7] } },
];

export const CameraLab: React.FC<CameraLabProps> = ({ footage, cutout, sceneSeconds }) => {
  const { fps, width, height } = useVideoConfig();
  const len = Math.round(sceneSeconds * fps);
  const inter = fontFamily("Inter");
  return (
    <AbsoluteFill style={{ background: "#f8f6f3", fontFamily: inter }}>
      {SCENES.map((sc, i) => (
        <Sequence key={i} from={i * len} durationInFrames={len} layout="none">
          {sc.kind ? (
            <CameraFX
              footage={footage}
              cutout={sc.withCutout ? cutout : ""}
              trimBefore={Math.round(sc.offset * fps)}
              moves={[{ fromFrame: sc.kind === "whipPan" ? Math.round(len * 0.45) : 6, toFrame: sc.kind === "whipPan" ? Math.round(len * 0.45) + 14 : len - 4, kind: sc.kind, strength: 1, originX: 0.5, originY: sc.kind === "dollyZoom" ? 0.52 : 0.36, direction: sc.direction ?? "right" }]}
            />
          ) : (
            <AbsoluteFill style={{ background: "#f8f6f3" }}>
              <BotCam bot={sc.bot!} len={len} />
            </AbsoluteFill>
          )}
          <div style={{ position: "absolute", left: width * 0.07, right: width * 0.07, bottom: height * 0.14, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 16, alignSelf: "flex-start", background: "#ffffff", borderRadius: 18, padding: "16px 26px", boxShadow: "0 12px 30px rgba(0,0,0,0.25)" }}>
              <Img src={staticFile("icons/phosphor/bold/video-camera-bold.svg")} style={{ width: 44, height: 44 }} />
              <span style={{ fontWeight: 800, fontSize: 48, color: "#262626", letterSpacing: "-0.01em" }}>{sc.label}</span>
            </div>
            <div style={{ alignSelf: "flex-start", background: "#fff65d", borderRadius: 14, padding: "10px 20px", fontWeight: 600, fontSize: 30, color: "#262626" }}>{sc.sub}</div>
          </div>
          <Sequence durationInFrames={20} layout="none">
            <Audio src={staticFile("audio/sfx/click.wav")} volume={() => 0.4} />
          </Sequence>
          {sc.kind === "whipPan" ? (
            <Sequence from={Math.round(len * 0.45)} durationInFrames={20} layout="none">
              <Audio src={staticFile("audio/sfx/swoosh.wav")} volume={() => 0.5} />
            </Sequence>
          ) : null}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

const BotCam: React.FC<{ bot: NonNullable<Scene["bot"]>; len: number }> = ({ bot, len }) => {
  const { width, height } = useVideoConfig();
  const size = Math.min(width, height * 0.62);
  return (
    <div style={{ position: "absolute", left: (width - size) / 2, top: height * 0.1, width: size, height: size }}>
      <AuraBot3D gestures={[{ at: 20, kind: "wave" }]} camOrbitFrames={{ from: bot.orbit[0], to: bot.orbit[1], frames: len }} camElevationFrames={{ from: bot.elev[0], to: bot.elev[1], frames: len }} camDistanceFrames={{ from: bot.dist[0], to: bot.dist[1], frames: len }} />
    </div>
  );
};
