import type { Caption } from "@remotion/captions";
import { useCallback, useEffect, useState } from "react";
import {
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
} from "remotion";

/**
 * Загружает субтитры из файла в public во время рендера.
 *
 * Почему не обычный import JSON: тогда каждый новый ролик требовал бы правки
 * кода и пересборки. С загрузкой по пути набор субтитров передаётся в
 * inputProps, и одна композиция обслуживает любое количество выпусков.
 *
 * delayRender держит кадр, пока файл не прочитан, иначе первые кадры уйдут
 * в рендер без текста.
 */
export const useCaptions = (src: string | null): Caption[] => {
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [handle] = useState(() =>
    delayRender(`Загрузка субтитров: ${src ?? "нет"}`),
  );

  const load = useCallback(async () => {
    if (!src) {
      continueRender(handle);
      return;
    }

    try {
      const response = await fetch(staticFile(src));
      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }
      setCaptions((await response.json()) as Caption[]);
      continueRender(handle);
    } catch (err) {
      cancelRender(
        new Error(`Не удалось загрузить субтитры «${src}»: ${String(err)}`),
      );
    }
  }, [handle, src]);

  useEffect(() => {
    load();
  }, [load]);

  return captions;
};
