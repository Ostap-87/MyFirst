import { z } from "zod";
import { MascotRig, mascotRigSchema } from "../../shared/components/effects";

/**
 * GTT-LuckyCat — фигурка манэки-нэко (стикер владельца): манит лапкой
 * вниз-вверх и моргает, на груди — 錢 («деньги»). Слои нарезаны из
 * `public/local/cat/open.png`, закрытые глаза — заплатки по мотивам второй
 * фигурки, предплечье рисует сам эффект.
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
  shoulder: "local/cat/shoulder.png",
  imageWidth: 1254,
  imageHeight: 1254,
  slideDx: 6,
  slideDy: 70,
  wavePeriodSeconds: 1.25,
  tiltDeg: 9,
  pivotX: 896,
  pivotY: 690,
  // Концы предплечья — под чёрными штрихами: плечо на внутреннем крае
  // штриха головы и воротника, ладошка — на середине её верхнего штриха.
  limbA1: { x: 895, y: 606 },
  limbA2: { x: 858, y: 638 },
  limbB1: { x: 946, y: 667 },
  limbB2: { x: 898, y: 692 },
  limbStroke: 22,
  limbOuter: 24,
  limbColor: "#e61e24",
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
