import { staticFile } from "remotion";

export const res = (s: string) => (/^https?:\/\//.test(s) ? s : staticFile(s));
export const msToFrame = (ms: number, fps: number) => Math.round((ms / 1000) * fps);
export const isVideo = (s: string) => /\.(mp4|mov|webm|m4v)$/i.test(s);

// Обводка текста через кольцо text-shadow — стабильно рендерится в любом Chrome.
export const textOutline = (px: number, color: string) => {
  const parts: string[] = [];
  for (let a = 0; a < 360; a += 30) {
    const r = (a * Math.PI) / 180;
    parts.push(`${(Math.cos(r) * px).toFixed(1)}px ${(Math.sin(r) * px).toFixed(1)}px 0 ${color}`);
  }
  parts.push("0 6px 18px rgba(0,0,0,0.45)");
  return parts.join(", ");
};
