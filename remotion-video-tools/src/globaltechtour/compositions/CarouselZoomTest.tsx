import { z } from "zod";
import { SlowZoom, slowZoomDefaults } from "../../shared/components/effects";
import { CarouselSlide, slideSchema } from "../../shared/components/carousel";
import { globaltechtourTheme as theme } from "../theme";

/**
 * GTT-CarouselZoomTest — второй вариант видео-слайда: тот же CarouselSlide,
 * но вместо блика (Shimmer) — лёгкое "дыхание" всего кадра (SlowZoom).
 * Сравнение двух эффектов на одной обложке (запрос 21.09.2026).
 *
 * Бренд GlobalTechTour: цвета и шрифты берём только из ../theme (CLAUDE.md, правило 1).
 */
export const gttCarouselZoomTestSchema = z.object({
  slide: slideSchema,
  footer: z.string(),
});

export type GTTCarouselZoomTestProps = z.infer<typeof gttCarouselZoomTestSchema>;

export const gttCarouselZoomTestDefaults: GTTCarouselZoomTestProps = {
  slide: {
    type: "cover",
    kicker: "New Tea & Coffee Retail Expedition · Китай",
    title: "**Chagee**, Luckin Coffee, HeyTea — не в отчётах, а **вживую**",
    subtitle: "26–31 октября · 5 дней, 4 города, 9 компаний нового чайно-кофейного ретейла Китая",
    image: "generated/tea-coffee-retail/cover-v4-crop.png",
  },
  footer: "globaltechtour.ru",
};

export const GTTCarouselZoomTest: React.FC<GTTCarouselZoomTestProps> = ({ slide, footer }) => {
  return (
    <SlowZoom {...slowZoomDefaults} durationInFrames={90} scaleFrom={1} scaleTo={1.05}>
      <CarouselSlide
        theme={theme}
        slide={slide}
        position={{ index: 0, total: 1 }}
        showCounter={false}
        showSwipeHint={false}
        footer={footer}
      />
    </SlowZoom>
  );
};
