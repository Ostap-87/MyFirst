import { Audio, Sequence, staticFile } from "remotion";

/**
 * SoundCue — короткий звук на заданном кадре.
 *
 * Щелчок под появление плашки и свуш под переход — то, что отличает
 * смонтированный ролик от анимации: движение в кадре и звук должны
 * совпадать, иначе монтаж читается как немой.
 *
 * Файлы генерируются командой `npm run make-sfx` (ffmpeg, без лицензий).
 */
export type SoundName = "click" | "pop" | "swoosh" | "notify" | "counter";

export type SoundCueProps = {
  readonly name: SoundName;
  /** Кадр композиции, на котором звук начинается. */
  readonly atFrame: number;
  readonly volume?: number;
};

export const SoundCue: React.FC<SoundCueProps> = ({
  name,
  atFrame,
  volume = 0.7,
}) => (
  <Sequence from={atFrame} durationInFrames={30} layout="none">
    <Audio src={staticFile(`audio/sfx/${name}.wav`)} volume={volume} />
  </Sequence>
);
