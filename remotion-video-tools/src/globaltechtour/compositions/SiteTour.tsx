import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  staticFile,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import {
  BlockFade,
  cameraShotSchema,
  captureSegmentSchema,
  CtaCard,
  cursorEventSchema,
  LaptopCapture,
  PhoneCapture,
  RouteChips,
  SpinningTetra,
  StatBadge,
  TickerTape,
} from "../../shared/components/effects";
import { KaraokeCaptions } from "../../shared/components/KaraokeCaptions";
import { useCaptions } from "../../shared/useCaptions";
import { fontFamily } from "../../shared/fonts";
import theme from "../theme";

/**
 * SiteTour — промо сайта «по одному промпту»: голос владельца, настоящая
 * запись сайта на ноутбуке и телефоне, говорящая голова в начале и конце.
 *
 * Все тайминги — в кадрах и приходят пропсами из `npm run site-tour`:
 * скрипт кладёт блоки по длине реплик, нарезает запись экрана и
 * пересчитывает путь курсора. Композиция только рисует.
 *
 * Говорящая голова пока из пула: студийных дублей нет, в кадре прогулка
 * по Шанхаю под закадровый голос. Придут дубли — меняются только `heads`.
 */
const headClip = z.object({ src: z.string(), start: z.number(), seconds: z.number().optional() });
export const siteTourSchema = z.object({
  lang: z.enum(["ru", "en"]),
  voiceSrc: z.string(),
  captionsSrc: z.string(),
  screenSrc: z.string(),
  screenW: z.number(),
  screenH: z.number(),
  url: z.string(),
  screen: z.array(captureSegmentSchema),
  cursor: z.array(cursorEventSchema),
  typing: z.object({ from: z.number().int(), to: z.number().int() }),
  shots: z.array(cameraShotSchema),
  enterFrame: z.number().int(),
  phoneSrc: z.string(),
  phone: z.object({ from: z.number().int(), to: z.number().int(), rec: z.number(), rate: z.number() }),
  heads: z.array(z.object({ from: z.number().int(), to: z.number().int(), clips: z.array(headClip) })),
  stat: z.object({ from: z.number().int(), to: z.number().int(), value: z.number(), label: z.string() }),
  ticker: z.object({ from: z.number().int(), to: z.number().int(), items: z.array(z.string()) }),
  route: z.object({ cities: z.array(z.string()), frames: z.array(z.number().int().nullable()) }),
  cta: z.object({ from: z.number().int(), days: z.number(), daysLabel: z.string() }),
  blocks: z.array(z.object({ i: z.number(), kind: z.string(), from: z.number().int(), to: z.number().int() })),
});
export type SiteTourProps = z.infer<typeof siteTourSchema>;

const ACCENT = theme.colors.accent;

const Backdrop: React.FC = () => (
  <AbsoluteFill
    style={{
      background: "radial-gradient(120% 70% at 50% 42%, #16264a 0%, #0a1224 55%, #05080f 100%)",
    }}
  />
);

const Brand: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <div style={{ position: "absolute", top: height * 0.075, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: width * 0.025 }}>
      <SpinningTetra size={width * 0.09} degreesPerSecond={60} />
      <span style={{ fontFamily: fontFamily(theme.fonts.heading), fontWeight: 700, fontSize: width * 0.045, color: "#fff", letterSpacing: 2 }}>
        GLOBAL TECH TOUR
      </span>
    </div>
  );
};

const HeadBlock: React.FC<{ readonly clips: z.infer<typeof headClip>[] }> = ({ clips }) => {
  const { fps, durationInFrames } = useVideoConfig();
  let at = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {clips.map((c, i) => {
        const len = i === clips.length - 1 ? durationInFrames - at : Math.round((c.seconds ?? 4) * fps);
        const from = at;
        at += len;
        return (
          <Sequence key={`${c.src}-${i}`} from={from} durationInFrames={len}>
            <OffthreadVideo
              src={staticFile(c.src)}
              muted
              trimBefore={Math.round(c.start * fps)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Sequence>
        );
      })}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.65) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};

