import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { badRequest } from './errors.js';
import { isPlainObject } from './validate.js';

/**
 * JSON-структура слайда (ТЗ, шаг 1: изображение, текст, шрифт, позиция, размер блока).
 *
 * slide.canvas = {
 *   version: 1,
 *   size:       { width, height },              // 1080×1440, формат 3:4
 *   background: { color, image, overlay },      // подложка слайда
 *   layers:     [ textLayer | imageLayer | shapeLayer ]
 * }
 *
 * Слой текста:
 *   { id, type:'text', name, text,
 *     box:  { x, y, width, height },            // позиция и размер блока
 *     font: { family, weight, size, lineHeight, letterSpacing, italic },
 *     color, align, valign, autoFit:{enabled,min,max}, rotation, opacity, zIndex, locked, visible }
 *
 * Слой изображения:
 *   { id, type:'image', name, src, box, fit, rotation, opacity, zIndex, locked, visible }
 *
 * Слой фигуры (плашка под текст):
 *   { id, type:'shape', name, shape, box, fill, radius, rotation, opacity, zIndex, locked, visible }
 *
 * Эта же структура читается Fabric.js в редакторе (шаг 3) и рендерером перед
 * публикацией (шаг 7), поэтому нормализация одна на всех — здесь.
 */

export const SLIDE_ROLES = ['hook', 'proof', 'value', 'cta'];
export const HOOK_TYPES = [
  'comparison',      // сравнение «так» против «вот так»
  'before_after',    // до/после с цифрами
  'myth_reality',    // миф и реальность: «нужно не X, а Y»
  'case_study',      // разбор кейса
  'hot_take',        // сильное мнение
  'personal_story',  // личная история: конфликт → поворот → вывод
];
export const IMAGE_SOURCES = ['none', 'higgsfield', 'pexels', 'unsplash', 'upload'];
export const LAYER_TYPES = ['text', 'image', 'shape'];
export const CANVAS_VERSION = 1;

const ALIGN = ['left', 'center', 'right'];
const VALIGN = ['top', 'middle', 'bottom'];
const FIT = ['cover', 'contain', 'fill'];

const num = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const clamp01 = (value, fallback = 1) => Math.min(1, Math.max(0, num(value, fallback)));

/** Пустой холст слайда: фон бренда + блок заголовка + блок текста. */
export function createDefaultCanvas({ preset = null, size = null } = {}) {
  const width = size?.width ?? config.canvas.width;
  const height = size?.height ?? config.canvas.height;
  const colors = preset?.colors ?? {};
  const fonts = preset?.fonts ?? {};
  const margin = config.canvas.safeZone;

  const headingFont = fonts.heading ?? {};
  const bodyFont = fonts.body ?? {};
  const boxWidth = width - margin.left - margin.right;

  return {
    version: CANVAS_VERSION,
    size: { width, height },
    background: {
      color: colors.background ?? '#111111',
      image: null,
      overlay: { color: colors.background ?? '#000000', opacity: 0 },
    },
    layers: [
      {
        id: randomUUID(),
        type: 'text',
        name: 'headline',
        text: '',
        box: { x: margin.left, y: margin.top, width: boxWidth, height: Math.round(height * 0.3) },
        font: {
          family: headingFont.family ?? 'Inter',
          weight: num(headingFont.weight, 700),
          size: num(headingFont.size, 96),
          lineHeight: num(headingFont.lineHeight, 1.1),
          letterSpacing: num(headingFont.letterSpacing, 0),
          italic: false,
        },
        color: colors.text ?? '#FFFFFF',
        align: 'left',
        valign: 'top',
        autoFit: { enabled: true, min: 36, max: 140 },
        rotation: 0,
        opacity: 1,
        zIndex: 10,
        locked: false,
        visible: true,
      },
      {
        id: randomUUID(),
        type: 'text',
        name: 'body',
        text: '',
        box: {
          x: margin.left,
          y: Math.round(height * 0.5),
          width: boxWidth,
          height: Math.round(height * 0.28),
        },
        font: {
          family: bodyFont.family ?? 'Inter',
          weight: num(bodyFont.weight, 400),
          size: num(bodyFont.size, 48),
          lineHeight: num(bodyFont.lineHeight, 1.35),
          letterSpacing: num(bodyFont.letterSpacing, 0),
          italic: false,
        },
        color: colors.muted ?? colors.text ?? '#E6E6E6',
        align: 'left',
        valign: 'top',
        autoFit: { enabled: true, min: 24, max: 72 },
        rotation: 0,
        opacity: 1,
        zIndex: 11,
        locked: false,
        visible: true,
      },
    ],
  };
}

