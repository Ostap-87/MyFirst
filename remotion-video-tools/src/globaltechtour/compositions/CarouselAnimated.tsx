import { z } from "zod";
import { Shimmer, shimmerDefaults } from "../../shared/components/effects";
import { CarouselSlide, slideSchema } from "../../shared/components/carousel";
import { globaltechtourTheme as theme } from "../theme";

/**
 * GTT-CarouselAnimated — тест видео-слайда карусели: обычный CarouselSlide,
 * поверх которого бегает диагональный блик (Shimmer), зациклено. Проверка
 * идеи "карусель со слайдами-видео вместо статичных PNG" (запрос 21.09.2026).
 *
 * Бренд GlobalTechTour: цвета и шрифты берём только из ../theme (CLAUDE.md, правило 1).
 */
export const gttCarouselAnimatedSchema = z.object({
  slide: slideSchema,
  footer: z.string(),
});

export type GTTCarouselAnimatedProps = z.infer<typeof gttCarouselAnimatedSchema>;

export const gttCarouselAnimatedDefaults: GTTCarouselAnimatedProps = {
  slide: {
    type: "cover",
    kicker: "New Tea & Coffee Retail Expedition · Китай",
    title: "**Chagee**, Luckin Coffee, HeyTea — не в отчётах, а **вживую**",
    subtitle: "26–31 октября · 5 дней, 4 города, 9 компаний нового чайно-кофейного ретейла Китая",
    image: "generated/tea-coffee-retail/cover-v4-crop.png",
  },
  footer: "globaltechtour.ru",
};

export const GTTCarouselAnimated: React.FC<GTTCarouselAnimatedProps> = ({ slide, footer }) => {
  return (
    <Shimmer {...shimmerDefaults} durationInFrames={75} angleDeg={100} intensity={0.8}>
      <CarouselSlide
        theme={theme}
        slide={slide}
        position={{ index: 0, total: 1 }}
        showCounter={false}
        showSwipeHint={false}
        footer={footer}
      />
    </Shimmer>
  );
};
