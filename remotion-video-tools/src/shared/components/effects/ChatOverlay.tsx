import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";

/**
 * ChatOverlay — переписка поверх видео, с индикатором набора текста.
 *
 * Сильный приём разговорных Reels: вместо пересказа «мне написали» показывают
 * саму переписку. Индикатор «…» перед ответом даёт паузу, за которую зритель
 * успевает прочитать входящее сообщение, и создаёт ощущение живого диалога.
 *
 * Замеры по референсу: входящий пузырь появляется первым, через ~0.5 с
 * справа возникает индикатор набора, ещё через ~0.75 с он заменяется текстом
 * ответа. Верх кадра под пузырями осветляется градиентом, иначе светло-серый
 * пузырь тонет в картинке.
 *
 * Цвета взяты системные (iMessage): #e9e9eb для входящих, #0a84ff для
 * исходящих — узнаваемость приёма как раз в них.
 */
const messageSchema = z.object({
  side: z
    .enum(["in", "out"])
    .describe("in — собеседник слева, out — вы справа"),
  text: z.string().describe("Текст сообщения"),
  atFrame: z
    .number()
    .int()
    .min(0)
    .describe("Кадр, на котором сообщение появляется"),
  typingFrames: z
    .number()
    .int()
    .min(0)
    .describe(
      "Сколько кадров перед текстом показывать индикатор набора, 0 — без него",
    ),
});

export const chatOverlaySchema = z.object({
  messages: z.array(messageSchema).describe("Сообщения переписки по порядку"),
  lighten: z
    .number()
    .min(0)
    .max(1)
    .describe("Плотность осветляющего градиента под пузырями, 0 — выключить"),
  widthFraction: z
    .number()
    .min(0.3)
    .max(1)
    .describe("Максимальная ширина пузыря долей кадра"),
  fontSizeFraction: z
    .number()
    .min(0.01)
    .describe("Кегль текста долей ширины кадра"),
});

export type ChatOverlayParams = z.infer<typeof chatOverlaySchema>;

/** Любой параметр можно опустить — возьмётся значение из chatOverlayDefaults. */
export type ChatOverlayProps = Partial<ChatOverlayParams> & {
  readonly fontFamily?: string;
};

export const chatOverlayDefaults: ChatOverlayParams = {
  messages: [
    {
      side: "in",
      text: "как там дела с роликом?",
      atFrame: 0,
      typingFrames: 0,
    },
    {
      side: "out",
      text: "сейчас опубликовал, сижу жду",
      atFrame: 20,
      typingFrames: 22,
    },
  ],
  lighten: 0.55,
  widthFraction: 0.66,
  fontSizeFraction: 0.036,
};

const INCOMING = { background: "#e9e9eb", color: "#111111" };
const OUTGOING = { background: "#0a84ff", color: "#ffffff" };

/** Три точки, пульсирующие по очереди, — индикатор набора текста. */
const TypingDots: React.FC<{ readonly size: number }> = ({ size }) => {
  const frame = useCurrentFrame();

  return (
    <div style={{ display: "flex", gap: size * 0.38, alignItems: "center" }}>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            backgroundColor: "#ffffff",
            // Фаза сдвинута на треть цикла: точки «бегут» слева направо.
            opacity: interpolate(
              Math.sin(((frame - index * 4) / 9) * Math.PI * 2),
              [-1, 1],
              [0.35, 1],
            ),
          }}
        />
      ))}
    </div>
  );
};

export const ChatOverlay: React.FC<ChatOverlayProps> = ({
  fontFamily,
  ...params
}) => {
  const { messages, lighten, widthFraction, fontSizeFraction } = {
    ...chatOverlayDefaults,
    ...params,
  };
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const fontSize = Math.round(width * fontSizeFraction);
  const padding = Math.round(fontSize * 0.62);
  const radius = Math.round(fontSize * 1.05);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {lighten > 0 ? (
        <AbsoluteFill
          style={{
            // Вуаль короткая: она нужна под самими пузырями, а растянутая
            // на полкадра превращает картинку в туман.
            background: `linear-gradient(to bottom, rgba(255,255,255,${lighten}) 0%, rgba(255,255,255,${lighten * 0.55}) 18%, rgba(255,255,255,0) 38%)`,
          }}
        />
      ) : null}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: Math.round(fontSize * 0.5),
          padding: Math.round(width * 0.05),
          fontFamily,
          fontSize,
        }}
      >
        {messages.map((message) => {
          // Индикатор набора идёт ПЕРЕД сообщением: он занимает typingFrames
          // кадров до atFrame, поэтому появление пузыря сдвигаем назад.
          const typingStart = message.atFrame - message.typingFrames;
          const isTyping =
            message.typingFrames > 0 &&
            frame >= typingStart &&
            frame < message.atFrame;
          const isVisible = frame >= message.atFrame;

          if (!isTyping && !isVisible) return null;

          const appearAt = isTyping ? typingStart : message.atFrame;
          const progress = spring({
            frame: frame - appearAt,
            fps,
            config: { damping: 16, stiffness: 160 },
          });

          const palette = message.side === "in" ? INCOMING : OUTGOING;

          return (
            <div
              key={`${message.side}-${message.atFrame}-${message.text}`}
              style={{
                alignSelf: message.side === "in" ? "flex-start" : "flex-end",
                maxWidth: `${widthFraction * 100}%`,
                padding: `${padding}px ${Math.round(padding * 1.4)}px`,
                borderRadius: radius,
                backgroundColor: isTyping
                  ? OUTGOING.background
                  : palette.background,
                color: palette.color,
                lineHeight: 1.25,
                opacity: interpolate(progress, [0, 0.4], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                }),
                transform: `scale(${interpolate(progress, [0, 1], [0.86, 1])})`,
                transformOrigin:
                  message.side === "in" ? "left center" : "right center",
                boxShadow: "0 6px 22px rgba(0,0,0,0.14)",
              }}
            >
              {isTyping ? (
                <TypingDots size={Math.round(fontSize * 0.34)} />
              ) : (
                message.text
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
