import { AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile } from "remotion";
import { z } from "zod";
import { BackTitle, CheckList, CycleDiagram, TypingPush } from "./components/effects";

/**
 * Shared-HeadFxLab — проба трёх приёмов для говорящей головы на тестовом
 * материале (ни один готовый ролик не трогается):
 *   0–3 с   надпись за спикером (BackTitle, behind);
 *   3–6 с   спикер отъезжает влево, надпись сбоку (BackTitle, side);
 *   6–12 с  чек-лист с галочками (CheckList);
 *  16–19 с  надпись за спикером на настоящем фоне;
 *  19–24 с  титры печатаются сбоку, съёмка отъезжает (TypingPush);
 *  12–18 с  круговая диаграмма из стрелок (CycleDiagram).
 * Съёмка и вырезка берутся из уже готового интро (`local/head/s29-intro*`),
 * с 20-й секунды. Рендер:
 *   npx remotion render <bundle> Shared-HeadFxLab out/lab/head-fx.mp4
 */
export const headFxLabSchema = z.object({
  footage: z.string(),
  cutout: z.string(),
  offsetSeconds: z.number().min(0),
  sceneOffsets: z.array(z.number().min(0)).describe("Секунда съёмки, с которой идёт каждая сцена: вырезка есть только в отрезках stages интро"),
  background: z.enum(["video", "still", "none"]).describe("Фон: размытая съёмка, размытый стоп-кадр или ничего"),
});

export const headFxLabDefaults: z.infer<typeof headFxLabSchema> = {
  footage: "local/head/s29-intro.mp4",
  cutout: "local/head/s29-intro-cutout.webm",
  offsetSeconds: 20,
  // Вырезка интро есть только в 14.18–19.09, 36.02–37.79, 41.27–46.72, 74.62–78.27.
  sceneOffsets: [14.3, 74.8, 41.3, 41.3, 14.3, 41.3],
  background: "video",
};

const SCENE = 80; // 2,67 с при 30 к/с: сцены влезают в отрезки с вырезкой

export const HeadFxLab: React.FC<z.infer<typeof headFxLabSchema>> = (p) => {
  const starts = [0, SCENE, SCENE * 2, SCENE * 4, SCENE * 6, SCENE * 7];
  // Каждая сцена берёт съёмку со своей секунды; `from` — кадр внутри композиции.
  const srcFrame = (from: number) => {
    const i = starts.filter((s) => s <= from).length - 1;
    return Math.round((p.sceneOffsets[i] ?? p.offsetSeconds) * 30) + (from - starts[i]);
  };
  // Фон: та же съёмка, размытая и притемнённая — надпись и список читаются.
  const Background: React.FC<{ from: number }> = ({ from }) => (
    <AbsoluteFill style={{ background: "#0b1220" }}>
      {p.background === "still" ? (
        <Img src={staticFile("local/lab-bg.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : null}
      {p.background === "video" ? (
      <OffthreadVideo
        src={staticFile(p.footage)}
        muted
        trimBefore={srcFrame(from)}
        style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(22px) brightness(0.5) saturate(0.8)", transform: "scale(1.08)" }}
      />
      ) : null}
    </AbsoluteFill>
  );
  const Raw: React.FC<{ from: number }> = ({ from }) => (
    <OffthreadVideo src={staticFile(p.footage)} muted trimBefore={srcFrame(from)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  );
  const Speaker: React.FC<{ from: number }> = ({ from }) => (
    <OffthreadVideo
      src={staticFile(p.cutout)}
      transparent
      muted
      trimBefore={srcFrame(from)}
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  );

  return (
    <AbsoluteFill>
      {/* 1. Надпись за спикером */}
      <Sequence durationInFrames={SCENE} layout="none">
        <Background from={0} />
        <BackTitle lines={["БОЛЕЕ", "*1000", "КОМПАНИЙ"]} mode="behind" delayInFrames={6}>
          <AbsoluteFill><Speaker from={0} /></AbsoluteFill>
        </BackTitle>
      </Sequence>

      {/* 2. Спикер сбоку, надпись столбиком справа */}
      <Sequence from={SCENE} durationInFrames={SCENE} layout="none">
        <Background from={SCENE} />
        <BackTitle lines={["Быстрое", "*согласо-", "*вание", "и 1000+", "компаний"]} mode="side" delayInFrames={4} fontSize={0.19}>
          <AbsoluteFill><Speaker from={SCENE} /></AbsoluteFill>
        </BackTitle>
      </Sequence>

      {/* 3. Чек-лист преимуществ */}
      <Sequence from={SCENE * 2} durationInFrames={SCENE * 2} layout="none">
        <Background from={SCENE * 2} />
        <AbsoluteFill style={{ transform: "translateX(-27%) scale(0.86)", transformOrigin: "50% 100%", filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.45))" }}>
          <Speaker from={SCENE * 2} />
        </AbsoluteFill>
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

      {/* 4. Круговая диаграмма методологии */}
      <Sequence from={SCENE * 4} durationInFrames={SCENE * 2} layout="none">
        <AbsoluteFill style={{ background: "linear-gradient(180deg, #070b16 0%, #0e1730 60%, #0a1226 100%)" }} />
        <CycleDiagram
          center="ТУР"
          segments={[
            { label: "Рецептура", color: "#2563eb" },
            { label: "Упаковка", color: "#0ea5a4" },
            { label: "Ингредиенты", color: "#f59e0b" },
          ]}
          cy={0.36}
          delayInFrames={4}
        />
        <AbsoluteFill style={{ transform: "translateY(18%) scale(0.62)", transformOrigin: "50% 100%", filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.5))" }}>
          <Speaker from={SCENE * 4} />
        </AbsoluteFill>
      </Sequence>

      {/* 5. Надпись за спикером поверх настоящего фона: съёмка как есть,
          текст, сверху вырезанный спикер — ничего не размыто и не продублировано */}
      <Sequence from={SCENE * 6} durationInFrames={SCENE} layout="none">
        <AbsoluteFill><Raw from={SCENE * 6} /></AbsoluteFill>
        <BackTitle lines={["БЫСТРОЕ", "*СОГЛАСОВАНИЕ"]} mode="behind" delayInFrames={4} centerY={0.3} fontSize={0.15}>
          <AbsoluteFill><Speaker from={SCENE * 6} /></AbsoluteFill>
        </BackTitle>
      </Sequence>

      {/* 6. Титры печатаются справа, съёмка отъезжает влево, фон тот же */}
      <Sequence from={SCENE * 7} durationInFrames={SCENE * 2} layout="none">
        <TypingPush lines={["Более", "*1000", "компаний", "в базе"]} side="right" delayInFrames={6} charsPerSecond={11} pushFraction={0.34} columnFraction={0.44}>
          <Raw from={SCENE * 7} />
        </TypingPush>
      </Sequence>
    </AbsoluteFill>
  );
};
