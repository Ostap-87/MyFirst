export type MediaBroll = {
  type?: "media";
  src: string; // файл в public/ (jpg/png/mp4/mov/webm) или https-ссылка
  fromMs: number;
  toMs: number;
  kenBurns?: boolean;
};

export type Highlight = {
  // координаты в пикселях скриншота, отмасштабированного до ширины 1080
  x: number;
  y: number;
  w: number;
  h: number;
  atMs: number; // от начала этого фрагмента
};

export type ScreenBroll = {
  type: "screen";
  src: string; // длинный скриншот (png/jpg)
  fromMs: number;
  toMs: number;
  scrollToPx?: number; // на сколько px прокрутить скрин за время фрагмента
  highlights?: Highlight[];
};

export type Broll = MediaBroll | ScreenBroll;
