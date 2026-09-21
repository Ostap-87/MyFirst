-- 001_init — базовая схема AI Carousel Studio.
-- SQL намеренно переносимый: TEXT/INTEGER, без sqlite-специфики,
-- JSON хранится в TEXT-колонках (в Postgres те же колонки станут jsonb).

CREATE TABLE IF NOT EXISTS brand_presets (
  id          TEXT PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE,          -- gtt | aura_robotics | ostapdotcenko
  name        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft', -- draft (значения ещё не заданы) | ready
  fonts       TEXT NOT NULL DEFAULT '{}',    -- JSON: { heading: {family,weight,size}, body: {...} }
  colors      TEXT NOT NULL DEFAULT '{}',    -- JSON: { background, surface, text, muted, accent }
  image_style TEXT NOT NULL DEFAULT '',      -- словесное описание стиля визуала для генерации
  logo_path   TEXT,
  notes       TEXT NOT NULL DEFAULT '',
  is_builtin  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS carousel_templates (
  id                  TEXT PRIMARY KEY,
  key                 TEXT NOT NULL UNIQUE,  -- product_showcase | before_after | top5_facts | case_study | myths_vs_reality
  name                TEXT NOT NULL,
  content_type        TEXT NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  structure           TEXT NOT NULL DEFAULT '[]', -- JSON: массив слотов слайдов (role, hook_type, intent)
  default_slide_count INTEGER NOT NULL DEFAULT 7,
  is_builtin          INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  brief           TEXT NOT NULL DEFAULT '',   -- бриф о продукте/услуге
  language        TEXT NOT NULL DEFAULT 'ru', -- ru | en
  status          TEXT NOT NULL DEFAULT 'draft', -- draft | generating | ready | publishing | published | failed
  brand_preset_id TEXT REFERENCES brand_presets(id) ON DELETE SET NULL,
  template_id     TEXT REFERENCES carousel_templates(id) ON DELETE SET NULL,
  canvas_width    INTEGER NOT NULL DEFAULT 1080,
  canvas_height   INTEGER NOT NULL DEFAULT 1440,
  settings        TEXT NOT NULL DEFAULT '{}', -- JSON: { audience, tone, cta, slide_count, goal }
  caption         TEXT NOT NULL DEFAULT '',   -- подпись к посту (бэклог: генератор caption)
  hashtags        TEXT NOT NULL DEFAULT '[]', -- JSON-массив строк
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS slides (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  position     INTEGER NOT NULL,              -- 1..N, порядок в карусели
  role         TEXT NOT NULL DEFAULT 'value', -- hook | proof | value | cta
  hook_type    TEXT,                          -- comparison | before_after | myth_reality | case_study | hot_take | personal_story
  text_content TEXT NOT NULL DEFAULT '{}',    -- JSON: { headline, body, kicker, cta }
  canvas       TEXT NOT NULL DEFAULT '{}',    -- JSON состояния Fabric.js: слои, шрифт, позиция, размер блока
  image_source TEXT NOT NULL DEFAULT 'none',  -- none | higgsfield | pexels | unsplash | upload
  image_url    TEXT,                          -- исходный URL у внешнего источника
  image_path   TEXT,                          -- локально сохранённый файл в data/uploads
  image_meta   TEXT NOT NULL DEFAULT '{}',    -- JSON: автор, лицензия, prompt, id у источника
  generation   TEXT NOT NULL DEFAULT '{}',    -- JSON: модель, время, промпт последней ИИ-генерации
  export_path  TEXT,                          -- отрендеренный PNG слайда для публикации
  locked       INTEGER NOT NULL DEFAULT 0,    -- защита слайда от массовой регенерации
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  UNIQUE (project_id, position)
);

CREATE INDEX IF NOT EXISTS idx_slides_project ON slides (project_id, position);
CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects (updated_at);
CREATE INDEX IF NOT EXISTS idx_projects_preset ON projects (brand_preset_id);
