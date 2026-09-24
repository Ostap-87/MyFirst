import React from "react";

// Нижняя половина сплит-скрина. Верхний край растворяется в градиент —
// поэтому нет жёсткой линии между спикером и B-roll (приём с фото 1 и 4).
export const FeatheredBottom: React.FC<{
  seam: number;
  featherPx: number;
  children: React.ReactNode;
}> = ({ seam, featherPx, children }) => {
  const mask = `linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,1) ${featherPx}px)`;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: seam - featherPx / 2,
        bottom: 0,
        overflow: "hidden",
        WebkitMaskImage: mask,
        maskImage: mask,
      }}
    >
      {children}
    </div>
  );
};
