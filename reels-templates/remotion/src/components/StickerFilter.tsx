import React from "react";

// SVG-фильтр «наклейка»: берёт альфу вырезанного спикера, делает её жёсткой,
// раздувает на N px и заливает белым — получается обводка как у стикера (фото 2).
export const StickerFilter: React.FC<{ id: string; outlinePx: number; color?: string }> = ({
  id,
  outlinePx,
  color = "#FFFFFF",
}) => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <defs>
      <filter id={id} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
        <feComponentTransfer in="SourceAlpha" result="hard">
          <feFuncA type="discrete" tableValues="0 1" />
        </feComponentTransfer>
        <feMorphology in="hard" operator="dilate" radius={outlinePx} result="dilated" />
        <feFlood floodColor={color} result="flood" />
        <feComposite in="flood" in2="dilated" operator="in" result="outline" />
        <feMerge>
          <feMergeNode in="outline" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  </svg>
);
