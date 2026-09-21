import {
  PostReelLayout,
  postReelSchema,
  type PostReelProps,
} from "../../shared/components/PostReelLayout";
import { auraRoboticsTheme as theme } from "../theme";

/**
 * Aura-PostReel — вертикальный ролик по посту Aura Robotics.
 *
 * Вёрстка общая (shared/components/PostReelLayout), тема — только своя
 * (CLAUDE.md, правило 1). Пропсы приходят из data/posts.json при пакетном
 * рендере: `npm run render-batch -- --brand aura`.
 */
export const auraPostReelSchema = postReelSchema;

export const auraPostReelDefaults: PostReelProps = {
  company: "Borunte Robot",
  date: "2026-08-16",
  title: "Borunte: шестиосевые роботы, которые обслуживают термопластавтоматы",
  lead: "Borunte Robot / 伯朗特 работает с 2008 года в Дунгуане и с 2014-го торгуется на New Third Board.",
  cta: "aura-robotics.ru — выбрать робота под вашу задачу",
  image: "tg-images/aura/2026-08-16-borunte-industrial-arms.png",
  platform: "telegram",
};

export const AuraPostReel: React.FC<PostReelProps> = (props) => (
  <PostReelLayout {...props} theme={theme} />
);
