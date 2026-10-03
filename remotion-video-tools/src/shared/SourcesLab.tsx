import { AbsoluteFill, Audio, Easing, Img, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { AuroraBackdrop, BalloonTitle, IconOrbit, ShinyText, TypingPush } from "./components/effects";
import { fontFamily } from "./fonts";

/**
 * Shared-SourcesLab — что взято с пяти сайтов, на одном отрезке интро
 * (20–60 с, с голосом), 40 секунд:
 *   0–3 с    Fresh LUTs: цветокоррекция «до/после» шторкой;
 *   3–11 с   Phosphor Icons + буквы-шарики за спиной;
 *   11–19 с  LottieFiles: анимированная галочка в чек-листе с иконками Phosphor;
 *   19–27 с  Mixkit: вертикальный сток внизу + орбита иконок (идея React Bits);
 *   27–34 с  React Bits: Aurora-фон и Shiny Text при печати сбоку;
 *   34–40 с  LottieFiles: конфетти на финале.
 * Голос — из съёмки, музыка — подложка, на события — звуки.
 */
export const sourcesLabSchema = z.object({
  raw: z.string().describe("Съёмка без коррекции, с 20-й секунды"),
  graded: z.string().describe("Та же съёмка с LUT-коррекцией, с голосом"),
  cutoutLab: z.string().describe("Вырезка спикера на 20–32 с"),
  mixkit: z.string().describe("Вертикальный клип Mixkit"),
  music: z.string(),
});

export const sourcesLabDefaults: z.infer<typeof sourcesLabSchema> = {
  raw: "local/head/s29-intro.mp4",
  graded: "local/lab-graded.mp4",
  cutoutLab: "local/head/s29-intro-lab-cutout.webm",
  mixkit: "local/mixkit-waves.mp4",
  music: "audio/music/gtt-bed-light-long.m4a",
};

const RAW_OFFSET = 600; // 20 с × 30
const SCENES = [0, 90, 330, 570, 810, 1020, 1200];

const Tag: React.FC<{ icon: string; text: string }> = ({ icon, text }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = interpolate(frame, [0, 12], [0, 1], { easing: Easing.out(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: width * 0.04,
        top: height * 0.86,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 22px",
        borderRadius: 999,
        background: "rgba(8,12,24,0.72)",
        border: "1px solid rgba(255,255,255,0.18)",
        color: "#fff",
        fontFamily: fontFamily("Inter"),
        fontWeight: 600,
        fontSize: 30,
        opacity: t,
        transform: `translateY(${(1 - t) * 20}px)`,
      }}
    >
      <Img src={staticFile(icon)} style={{ width: 34, height: 34, filter: "invert(1)" }} />
      {text}
    </div>
  );
};

export const SourcesLab: React.FC<z.infer<typeof sourcesLabSchema>> = (p) => {
  const { width, height, durationInFrames } = useVideoConfig();
  const Graded: React.FC<{ from: number; muted?: boolean; style?: React.CSSProperties }> = ({ from, muted, style }) => (
    <OffthreadVideo src={staticFile(p.graded)} muted={muted} trimBefore={from} style={{ width: "100%", height: "100%", objectFit: "cover", ...style }} />
  );
  const Speaker: React.FC<{ from: number }> = ({ from }) => (
    <OffthreadVideo src={staticFile(p.cutoutLab)} transparent muted trimBefore={RAW_OFFSET + from} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  );
  const len = (i: number) => SCENES[i + 1] - SCENES[i];

  return (
    <AbsoluteFill style={{ background: "#0b1220" }}>
      {/* A. Fresh LUTs: до/после */}
      <Sequence durationInFrames={len(0)} layout="none">
        <Wipe raw={p.raw} graded={p.graded} />
        <Tag icon="icons/phosphor/bold/sparkle-bold.svg" text="Fresh LUTs: цветокоррекция до / после" />
        <Sequence from={10} durationInFrames={30} layout="none"><Audio src={staticFile("audio/sfx/swoosh.wav")} volume={0.5} /></Sequence>
      </Sequence>

      {/* B. Phosphor + шарики за спиной */}
      <Sequence from={SCENES[1]} durationInFrames={len(1)} layout="none">
        <AbsoluteFill><Graded from={SCENES[1]} /></AbsoluteFill>
        <BalloonTitle lines={["БОЛЕЕ", "*1000", "КОМПАНИЙ"]} delayInFrames={8} charsPerSecond={11} holdFrames={110} centerY={0.26} fontSize={0.15}>
          <AbsoluteFill><Speaker from={SCENES[1]} /></AbsoluteFill>
        </BalloonTitle>
        <IconBadge icon="icons/phosphor/bold/buildings-bold.svg" at={60} x={0.82} y={0.12} />
        <IconBadge icon="icons/phosphor/bold/handshake-bold.svg" at={80} x={0.18} y={0.12} />
        <Tag icon="icons/phosphor/bold/sparkle-bold.svg" text="Phosphor Icons + буквы-шарики" />
      </Sequence>

      {/* C. Lottie-галочка в чек-листе с иконками */}
      <Sequence from={SCENES[2]} durationInFrames={len(2)} layout="none">
        <AbsoluteFill style={{ transform: "translateX(-26%) scale(1.27)", transformOrigin: "0% 50%" }}>
          <Graded from={SCENES[2]} />
        </AbsoluteFill>
        <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(5,10,25,0) 38%, rgba(5,10,25,0.6) 68%)" }} />
        <LottieList
          items={[
            { icon: "icons/phosphor/bold/buildings-bold.svg", text: "Более 1000 компаний", at: 12 },
            { icon: "icons/phosphor/bold/check-circle-bold.svg", text: "Быстрое согласование", at: 54 },
            { icon: "icons/phosphor/bold/handshake-bold.svg", text: "Переговоры с руководством", at: 96 },
            { icon: "icons/phosphor/bold/users-three-bold.svg", text: "Поддержка после тура", at: 138 },
          ]}
        />
        <Tag icon="icons/phosphor/bold/check-circle-bold.svg" text="LottieFiles: анимированная галочка + Phosphor" />
      </Sequence>

      {/* D. Mixkit внизу + орбита иконок */}
      <Sequence from={SCENES[3]} durationInFrames={len(3)} layout="none">
        <AbsoluteFill><Graded from={SCENES[3]} /></AbsoluteFill>
        <div style={{ position: "absolute", left: 0, top: height * 0.56, width, height: height * 0.44, overflow: "hidden", borderTopLeftRadius: 48, borderTopRightRadius: 48, boxShadow: "0 -20px 60px rgba(0,0,0,0.45)" }}>
          <OffthreadVideo src={staticFile(p.mixkit)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <AbsoluteFill style={{ background: "rgba(5,10,25,0.25)" }} />
          <IconOrbit center="ТУР" cy={0.22} radiusFraction={0.26} iconFraction={0.11} delayInFrames={10} stepFrames={9} spinSecondsPerTurn={12} />
        </div>
        <Tag icon="icons/phosphor/bold/globe-hemisphere-east-bold.svg" text="Mixkit: вертикальный сток · React Bits: орбита" />
      </Sequence>

      {/* E. Aurora + Shiny Text при печати сбоку */}
      <Sequence from={SCENES[4]} durationInFrames={len(4)} layout="none">
        <TypingPush lines={["Быстрое", "*согласо-", "*вание"]} side="right" delayInFrames={8} charsPerSecond={11} pushFraction={0.34} columnFraction={0.44} color="#ffffff" accentColor="#9ad0ff">
          <Graded from={SCENES[4]} />
        </TypingPush>
        <div style={{ position: "absolute", left: width * 0.5, top: 0, width: width * 0.5, height, WebkitMaskImage: "linear-gradient(90deg, transparent 0%, #000 35%)", maskImage: "linear-gradient(90deg, transparent 0%, #000 35%)", opacity: 1, mixBlendMode: "screen", pointerEvents: "none" }}>
          <AuroraBackdrop background="transparent" intensity={1} blur={55} speed={1.3} />
        </div>
        <Tag icon="icons/phosphor/bold/sparkle-bold.svg" text="React Bits: Aurora-фон + Shiny Text" />
      </Sequence>

      {/* F. Конфетти на финале */}
      <Sequence from={SCENES[5]} durationInFrames={len(5)} layout="none">
        <AbsoluteFill><Graded from={SCENES[5]} /></AbsoluteFill>
        <AbsoluteFill style={{ background: "rgba(5,10,25,0.35)" }} />
        <Final />
        <Sequence from={6} durationInFrames={83} layout="none">
          <AbsoluteFill><OffthreadVideo src={staticFile("local/lottie/confetti.webm")} transparent muted style={{ width: "100%", height: "100%", objectFit: "cover" }} /></AbsoluteFill>
          <Audio src={staticFile("audio/sfx/swoosh.wav")} volume={0.5} />
        </Sequence>
        <Tag icon="icons/phosphor/bold/sparkle-bold.svg" text="LottieFiles: конфетти · Phosphor Icons" />
      </Sequence>

      {/* Музыка тихо под голосом, с входом и выходом */}
      <Audio src={staticFile(p.music)} volume={(f) => interpolate(f, [0, 36, durationInFrames - 60, durationInFrames], [0, 0.12, 0.12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
    </AbsoluteFill>
  );
};

// Шторка «до/после»: слева исходник, справа с коррекцией, линия идёт вправо.
const Wipe: React.FC<{ raw: string; graded: string }> = ({ raw, graded }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const x = interpolate(frame, [10, 70], [0.08, 0.92], { easing: Easing.inOut(Easing.cubic), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const label = (text: string, left: number) => (
    <div style={{ position: "absolute", left, top: height * 0.12, padding: "10px 22px", borderRadius: 12, background: "rgba(8,12,24,0.7)", color: "#fff", fontFamily: fontFamily("Unbounded"), fontWeight: 800, fontSize: 40 }}>{text}</div>
  );
  return (
    <AbsoluteFill>
      <AbsoluteFill><OffthreadVideo src={staticFile(raw)} muted trimBefore={RAW_OFFSET} style={{ width: "100%", height: "100%", objectFit: "cover" }} /></AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `inset(0 0 0 ${x * 100}%)` }}>
        <OffthreadVideo src={staticFile(graded)} trimBefore={0} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      <div style={{ position: "absolute", left: x * width - 3, top: 0, width: 6, height, background: "#fff", boxShadow: "0 0 24px rgba(0,0,0,0.6)" }} />
      {label("ДО", width * 0.06)}
      {label("ПОСЛЕ", width * 0.72)}
    </AbsoluteFill>
  );
};

// Кружок с иконкой Phosphor, выскакивает с хлопком.
const IconBadge: React.FC<{ icon: string; at: number; x: number; y: number }> = ({ icon, at, x, y }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const s = interpolate(frame - at, [0, 12], [0, 1], { easing: Easing.out(Easing.back(1.8)), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const size = width * 0.14;
  return (
    <>
      <div style={{ position: "absolute", left: width * x - size / 2, top: height * y - size / 2, width: size, height: size, borderRadius: "50%", background: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${s})`, opacity: s, boxShadow: "0 14px 34px rgba(0,0,0,0.4)" }}>
        <Img src={staticFile(icon)} style={{ width: size * 0.58, height: size * 0.58, filter: "invert(1)" }} />
      </div>
      <Sequence from={at} durationInFrames={10} layout="none"><Audio src={staticFile("audio/sfx/pop.wav")} volume={0.4} /></Sequence>
    </>
  );
};

// Чек-лист, где галочку рисует Lottie-анимация (пререндер в WebM с альфой).
const LottieList: React.FC<{ items: Array<{ icon: string; text: string; at: number }> }> = ({ items }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const fs = width * 0.042;
  return (
    <div style={{ position: "absolute", left: width * 0.46, top: height * 0.24, width: width * 0.5, fontFamily: fontFamily("Inter"), color: "#fff" }}>
      {items.map((it, i) => {
        const t = interpolate(frame - it.at, [0, 14], [0, 1], { easing: Easing.out(Easing.back(1.5)), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: fs * 0.5, marginBottom: fs * 0.7, opacity: t, transform: `translateX(${(1 - t) * -width * 0.1}px)` }}>
            <div style={{ width: fs * 1.5, height: fs * 1.5, flex: "none", position: "relative" }}>
              <Sequence from={it.at + 6} durationInFrames={58} layout="none">
                <OffthreadVideo src={staticFile("local/lottie/check.webm")} transparent muted style={{ width: "100%", height: "100%" }} />
              </Sequence>
              {frame >= it.at + 64 ? <Img src={staticFile("local/lottie/check-last.png")} style={{ width: "100%", height: "100%" }} /> : null}
            </div>
            <Img src={staticFile(it.icon)} style={{ width: fs * 1.1, height: fs * 1.1, filter: "invert(1)", opacity: 0.9 }} />
            <div style={{ fontSize: fs, fontWeight: 700, lineHeight: 1.15, textShadow: "0 6px 20px rgba(0,0,0,0.5)" }}>{it.text}</div>
            <Sequence from={it.at + 6} durationInFrames={10} layout="none"><Audio src={staticFile("audio/sfx/pop.wav")} volume={0.4} /></Sequence>
          </div>
        );
      })}
    </div>
  );
};

const Final: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const t = interpolate(frame, [4, 20], [0, 1], { easing: Easing.out(Easing.back(1.4)), extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", left: 0, width, top: height * 0.2, textAlign: "center", fontFamily: fontFamily("Unbounded"), fontWeight: 800, fontSize: width * 0.1, lineHeight: 1.05, transform: `scale(${t})`, opacity: t, textShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>
      <ShinyText color="#ffffff" shine="#bfe3ff" periodSeconds={2}>GLOBAL<br />TECH TOUR</ShinyText>
    </div>
  );
};
