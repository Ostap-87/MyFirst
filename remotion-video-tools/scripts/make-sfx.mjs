#!/usr/bin/env node
// Генерирует набор коротких UI-звуков в public/audio/sfx.
//
//   npm run make-sfx
//
// Звуки синтезируются ffmpeg прямо здесь, а не скачиваются из библиотек:
// на сгенерированные файлы не нужно ни лицензии, ни атрибуции, и они
// воспроизводимы — пересоздал командой и получил ровно те же файлы.
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, fail } from "./lib.mjs";

try {
  execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
} catch {
  fail(
    "Не найден ffmpeg.\n    macOS: brew install ffmpeg    Ubuntu: sudo apt install ffmpeg",
  );
}

const outDir = resolve(ROOT, "public/audio/sfx");
mkdirSync(outDir, { recursive: true });

/**
 * Каждый звук — короткий: на монтаже он подчёркивает движение, а не звучит
 * сам по себе. Всё, что длиннее ~0.4 с, начинает спорить с речью.
 */
const SOUNDS = [
  {
    name: "click",
    what: "сухой щелчок — смена кадра, появление плашки",
    args: [
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=1800:duration=0.05",
      "-af",
      "afade=t=out:st=0.01:d=0.04,volume=0.5",
    ],
  },
  {
    name: "pop",
    what: "мягкий «пок» — появление пузыря или карточки",
    args: [
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=520:duration=0.12",
      "-af",
      "asetrate=44100*1.4,atempo=0.9,afade=t=out:st=0.02:d=0.1,volume=0.45",
    ],
  },
  {
    name: "swoosh",
    what: "воздушный свуш — переход между сценами",
    args: [
      "-f",
      "lavfi",
      "-i",
      "anoisesrc=d=0.35:c=pink:a=0.6",
      "-af",
      "highpass=f=700,lowpass=f=6000,afade=t=in:st=0:d=0.12,afade=t=out:st=0.14:d=0.2,volume=0.4",
    ],
  },
  {
    name: "notify",
    what: "два тона — входящее сообщение",
    args: [
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=880:duration=0.09",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=1320:duration=0.12",
      "-filter_complex",
      "[0:a]adelay=0|0[a];[1:a]adelay=90|90[b];[a][b]amix=inputs=2,afade=t=out:st=0.14:d=0.08,volume=0.45",
    ],
  },
  {
    name: "counter",
    what: "тик — под отсчёт цифр CountUp",
    args: [
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=2400:duration=0.03",
      "-af",
      "afade=t=out:st=0.005:d=0.025,volume=0.3",
    ],
  },
];

for (const sound of SOUNDS) {
  const file = resolve(outDir, `${sound.name}.wav`);
  execFileSync(
    "ffmpeg",
    ["-y", ...sound.args, "-ar", "44100", "-ac", "2", file],
    {
      stdio: "ignore",
    },
  );
  console.log(`  ✔ ${sound.name}.wav — ${sound.what}`);
}

console.log(`
  Готово: ${SOUNDS.length} звука в public/audio/sfx

  Как поставить в композиции:

    import { SoundCue } from "../../shared/components/SoundCue";
    <SoundCue name="pop" atFrame={24} volume={0.6} />
`);
