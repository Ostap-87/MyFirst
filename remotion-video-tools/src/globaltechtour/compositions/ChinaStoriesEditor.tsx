import { useCallback, useEffect, useState } from "react";
import {
  AbsoluteFill,
  cancelRender,
  continueRender,
  delayRender,
  type CalculateMetadataFunction,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";
import { useCaptions } from "../../shared/useCaptions";
import { fontFamily } from "../../shared/fonts";
import { ChinaStories, chinaStoriesSchema } from "./ChinaStories";

/**
 * Монтажный стол ChinaStories — ролик и его лента в одном кадре.
 *
 * Зачем: итог собирается из съёмки, крючка, плашек, перебивок и субтитров,
 * и по готовому MP4 не видно, какой слой откуда взялся и когда включился.
 * Здесь сверху идёт сам ролик, снизу — лента как в CapCut: курсор стоит,
 * дорожки едут под ним. Что сейчас в кадре — справа от превью.
 *
 * Пропсы — те же, что у ChinaStories, плюс заголовок и файл громкости.
 * Поэтому стол показывает не макет, а ровно тот ролик, который уйдёт в
 * публикацию: превью рендерится самой ChinaStories.
 *
 * Собирается командой `npm run editor -- --id <композиция>`.
 */

export const chinaStoriesEditorSchema = chinaStoriesSchema.extend({
  title: z.string().describe("Какой ролик на столе — id композиции"),
  peaksSrc: z
    .string()
    .describe("Громкость по кадрам, JSON внутри public; пусто — без волны"),
});

type EditorProps = z.infer<typeof chinaStoriesEditorSchema>;
type Plate = EditorProps["plates"][number];

export const calculateEditorMetadata: CalculateMetadataFunction<
  EditorProps
> = ({ props }) => ({
  durationInFrames: Math.ceil(props.durationSeconds * 30),
});

// ——— Геометрия стола, пиксели кадра 1080×1920 ———

const W = 1080;
const PREVIEW_TOP = 128;
const PREVIEW_H = 1040;
const PREVIEW_SCALE = PREVIEW_H / 1920;
const PREVIEW_W = Math.round(1080 * PREVIEW_SCALE);
const PREVIEW_LEFT = 36;
const SIDE_LEFT = PREVIEW_LEFT + PREVIEW_W + 28;
const OVERVIEW_TOP = 1204;
const TIMELINE_TOP = 1276;
const LABEL_W = 150;
const LANE_W = W - LABEL_W;
/** Сколько пикселей ленты на секунду: в окне ~8,5 с — видно фразу целиком. */
const PPS = 110;
/** Курсор левее центра: впереди видно больше, чем позади. */
const PLAYHEAD_X = LABEL_W + Math.round(LANE_W * 0.4);

const C = {
  bg: "#0B0E14",
  panel: "#131823",
  lane: "#171D29",
  line: "#273042",
  dim: "#7C879B",
  text: "#E8ECF3",
  video: "#1F6FEB",
  hook: "#8B5CF6",
  term: "#E8ECF3",
  accent: "#2563EB",
  struck: "#FF6B6B",
  cutaway: "#F59E0B",
  words: "#22C55E",
  playhead: "#FF3B30",
};

const UI = fontFamily("Inter");
const MONO = fontFamily("JetBrains Mono");

const KIND_RU: Record<Plate["kind"], string> = {
  term: "термин",
  accent: "акцент",
  struck: "зачёркнуто",
};

const tc = (s: number) => {
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${String(m).padStart(2, "0")}:${rest.toFixed(2).padStart(5, "0")}`;
};

/** Громкость по кадрам: считает `npm run editor`, здесь только читаем. */
const usePeaks = (src: string): number[] => {
  const [peaks, setPeaks] = useState<number[]>([]);
  const [handle] = useState(() => delayRender(`Громкость: ${src || "нет"}`));

  const load = useCallback(async () => {
    if (!src) {
      continueRender(handle);
      return;
    }
    try {
      const res = await fetch(staticFile(src));
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      setPeaks((await res.json()) as number[]);
      continueRender(handle);
    } catch (err) {
      cancelRender(new Error(`Не прочитал громкость «${src}»: ${String(err)}`));
    }
  }, [handle, src]);

  useEffect(() => {
    load();
  }, [load]);

  return peaks;
};

/**
 * Плашки раскладываются по полосам, как клипы в монтажке: пересекаются по
 * времени — встают друг под друга. Одна полоса на все скрыла бы стопку
 * терминов, а она и есть главный приём перечисления.
 */
const lanesFor = (plates: Plate[], total: number) => {
  const ends: number[] = [];
  return plates
    .slice()
    .sort((a, b) => a.at - b.at)
    .map((p) => {
      const end = p.until ?? total;
      let lane = ends.findIndex((e) => e <= p.at + 0.01);
      if (lane < 0) {
        lane = ends.length;
        ends.push(end);
      } else {
        ends[lane] = end;
      }
      return { plate: p, lane, end };
    });
};

const Clip: React.FC<{
  readonly from: number;
  readonly to: number;
  readonly now: number;
  readonly top: number;
  readonly height: number;
  readonly color: string;
  readonly label: string;
  readonly dark?: boolean;
  readonly strike?: boolean;
  readonly size?: number;
  readonly glow?: boolean;
}> = ({ from, to, now, top, height, color, label, dark, strike, size = 22, glow = true }) => {
  const x = PLAYHEAD_X + (from - now) * PPS;
  const w = Math.max(4, (to - from) * PPS - 3);
  if (x + w < LABEL_W - 20 || x > W + 20) return null;
  const live = now >= from && now < to;
  // Подпись липнет к левому краю ленты, как в монтажках: клип, начало
  // которого уехало под колонку названий, иначе остаётся безымянным.
  const hidden = Math.max(0, LABEL_W - x);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top,
        width: w,
        height,
        borderRadius: 8,
        backgroundColor: color,
        opacity: live ? 1 : 0.55,
        boxShadow: live && glow ? `0 0 0 3px #fff, 0 0 22px ${color}` : "none",
        color: dark ? "#0B0E14" : "#fff",
        fontFamily: UI,
        fontWeight: 700,
        fontSize: size,
        lineHeight: `${height}px`,
        padding: `0 10px 0 ${10 + hidden}px`,
        overflow: "hidden",
        whiteSpace: "nowrap",
        textOverflow: "ellipsis",
        textDecoration: strike ? "line-through" : "none",
        boxSizing: "border-box",
      }}
    >
      {label}
    </div>
  );
};

