import {
  PostReelLayout,
  postReelSchema,
  type PostReelProps,
} from "../../shared/components/PostReelLayout";
import { globaltechtourTheme as theme } from "../theme";

/**
 * GTT-PostReel — вертикальный ролик по посту GlobalTechTour.
 *
 * Вёрстка общая (shared/components/PostReelLayout), тема — только своя
 * (CLAUDE.md, правило 1). Пропсы приходят из data/posts.json при пакетном
 * рендере: `npm run render-batch -- --brand gtt`.
 */
export const gttPostReelSchema = postReelSchema;

export const gttPostReelDefaults: PostReelProps = {
  company: "NIO",
  date: "2026-08-16",
  title: "NIO: батарея по подписке, а не в собственности",
  lead: "NIO / 蔚来 меняет саму идею владения электромобилем: машину можно купить без батареи и подключить аккумулятор по подписке.",
  cta: "globaltechtour.ru — программы туров",
  image: "tg-images/globaltechtour/2026-08-16-nio-battery-swap.png",
  platform: "telegram",
};

export const GTTPostReel: React.FC<PostReelProps> = (props) => (
  <PostReelLayout {...props} theme={theme} />
);
