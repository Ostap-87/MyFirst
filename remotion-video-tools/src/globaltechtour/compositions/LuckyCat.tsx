import { z } from "zod";
import { MascotRig, mascotRigSchema } from "../../shared/components/effects";

/**
 * GTT-LuckyCat — фигурка манэки-нэко (стикер владельца): машет лапкой и
 * моргает. Слои нарезаны из `public/local/cat/open.png`, закрытые глаза —
 * заплатки по мотивам второй фигурки.
 *
 * Квадрат 1080, 5 с, зациклен: период взмаха 1,25 с укладывается 4 раза.
 */
export const gttLuckyCatSchema = mascotRigSchema.partial();

export type GTTLuckyCatProps = z.infer<typeof gttLuckyCatSchema>;

export const gttLuckyCatDefaults: GTTLuckyCatProps = {
  body: "local/cat/body.png",
  paw: "local/cat/paw.png",
  eyesHalf: "local/cat/eyes-half.png",
  eyesClosed: "local/cat/eyes-closed.png",
  imageWidth: 1254,
  imageHeight: 1254,
  pivotX: 862,
  pivotY: 608,
  swingDeg: 16,
  wavePeriodSeconds: 1.25,
  blinkEverySeconds: 2.5,
  blinkFrames: 3,
  background: "#ffffff",
};

export const GTTLuckyCat: React.FC<GTTLuckyCatProps> = (props) => <MascotRig {...props} />;