export const SiteTour: React.FC<SiteTourProps> = (p) => {
  const { height, fps } = useVideoConfig();
  const captions = useCaptions(p.captionsSrc || null);
  // «Десять дней» — цифра появляется на этом слове.
  const daysWord = captions.find((c) => /десят|^\s*ten\b|^\s*10\b/i.test(c.text) && c.startMs / 1000 * fps > p.cta.from);
  const daysAt = daysWord ? Math.round((daysWord.startMs / 1000) * fps) - p.cta.from : 180;
  const screenBlocks = p.blocks.filter((b) => b.kind === "screen");
  const screenFrom = Math.min(...screenBlocks.map((b) => b.from));
  const screenTo = Math.max(...screenBlocks.map((b) => b.to));

  return (
    <AbsoluteFill style={{ backgroundColor: "#05080f" }}>
      <Backdrop />
      {/* Ноутбук: один слой на все экранные блоки, пустой между ними. */}
      <Sequence durationInFrames={screenTo}>
        <LaptopCapture
          src={p.screenSrc}
          screenW={p.screenW}
          screenH={p.screenH}
          segments={p.screen}
          cursor={p.cursor}
          url={p.url}
          typing={p.typing}
          shots={p.shots}
          centerY={0.46}
          enterFrame={p.enterFrame}
        />
      </Sequence>

      <Sequence from={p.phone.from} durationInFrames={p.phone.to - p.phone.from}>
        <PhoneCapture src={p.phoneSrc} rec={p.phone.rec} rate={p.phone.rate} heightFraction={0.62} />
      </Sequence>

      {p.heads.map((h) => (
        <Sequence key={`head-${h.from}`} from={h.from} durationInFrames={h.to - h.from}>
          <BlockFade frames={6}>
            <HeadBlock clips={h.clips} />
          </BlockFade>
        </Sequence>
      ))}

      {/* Знак бренда поверх экранных блоков. */}
      <Sequence from={screenFrom} durationInFrames={screenTo - screenFrom}>
        <Brand />
      </Sequence>

      <Sequence from={p.stat.from} durationInFrames={p.stat.to - p.stat.from} layout="none">
        <div style={{ position: "absolute", left: 0, right: 0, top: height * 0.15 }}>
          <StatBadge value={p.stat.value} suffix="+" label={p.stat.label} accent={ACCENT} />
        </div>
      </Sequence>
      <Sequence from={p.ticker.from} durationInFrames={p.ticker.to - p.ticker.from} layout="none">
        <div style={{ position: "absolute", left: 0, right: 0, top: height * 0.695 }}>
          <TickerTape items={p.ticker.items} accent={ACCENT} />
        </div>
      </Sequence>
      {(() => {
        const b = p.blocks[3];
        return (
          <Sequence from={b.from} durationInFrames={b.to - b.from} layout="none">
            <div style={{ position: "absolute", left: 0, right: 0, top: height * 0.7 }}>
              <RouteChips cities={p.route.cities} at={p.route.frames.map((f) => (f === null ? null : f - b.from))} accent={ACCENT} />
            </div>
          </Sequence>
        );
      })()}
      <Sequence from={p.cta.from} layout="none">
        <div style={{ position: "absolute", left: 0, right: 0, top: height * 0.14 }}>
          <CtaCard site="globaltechtour.ru" days={p.cta.days} daysLabel={p.cta.daysLabel} daysAt={daysAt} accent={ACCENT} />
        </div>
      </Sequence>

      {/* Субтитры — над подписью Reels, та же зона, что и у Head. */}
      <AbsoluteFill style={{ justifyContent: "flex-end", paddingBottom: Math.round(height * 0.13), paddingLeft: 60, paddingRight: 60 }}>
        <KaraokeCaptions theme={theme} captions={captions} mode="page" highlight="color" captionStyle="shadow" font="Onest" fontSizeFraction={0.05} />
      </AbsoluteFill>

      {p.voiceSrc ? <Audio src={staticFile(p.voiceSrc)} /> : null}
    </AbsoluteFill>
  );
};

export default SiteTour;
