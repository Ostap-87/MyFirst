import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { z } from "zod";

/**
 * SiteCutaway — перебивка со страницей сайта.
 *
 * Показывает длинный скриншот страницы и медленно ведёт его вверх, как будто
 * страницу листают. Нужна там, где в речи упоминается сайт: слова «на сайте
 * можно посмотреть» без картинки проверить нельзя, а с картинкой — видно.
 *
 * ——— Почему окно, а не весь кадр ———
 *
 * Первая версия занимала кадр целиком, и это не сработало: страница белая,
 * логотип и субтитры поверх неё — белые же, и на три секунды они исчезали.
 * Затемнять страницу градиентами значит прятать ровно то, ради чего перебивка
 * и ставится.
 *
 * Поэтому страница живёт в окне: сверху остаётся тёмная полоса под логотип,
 * снизу — под субтитры. Ничего не затемняется и ничего не пропадает.
 *
 * ——— Почему скриншот, а не встроенная страница ———
 *
 * 1. Рендер не должен ходить в сеть. Живая страница означала бы, что кадр
 *    зависит от того, что сайт отдаст в момент рендера.
 * 2. Скриншот снят с мобильной вёрстки: десктопная в кадр 1080×1920 влезает
 *    только уменьшенной втрое, и текст перестаёт читаться.
 *
 * Прокрутка задаётся долями высоты картинки, а не пикселями: страницы
 * отличаются по высоте в разы, и пиксели пришлось бы подбирать под каждую.
 */
export const siteCutawaySchema = z.object({
  src: z
    .string()
    .describe("Путь к скриншоту страницы внутри public, например site/industries.png"),
  from: z
    .number()
    .min(0)
    .max(1)
    .describe("С какой доли высоты начинается показ: 0 — сверху страницы"),
  to: z
    .number()
    .min(0)
    .max(1)
    .describe("На какой доле заканчивается: разница с from задаёт скорость"),
  zoom: z
    .number()
    .min(1)
    .max(1.3)
    .describe("Наезд к концу перебивки: 1 — без наезда"),
  fadeFrames: z
    .number()
    .min(0)
    .max(30)
    .describe("Сколько кадров занимают появление и уход"),
});

export type SiteCutawayProps = z.infer<typeof siteCutawaySchema>;

export const siteCutawayDefaults: SiteCutawayProps = {
  src: "site/industries.png",
  from: 0.03,
  to: 0.3,
  zoom: 1.04,
  fadeFrames: 8,
};

/**
 * Границы окна в долях высоты кадра.
 *
 * Верх совпадает с тем местом, где в композиции стоят плашки (0.225): на
 * время перебивки они прячутся, и место освобождается под окно.
 *
 * Низ отмерен от субтитров, а не на глаз. Они прижаты к 0.16 от нижнего
 * края, строка занимает около 90 px, то есть её верх приходится на 1523.
 * Окно кончается на 1469 — остаётся зазор в полсотни пикселей. При 0.185,
 * как было сначала, субтитры ложились прямо на белый край окна.
 */
const WINDOW_TOP = 0.225;
const WINDOW_BOTTOM = 0.235;
const WINDOW_SIDE = 0.05;

export const SiteCutaway: React.FC<SiteCutawayProps> = ({
  src,
  from,
  to,
  zoom,
  fadeFrames,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();

  const progress = interpolate(frame, [0, durationInFrames - 1], [from, to], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale = interpolate(frame, [0, durationInFrames - 1], [1, zoom], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Уход считаем от конца, а не от начала: длительность приходит из Sequence
  // и у каждой перебивки своя.
  const opacity = Math.min(
    interpolate(frame, [0, fadeFrames], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }),
    interpolate(
      frame,
      [durationInFrames - 1 - fadeFrames, durationInFrames - 1],
      [1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    ),
  );

  // Окно чуть подаётся вверх на входе: без движения оно возникает как
  // наклейка, с движением — как открывшийся экран.
  const rise = interpolate(frame, [0, fadeFrames * 2], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const sidePad = Math.round(width * WINDOW_SIDE);
  const innerWidth = width - sidePad * 2;

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* Тёмная подложка на весь кадр: она и прячет съёмку, и даёт логотипу
          с субтитрами тот же фон, что у них в остальном ролике. */}
      <AbsoluteFill style={{ backgroundColor: "rgba(6,9,15,0.94)" }} />

      <div
        style={{
          position: "absolute",
          top: Math.round(height * WINDOW_TOP),
          bottom: Math.round(height * WINDOW_BOTTOM),
          left: sidePad,
          right: sidePad,
          overflow: "hidden",
          borderRadius: Math.round(width * 0.03),
          backgroundColor: "#fff",
          boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
          transform: `translateY(${rise * height * 0.03}px)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            transform: `translateY(-${progress * 100}%) scale(${scale})`,
            transformOrigin: "50% 0%",
          }}
        >
          <Img
            src={staticFile(src)}
            style={{ width: innerWidth, height: "auto", display: "block" }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default SiteCutaway;
