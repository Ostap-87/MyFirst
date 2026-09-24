import { useEffect, useState } from "react";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import type { Caption } from "@remotion/captions";

// Загружает captions.json из public/ (его делает scripts/transcribe.mjs).
export const useCaptionsFile = (file?: string, inline?: Caption[]): Caption[] => {
  const [data, setData] = useState<Caption[] | null>(inline ?? null);
  const [handle] = useState(() => (file && !inline ? delayRender(`captions:${file}`) : null));

  useEffect(() => {
    if (!file || handle === null) return;
    fetch(staticFile(file))
      .then((r) => r.json())
      .then((json: Caption[]) => {
        setData(json);
        continueRender(handle);
      })
      .catch((e) => cancelRender(e));
  }, [file, handle]);

  return data ?? [];
};
