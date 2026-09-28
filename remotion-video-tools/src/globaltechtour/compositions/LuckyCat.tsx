import { z } from "zod";
import { MascotRig, mascotRigSchema } from "../../shared/components/effects";

/**
 * GTT-LuckyCat — фигурка манэки-нэко (стикер владельца): манит лапкой
 * вниз-вверх и моргает, на груди — 錢 («деньги»). Лапка движется плавной
 * деформацией всей картинки (`scripts/cat-warp.py` из
 * `public/local/cat/open.png`), поэтому ни один штрих не рвётся.
 *
 * Квадрат 1080, 5 с, зациклен: цикл кадров — 75 (два взмаха по 1,25 с),
 * в 150 кадрах укладывается дважды.
 */
export const gttLuckyCatSchema = mascotRigSchema.partial();

export type GTTLuckyCatProps = z.infer<typeof gttLuckyCatSchema>;

export const gttLuckyCatDefaults: GTTLuckyCatProps = {
  framesDir: "local/cat/warp",
  frameCount: 75,
  frameDigits: 2,
  eyesHalf: "local/cat/eyes-half.svg",
  eyesClosed: "local/cat/eyes-closed.svg",
  imageWidth: 1254,
  imageHeight: 1254,
  wavePeriodSeconds: 1.25,
  breathe: 0.006,
  markText: "錢",
  markX: 0.5,
  markY: 0.685,
  markSize: 0.135,
  markColor: "#e61e24",
  blinkEverySeconds: 2.5,
  blinkFrames: 3,
  background: "#ffffff",
};

export const GTTLuckyCat: React.FC<GTTLuckyCatProps> = (props) => <MascotRig {...props} />;
