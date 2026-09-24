import type { Caption } from "@remotion/captions";

// Демо-субтитры, чтобы превью работало без транскрипции.
const words =
  "как только появился этот вид спорта китайцы буквально с ума сходят и пока селлеры крутили трафик блогеры забрали продажи".split(
    " "
  );

export const sampleCaptions: Caption[] = words.map((w, i) => ({
  text: (i === 0 ? "" : " ") + w,
  startMs: 300 + i * 380,
  endMs: 300 + (i + 1) * 380,
  timestampMs: 300 + i * 380 + 190,
  confidence: 1,
}));
