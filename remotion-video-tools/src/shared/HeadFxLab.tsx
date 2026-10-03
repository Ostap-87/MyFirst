import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile } from "remotion";
import { z } from "zod";
import { BackTitle, BalloonTitle, CheckList, CycleDiagram, TypingPush } from "./components/effects";

/**
 * Shared-HeadFxLab — проба приёмов для говорящей головы на тестовом
 * материале (ни один готовый ролик не трогается). Все сцены — на
 * настоящем фоне съёмки, без размытия и дублей:
 *   1. надпись за спикером (BackTitle);
 *   2. буквы-шарики за спиной: надуваются, висят, качаются, сдуваются (BalloonTitle);
 *   3. чек-лист с галочками (CheckList);
 *   4. кольцо из стрелок: собирается, укрупняется за спину и крутится (CycleDiagram);
 *   5. титры печатаются сбоку, съёмка отъезжает (TypingPush).
 * Съёмка — интро (`local/head/s29-intro.mp4`); вырезка спикера есть в
 * `s29-intro-cutout.webm` на отрезках сцен интро и в
 * `s29-intro-lab-cutout.webm` на 20–32 с (сделана для лаборатории).
 */
export const headFxLabSchema = z.object({
  footage: z.string(),
  cutout: z.string().describe("Вырезка с отрезками сцен интро"),
  cutoutLab: z.string().describe("Вырезка 20–32 с для лаборатории"),
  background: z.enum(["video", "still", "none"]).describe("Фон сцен 1–3: съёмка, стоп-кадр или ничего"),
  scenes: z
    .array(z.object({ offset: z.number().min(0), frames: z.number().int().min(1), lab: z.boolean() }))
    .describe("Секунда съёмки, длина в кадрах и какая вырезка у каждой сцены"),
});

export const headFxLabDefaults: z.infer<typeof headFxLabSchema> = {
  footage: "local/head/s29-intro.mp4",
  cutout: "local/head/s29-intro-cutout.webm",
  cutoutLab: "local/head/s29-intro-lab-cutout.webm",
  background: "video",
  scenes: [
    { offset: 20.0, frames: 90, lab: true },
    { offset: 23.2, frames: 200, lab: true },
    { offset: 41.3, frames: 160, lab: false },
    { offset: 25.3, frames: 200, lab: true },
    { offset: 74.8, frames: 160, lab: false },
  ],
};

export const HeadFxLab: React.FC<z.infer<typeof headFxLabSchema>> = (p) => {
  const starts = p.scenes.reduce<number[]>((acc, s, i) => [...acc, i === 0 ? 0 : acc[i - 1] + p.scenes[i - 1].frames], []);
  const at = (i: number) => starts[i];
  const srcFrame = (i: number) => Math.round(p.scenes[i].offset * 30);

  const Raw: React.FC<{ scene: number }> = ({ scene }) => (
    <AbsoluteFill style={{ background: "#0b1220" }}>
      {p.background === "still" ? <Img src={staticFile("local/lab-bg.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
      {p.background === "video" ? (
        <OffthreadVideo src={staticFile(p.footage)} muted trimBefore={srcFrame(scene)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : null}
    </AbsoluteFill>
  );
  const Speaker: React.FC<{ scene: number }> = ({ scene }) => (
    <OffthreadVideo
      src={staticFile(p.scenes[scene].lab ? p.cutoutLab : p.cutout)}
      transparent
      muted
      trimBefore={srcFrame(scene)}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );

  return (
    <AbsoluteFill>
      {/* 1. Надпись за спикером на настоящем фоне */}
      <Sequence from={at(0)} durationInFrames={p.scenes[0].frames} layout="none">
        <Raw scene={0} />
        <BackTitle lines={["БОЛЕЕ", "*1000", "КОМПАНИЙ"]} mode="behind" delayInFrames={6} centerY={0.3}>
          <AbsoluteFill><Speaker scene={0} /></AbsoluteFill>
        </BackTitle>
      </Sequence>

      {/* 2. Буквы-шарики за спиной */}
      <Sequence from={at(1)} durationInFrames={p.scenes[1].frames} layout="none">
        <Raw scene={1} />
        <BalloonTitle lines={["БЫСТРОЕ", "*СОГЛАСОВАНИЕ"]} delayInFrames={6} charsPerSecond={12} holdFrames={75} centerY={0.27}>
          <AbsoluteFill><Speaker scene={1} /></AbsoluteFill>
        </BalloonTitle>
      </Sequence>

      {/* 3. Чек-лист преимуществ: вся съёмка сдвинута влево, фон тот же, без дубля */}
      <Sequence from={at(2)} durationInFrames={p.scenes[2].frames} layout="none">
        <AbsoluteFill style={{ background: "#0b1220" }}>
          <AbsoluteFill style={{ transform: "translateX(-26%) scale(1.27)", transformOrigin: "0% 50%" }}>
            <OffthreadVideo src={staticFile(p.footage)} muted trimBefore={srcFrame(2)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </AbsoluteFill>
        </AbsoluteFill>
        <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(5,10,25,0) 40%, rgba(5,10,25,0.55) 70%)" }} />
        <CheckList
          title="Почему с нами"
          x={0.47}
          y={0.22}
          widthFraction={0.5}
          items={[
            { text: "Более 1000 компаний в базе", at: 10 },
            { text: "Быстрое согласование", at: 45 },
            { text: "Переговоры с руководством", at: 80 },
            { text: "Поддержка после тура", at: 115 },
          ]}
        />
      </Sequence>

      {/* 4. Кольцо: собирается крупно над головой, затем укрупняется за спину и крутится */}
      <Sequence from={at(3)} durationInFrames={p.scenes[3].frames} layout="none">
        <Raw scene={3} />
        <AbsoluteFill style={{ background: "rgba(5,10,25,0.35)" }} />
        <CycleDiagram
          center="ТУР"
          segments={[
            { label: "Рецептура", color: "#2563eb" },
            { label: "Упаковка", color: "#0ea5a4" },
            { label: "Ингредиенты", color: "#f59e0b" },
          ]}
          cy={0.3}
          radiusFraction={0.3}
          growToFraction={0.48}
          growCy={0.5}
          growFrames={30}
          spinSecondsPerTurn={8}
          delayInFrames={4}
        />
        <AbsoluteFill><Speaker scene={3} /></AbsoluteFill>
      </Sequence>

      {/* 5. Титры печатаются справа, съёмка отъезжает влево */}
      <Sequence from={at(4)} durationInFrames={p.scenes[4].frames} layout="none">
        <TypingPush lines={["Более", "*1000", "компаний", "в базе"]} side="right" delayInFrames={6} charsPerSecond={11} pushFraction={0.34} columnFraction={0.44}>
          <OffthreadVideo src={staticFile(p.footage)} muted trimBefore={srcFrame(4)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </TypingPush>
      </Sequence>
    </AbsoluteFill>
  );
};