function normalizeBox(box, size) {
  const b = isPlainObject(box) ? box : {};
  return {
    x: num(b.x, 0),
    y: num(b.y, 0),
    width: Math.max(1, num(b.width, size.width)),
    height: Math.max(1, num(b.height, 100)),
  };
}

function normalizeLayer(raw, size, index) {
  if (!isPlainObject(raw)) throw badRequest(`Слой #${index} должен быть объектом`);
  const type = raw.type;
  if (!LAYER_TYPES.includes(type)) {
    throw badRequest(`Слой #${index}: type должен быть одним из ${LAYER_TYPES.join(', ')}`);
  }

  const base = {
    id: typeof raw.id === 'string' && raw.id ? raw.id : randomUUID(),
    type,
    name: typeof raw.name === 'string' ? raw.name : type,
    box: normalizeBox(raw.box, size),
    rotation: num(raw.rotation, 0),
    opacity: clamp01(raw.opacity, 1),
    zIndex: num(raw.zIndex, index),
    locked: Boolean(raw.locked),
    visible: raw.visible === undefined ? true : Boolean(raw.visible),
  };

  if (type === 'text') {
    const font = isPlainObject(raw.font) ? raw.font : {};
    const autoFit = isPlainObject(raw.autoFit) ? raw.autoFit : {};
    return {
      ...base,
      text: typeof raw.text === 'string' ? raw.text : '',
      font: {
        family: typeof font.family === 'string' && font.family ? font.family : 'Inter',
        weight: num(font.weight, 400),
        size: Math.max(1, num(font.size, 48)),
        lineHeight: num(font.lineHeight, 1.3),
        letterSpacing: num(font.letterSpacing, 0),
        italic: Boolean(font.italic),
      },
      color: typeof raw.color === 'string' ? raw.color : '#FFFFFF',
      align: ALIGN.includes(raw.align) ? raw.align : 'left',
      valign: VALIGN.includes(raw.valign) ? raw.valign : 'top',
      autoFit: {
        enabled: autoFit.enabled === undefined ? true : Boolean(autoFit.enabled),
        min: Math.max(1, num(autoFit.min, 24)),
        max: Math.max(1, num(autoFit.max, 140)),
      },
    };
  }

  if (type === 'image') {
    return {
      ...base,
      src: typeof raw.src === 'string' ? raw.src : '',
      fit: FIT.includes(raw.fit) ? raw.fit : 'cover',
    };
  }

  return {
    ...base,
    shape: raw.shape === 'ellipse' ? 'ellipse' : 'rect',
    fill: typeof raw.fill === 'string' ? raw.fill : '#000000',
    radius: Math.max(0, num(raw.radius, 0)),
  };
}

/** Привести произвольный canvas-JSON к каноническому виду; кидает 400 на мусор. */
export function normalizeCanvas(raw, { size = null, preset = null } = {}) {
  if (raw === undefined || raw === null || (isPlainObject(raw) && Object.keys(raw).length === 0)) {
    return createDefaultCanvas({ size, preset });
  }
  if (!isPlainObject(raw)) throw badRequest('canvas должен быть объектом');

  const resolvedSize = {
    width: num(size?.width ?? raw.size?.width, config.canvas.width),
    height: num(size?.height ?? raw.size?.height, config.canvas.height),
  };

  const bg = isPlainObject(raw.background) ? raw.background : {};
  const overlay = isPlainObject(bg.overlay) ? bg.overlay : {};
  const layers = Array.isArray(raw.layers) ? raw.layers : [];

  return {
    version: CANVAS_VERSION,
    size: resolvedSize,
    background: {
      color: typeof bg.color === 'string' ? bg.color : '#111111',
      image: isPlainObject(bg.image)
        ? {
            src: typeof bg.image.src === 'string' ? bg.image.src : '',
            fit: FIT.includes(bg.image.fit) ? bg.image.fit : 'cover',
            x: num(bg.image.x, 0),
            y: num(bg.image.y, 0),
            scale: num(bg.image.scale, 1),
            opacity: clamp01(bg.image.opacity, 1),
          }
        : null,
      overlay: {
        color: typeof overlay.color === 'string' ? overlay.color : '#000000',
        opacity: clamp01(overlay.opacity, 0),
      },
    },
    layers: layers
      .map((layer, i) => normalizeLayer(layer, resolvedSize, i))
      .sort((a, b) => a.zIndex - b.zIndex),
  };
}

/** Текстовая начинка слайда, отдельно от оформления — её заполняет ИИ (шаг 5). */
export function normalizeTextContent(raw) {
  const src = isPlainObject(raw) ? raw : {};
  const str = (v) => (typeof v === 'string' ? v : '');
  return {
    kicker: str(src.kicker),
    headline: str(src.headline),
    body: str(src.body),
    cta: str(src.cta),
  };
}