const TrackLabel: React.FC<{
  readonly top: number;
  readonly height: number;
  readonly name: string;
  readonly color: string;
}> = ({ top, height, name, color }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top,
      width: LABEL_W,
      height,
      display: "flex",
      alignItems: "center",
      gap: 10,
      paddingLeft: 18,
      boxSizing: "border-box",
      backgroundColor: C.panel,
      borderRight: `1px solid ${C.line}`,
      fontFamily: UI,
      fontWeight: 700,
      fontSize: 19,
      letterSpacing: 1,
      color: C.dim,
    }}
  >
    <span
      style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }}
    />
    {name}
  </div>
);

export const ChinaStoriesEditor: React.FC<EditorProps> = (props) => {
  const { title, peaksSrc, ...story } = props;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const now = frame / fps;
  const total = story.durationSeconds;

  const captions = useCaptions(story.captionsSrc || null);
  const peaks = usePeaks(peaksSrc);
  const laid = lanesFor(story.plates, total);
  const plateLanes = Math.max(1, ...laid.map((l) => l.lane + 1));

  // ——— Что сейчас в кадре: та же логика, что в ChinaStories ———
  const cutawayNow = story.cutaways.find(
    (c) => now >= c.at && now < c.at + c.seconds,
  );
  const platesNow = cutawayNow
    ? []
    : story.plates.filter(
        (p) => now >= p.at && (p.until === undefined || now < p.until),
      );
  const hookNow = now < 2.8;
  const word = captions.find(
    (w) => now * 1000 >= w.startMs && now * 1000 < w.endMs,
  );
  const shownPlates = story.plates.filter((p) => p.at <= now).length;

  // ——— Дорожки сверху вниз ———
  const RULER_H = 40;
  const TRACK_GAP = 12;
  const VIDEO_H = 124;
  const HOOK_H = 58;
  const PLATE_LANE_H = 54;
  const CUT_H = 58;
  const WORDS_H = 66;

  let y = TIMELINE_TOP + RULER_H + TRACK_GAP;
  const videoY = y;
  y += VIDEO_H + TRACK_GAP;
  const hookY = y;
  y += HOOK_H + TRACK_GAP;
  const platesY = y;
  const platesH = plateLanes * PLATE_LANE_H + (plateLanes - 1) * 6;
  y += platesH + TRACK_GAP;
  const cutY = y;
  y += CUT_H + TRACK_GAP;
  const wordsY = y;

  // Шкала: метка каждую секунду, подпись каждые две.
  const firstTick = Math.max(0, Math.floor(now - PLAYHEAD_X / PPS));
  const lastTick = Math.ceil(now + (W - PLAYHEAD_X) / PPS);
  const ticks: number[] = [];
  for (let s = firstTick; s <= Math.min(lastTick, Math.ceil(total)); s += 1) {
    ticks.push(s);
  }

  // Волна: только видимое окно, по столбику на кадр.
  const bars: React.ReactNode[] = [];
  if (peaks.length) {
    const i0 = Math.max(0, Math.floor((now - PLAYHEAD_X / PPS) * fps));
    const i1 = Math.min(peaks.length, Math.ceil((now + W / PPS) * fps));
    const bw = PPS / fps;
    for (let i = i0; i < i1; i += 1) {
      const x = PLAYHEAD_X + (i / fps - now) * PPS;
      if (x < LABEL_W) continue;
      const h = Math.max(2, peaks[i] * (VIDEO_H - 34));
      bars.push(
        <rect
          key={i}
          x={x}
          y={videoY + 30 + (VIDEO_H - 34 - h) / 2}
          width={Math.max(1, bw - 1)}
          height={h}
          rx={1}
          fill={i / fps <= now ? "#9CC3FF" : "#4E7FD1"}
        />,
      );
    }
  }

  const sideRow = (color: string, head: string, body: string, strike = false) => (
    <div
      key={`${head}-${body}`}
      style={{
        backgroundColor: C.panel,
        borderLeft: `6px solid ${color}`,
        borderRadius: 10,
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          fontFamily: UI,
          fontWeight: 700,
          fontSize: 16,
          letterSpacing: 1.2,
          color: C.dim,
          textTransform: "uppercase",
        }}
      >
        {head}
      </div>
      <div
        style={{
          fontFamily: UI,
          fontWeight: 700,
          fontSize: 23,
          lineHeight: 1.2,
          color: C.text,
          marginTop: 4,
          textDecoration: strike ? "line-through" : "none",
          overflowWrap: "anywhere",
        }}
      >
        {body}
      </div>
    </div>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {/* ——— Шапка: что на столе и где курсор ——— */}
      <div
        style={{
          position: "absolute",
          left: PREVIEW_LEFT,
          right: 36,
          top: 34,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: UI,
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: 3,
              color: C.dim,
            }}
          >
            МОНТАЖНЫЙ СТОЛ · CHINASTORIES
          </div>
          <div
            style={{
              fontFamily: UI,
              fontWeight: 800,
              fontSize: 34,
              color: C.text,
              marginTop: 4,
            }}
          >
            {title}
          </div>
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontWeight: 700,
            fontSize: 38,
            color: C.text,
          }}
        >
          {tc(now)}
          <span style={{ color: C.dim, fontSize: 26 }}> / {tc(total)}</span>
        </div>
      </div>

      {/* ——— Превью: сама ChinaStories в своём кадре 1080×1920 ——— */}
      <div
        style={{
          position: "absolute",
          left: PREVIEW_LEFT,
          top: PREVIEW_TOP,
          width: PREVIEW_W,
          height: PREVIEW_H,
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: `0 0 0 2px ${C.line}`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 1080,
            height: 1920,
            transform: `scale(${PREVIEW_SCALE})`,
            transformOrigin: "0 0",
          }}
        >
          <Sequence width={1080} height={1920} name="Превью">
            <ChinaStories {...story} />
          </Sequence>
        </div>
      </div>

      {/* ——— Инспектор: что в кадре прямо сейчас ——— */}
      <div
        style={{
          position: "absolute",
          left: SIDE_LEFT,
          right: 36,
          top: PREVIEW_TOP,
          height: PREVIEW_H,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            fontFamily: UI,
            fontWeight: 700,
            fontSize: 18,
            letterSpacing: 3,
            color: C.dim,
          }}
        >
          СЕЙЧАС В КАДРЕ
        </div>
        {sideRow(C.video, "Съёмка", story.footage.replace(/^local\//, ""))}
        {hookNow
          ? sideRow(C.hook, "Крючок · 0–2,8 с", `${story.hookTop} ${story.hookBottom}`)
          : null}
        {platesNow.map((p) =>
          sideRow(
            p.kind === "struck" ? C.struck : p.kind === "accent" ? C.accent : "#C9D1DD",
            `Плашка · ${KIND_RU[p.kind]}`,
            p.text,
            p.kind === "struck",
          ),
        )}
        {cutawayNow
          ? sideRow(C.cutaway, "Перебивка · сайт", cutawayNow.src.replace(/^.*\//, ""))
          : null}
        {sideRow(C.words, "Субтитр", word ? word.text.trim() : "—")}

        <div style={{ flex: 1 }} />

        {/* Состав монтажа: счётчики растут по ходу ролика. */}
        <div
          style={{
            backgroundColor: C.panel,
            borderRadius: 12,
            padding: "14px 16px",
            fontFamily: UI,
            fontSize: 20,
            color: C.dim,
            lineHeight: 1.6,
          }}
        >
          <div style={{ fontWeight: 700, letterSpacing: 2, fontSize: 16 }}>
            СОСТАВ
          </div>
          <div>
            Плашки{" "}
            <b style={{ color: C.text }}>
              {shownPlates}/{story.plates.length}
            </b>
          </div>
          <div>
            Перебивки{" "}
            <b style={{ color: C.text }}>
              {story.cutaways.filter((c) => c.at <= now).length}/
              {story.cutaways.length}
            </b>
          </div>
          <div>
            Слова{" "}
            <b style={{ color: C.text }}>
              {captions.filter((w) => w.startMs <= now * 1000).length}/
              {captions.length}
            </b>
          </div>
        </div>
      </div>

      {/* ——— Обзор: весь ролик одной полосой ——— */}
      <div
        style={{
          position: "absolute",
          left: PREVIEW_LEFT,
          right: 36,
          top: OVERVIEW_TOP,
          height: 44,
          borderRadius: 10,
          backgroundColor: C.panel,
          overflow: "hidden",
        }}
      >
        {(() => {
          const ow = W - PREVIEW_LEFT - 36;
          const at = (s: number) => (s / total) * ow;
          return (
            <>
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: at(now),
                  backgroundColor: "rgba(31,111,235,0.28)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 6,
                  width: at(2.8),
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: C.hook,
                }}
              />
              {story.plates.map((p) => (
                <div
                  key={`o-${p.text}-${p.at}`}
                  style={{
                    position: "absolute",
                    left: at(p.at),
                    top: 18,
                    width: Math.max(4, at((p.until ?? total) - p.at)),
                    height: 8,
                    borderRadius: 4,
                    backgroundColor:
                      p.kind === "struck"
                        ? C.struck
                        : p.kind === "accent"
                          ? C.accent
                          : C.term,
                  }}
                />
              ))}
              {story.cutaways.map((c) => (
                <div
                  key={`oc-${c.at}`}
                  style={{
                    position: "absolute",
                    left: at(c.at),
                    top: 30,
                    width: Math.max(4, at(c.seconds)),
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: C.cutaway,
                  }}
                />
              ))}
              <div
                style={{
                  position: "absolute",
                  left: at(now) - 2,
                  top: 0,
                  bottom: 0,
                  width: 4,
                  backgroundColor: C.playhead,
                }}
              />
            </>
          );
        })()}
      </div>

      {/* ——— Лента ——— */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: TIMELINE_TOP,
          width: W,
          bottom: 0,
          backgroundColor: C.bg,
          borderTop: `1px solid ${C.line}`,
        }}
      />

      {/* Фон дорожек */}
      {[
        [videoY, VIDEO_H],
        [hookY, HOOK_H],
        [platesY, platesH],
        [cutY, CUT_H],
        [wordsY, WORDS_H],
      ].map(([top, h]) => (
        <div
          key={`lane-${top}`}
          style={{
            position: "absolute",
            left: LABEL_W,
            right: 0,
            top,
            height: h,
            backgroundColor: C.lane,
          }}
        />
      ))}

      {/* Шкала */}
      {ticks.map((s) => {
        const x = PLAYHEAD_X + (s - now) * PPS;
        if (x < LABEL_W) return null;
        return (
          <div
            key={`t-${s}`}
            style={{
              position: "absolute",
              left: x,
              top: TIMELINE_TOP + 8,
              height: RULER_H - 8,
              borderLeft: `2px solid ${C.line}`,
              paddingLeft: 6,
              fontFamily: MONO,
              fontSize: 17,
              color: C.dim,
            }}
          >
            {s % 2 === 0 ? `${s}s` : ""}
          </div>
        );
      })}

      {/* Видео: полоса съёмки и волна громкости */}
      <Clip
        from={0}
        to={total}
        now={now}
        top={videoY}
        height={VIDEO_H}
        color="#15325F"
        label=""
        glow={false}
      />
      <div
        style={{
          position: "absolute",
          left: Math.max(LABEL_W + 8, PLAYHEAD_X - now * PPS + 10),
          top: videoY + 4,
          fontFamily: UI,
          fontWeight: 700,
          fontSize: 18,
          color: "#9CC3FF",
          whiteSpace: "nowrap",
        }}
      >
        {story.footage.replace(/^local\//, "")}
      </div>
      <svg
        width={W}
        height={1920}
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        {bars}
      </svg>

      <Clip
        from={0}
        to={2.8}
        now={now}
        top={hookY}
        height={HOOK_H}
        color={C.hook}
        label={`${story.hookTop} ${story.hookBottom}`}
      />

      {laid.map(({ plate, lane, end }) => (
        <Clip
          key={`p-${plate.text}-${plate.at}`}
          from={plate.at}
          to={end}
          now={now}
          top={platesY + lane * (PLATE_LANE_H + 6)}
          height={PLATE_LANE_H}
          color={
            plate.kind === "struck"
              ? C.struck
              : plate.kind === "accent"
                ? C.accent
                : C.term
          }
          dark={plate.kind === "term"}
          strike={plate.kind === "struck"}
          label={plate.text}
        />
      ))}

      {story.cutaways.map((c) => (
        <Clip
          key={`c-${c.at}`}
          from={c.at}
          to={c.at + c.seconds}
          now={now}
          top={cutY}
          height={CUT_H}
          color={C.cutaway}
          dark
          label={c.src.replace(/^.*\//, "")}
        />
      ))}

      {captions.map((w) => (
        <Clip
          key={`w-${w.startMs}`}
          from={w.startMs / 1000}
          to={w.endMs / 1000}
          now={now}
          top={wordsY}
          height={WORDS_H}
          color={C.words}
          dark
          size={19}
          label={w.text.trim()}
        />
      ))}

      {/* Подписи дорожек поверх уезжающих клипов */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: TIMELINE_TOP,
          width: LABEL_W,
          height: RULER_H,
          backgroundColor: C.panel,
          borderRight: `1px solid ${C.line}`,
        }}
      />
      <TrackLabel top={videoY} height={VIDEO_H} name="ВИДЕО" color={C.video} />
      <TrackLabel top={hookY} height={HOOK_H} name="КРЮЧОК" color={C.hook} />
      <TrackLabel top={platesY} height={platesH} name="ПЛАШКИ" color={C.term} />
      <TrackLabel top={cutY} height={CUT_H} name="САЙТ" color={C.cutaway} />
      <TrackLabel top={wordsY} height={WORDS_H} name="СЛОВА" color={C.words} />

      {/* Курсор воспроизведения: стоит на месте, лента едет */}
      <div
        style={{
          position: "absolute",
          left: PLAYHEAD_X - 2,
          top: TIMELINE_TOP,
          width: 4,
          height: wordsY + WORDS_H + 12 - TIMELINE_TOP,
          backgroundColor: C.playhead,
          boxShadow: `0 0 16px ${C.playhead}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: PLAYHEAD_X - 14,
          top: TIMELINE_TOP - 6,
          width: 0,
          height: 0,
          borderLeft: "14px solid transparent",
          borderRight: "14px solid transparent",
          borderTop: `18px solid ${C.playhead}`,
        }}
      />
    </AbsoluteFill>
  );
};

export default ChinaStoriesEditor;
