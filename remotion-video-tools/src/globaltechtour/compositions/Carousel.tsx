import {
  CarouselSlide,
  carouselSchema,
  type CarouselProps,
} from "../../shared/components/carousel";
import { globaltechtourTheme as theme } from "../theme";

/**
 * GTT-Carousel — слайд карусели Instagram для бренда.
 *
 * Композиция рендерит ОДИН слайд: какой именно — говорит проп `index`.
 * Так `npm run carousel` проходит по слайдам и сохраняет каждый в PNG,
 * а в Remotion Studio их можно листать, меняя index в правой панели.
 *
 * Вёрстка общая, тема — только своя (CLAUDE.md, правило 1).
 */
export const gttCarouselSchema = carouselSchema;

export const GTTCarousel: React.FC<CarouselProps> = ({
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
