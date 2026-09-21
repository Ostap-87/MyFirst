import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
export const serverRoot = path.resolve(here, '..');
export const projectRoot = path.resolve(serverRoot, '..');

// .env живёт в корне carousel-studio/, чтобы server и web читали одни и те же ключи.
dotenv.config({ path: path.join(projectRoot, '.env'), quiet: true });

const int = (value, fallback) => {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
};

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  host: process.env.HOST ?? '127.0.0.1',
  port: int(process.env.PORT, 3001),
  logLevel: process.env.LOG_LEVEL ?? 'info',

  db: {
    // Единственная точка, через которую выбирается СУБД. Перенос на VPS (Postgres
    // рядом с контент-дашбордом) = новый адаптер с тем же интерфейсом, схема та же.
    driver: process.env.DB_DRIVER ?? 'sqlite',
    file: process.env.DB_FILE ?? path.join(serverRoot, 'data', 'carousel-studio.db'),
  },

  storage: {
    // Локальное хранилище изображений слайдов и экспортов.
    uploadsDir: process.env.UPLOADS_DIR ?? path.join(serverRoot, 'data', 'uploads'),
    // Публичный базовый URL — нужен Meta Graph API, который умеет забирать
    // только картинки, доступные по HTTPS (шаг 7: туннель или временный хостинг).
    publicBaseUrl: process.env.PUBLIC_BASE_URL ?? '',
  },

  canvas: {
    // Формат 3:4 из ТЗ. Меняется только здесь.
    width: int(process.env.CANVAS_WIDTH, 1080),
    height: int(process.env.CANVAS_HEIGHT, 1440),
    // Безопасные зоны (px) для оверлея редактора — шаг 4.
    safeZone: {
      top: int(process.env.SAFE_ZONE_TOP, 120),
      right: int(process.env.SAFE_ZONE_RIGHT, 80),
      bottom: int(process.env.SAFE_ZONE_BOTTOM, 220),
      left: int(process.env.SAFE_ZONE_LEFT, 80),
    },
  },

  slides: {
    min: int(process.env.SLIDES_MIN, 5),
    max: int(process.env.SLIDES_MAX, 10),
  },

  // Ключи внешних API. Пустая строка = интеграция выключена, роут вернёт 503
  // с понятным сообщением вместо падения.
  keys: {
    anthropic: process.env.ANTHROPIC_API_KEY ?? '',
    anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5',
    pexels: process.env.PEXELS_API_KEY ?? '',
    unsplash: process.env.UNSPLASH_ACCESS_KEY ?? '',
    higgsfield: process.env.HIGGSFIELD_API_KEY ?? '',
    higgsfieldBaseUrl: process.env.HIGGSFIELD_BASE_URL ?? '',
    googleFonts: process.env.GOOGLE_FONTS_API_KEY ?? '',
    metaAppId: process.env.META_APP_ID ?? '',
    metaAppSecret: process.env.META_APP_SECRET ?? '',
    metaRedirectUri: process.env.META_REDIRECT_URI ?? '',
  },
};

export default config;
