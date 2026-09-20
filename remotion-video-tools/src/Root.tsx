import "./index.css";
import { Composition } from "remotion";
import {
  EffectsLab,
  effectsLabDefaults,
  effectsLabSchema,
} from "./shared/EffectsLab";

// Реестр всех композиций проекта.
//
// Имя композиции = <префикс бренда>-<название>:
//   GTT-*       — GlobalTechTour   (src/globaltechtour)
//   Aura-*      — Aura Robotics    (src/aura-robotics)
//   Personal-*  — ostapdotcenko    (src/ostapdotcenko)
//   Shared-*    — нейтральные сцены для проверки эффектов (src/shared)
//
// Блоки между маркерами new-composition:* дописывает скрипт
// `npm run new-composition` — руками туда лезть не нужно, но можно.

// new-composition:imports:start
import {
  GTTIntro,
  gttIntroDefaults,
  gttIntroSchema,
} from "./globaltechtour/compositions/Intro";
import {
  AuraIntro,
  auraIntroDefaults,
  auraIntroSchema,
} from "./aura-robotics/compositions/Intro";
import {
  PersonalIntro,
  personalIntroDefaults,
  personalIntroSchema,
} from "./ostapdotcenko/compositions/Intro";
// new-composition:imports:end

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* new-composition:start */}
      <Composition
        id="GTT-Intro"
        component={GTTIntro}
        schema={gttIntroSchema}
        defaultProps={gttIntroDefaults}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Aura-Intro"
        component={AuraIntro}
        schema={auraIntroSchema}
        defaultProps={auraIntroDefaults}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Personal-Intro"
        component={PersonalIntro}
        schema={personalIntroSchema}
        defaultProps={personalIntroDefaults}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1920}
      />
            {/* new-composition:end */}

      {/* Витрина эффектов на нейтральных данных: сюда смотрим, когда
          проверяем новый эффект из src/shared/components/effects. */}
      <Composition
        id="Shared-EffectsLab"
        component={EffectsLab}
        schema={effectsLabSchema}
        defaultProps={effectsLabDefaults}
        durationInFrames={240}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
