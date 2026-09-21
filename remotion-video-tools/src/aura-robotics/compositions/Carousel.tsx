import {
  CarouselSlide,
  carouselSchema,
  type CarouselProps,
} from "../../shared/components/carousel";
import { auraRoboticsTheme as theme } from "../theme";

/**
 * Aura-Carousel — слайд карусели Instagram для бренда.
 *
 * Композиция рендерит ОДИН слайд: какой именно — говорит проп `index`.
 * Так `npm run carousel` проходит по слайдам и сохраняет каждый в PNG,
 * а в Remotion Studio их можно листать, меняя index в правой панели.
 *
 * Вёрстка общая, тема — только своя (CLAUDE.md, правило 1).
 */
export const auraCarouselSchema = carouselSchema;

export const AuraCarousel: React.FC<CarouselProps> = ({
  slides,
  index,
  showCounter,
  showSwipeHint,
  footer,
}) => {
  // Индекс приходит из скрипта и из правой панели Studio — подстраховываемся
  // от выхода за пределы массива, иначе рендер падает на пустом слайде.
  const safeIndex = Math.min(Math.max(index, 0), slides.length - 1);

  return (
    <CarouselSlide
      theme={theme}
      slide={slides[safeIndex]}
      position={{ index: safeIndex, total: slides.length }}
      showCounter={showCounter}
      showSwipeHint={showSwipeHint}
      footer={footer}
    />
  );
};
