import { randomUUID } from 'node:crypto';
import { config } from '../config.js';
import { notFound, badRequest } from '../lib/errors.js';
import { nowIso, parseJson, toJson, buildUpdate } from './helpers.js';

const COLUMNS = `id, name, brief, language, status, brand_preset_id, template_id,
  canvas_width, canvas_height, settings, caption, hashtags, created_at, updated_at`;

export const PROJECT_STATUSES = ['draft', 'generating', 'ready', 'publishing', 'published', 'failed'];
export const LANGUAGES = ['ru', 'en'];

export function mapProject(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    brief: row.brief,
    language: row.language,
    status: row.status,
    brandPresetId: row.brand_preset_id ?? null,
    templateId: row.template_id ?? null,
    canvas: { width: row.canvas_width, height: row.canvas_height },
    settings: parseJson(row.settings, {}),
    caption: row.caption,
    hashtags: parseJson(row.hashtags, []),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createProjectsRepo(db) {
  async function assertExists(table, id, label) {
    if (!id) return;
    const row = await db.get(`SELECT id FROM ${table} WHERE id = ?`, [id]);
    if (!row) throw badRequest(`${label} ${id} не найден`);
  }

  const repo = {
    async list({ limit = 50, offset = 0, status } = {}) {
      const where = status ? 'WHERE status = ?' : '';
      const params = status ? [status, limit, offset] : [limit, offset];
      const rows = await db.all(
        `SELECT ${COLUMNS} FROM projects ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
        params,
      );
      return rows.map(mapProject);
    },

    async get(id) {
      return mapProject(await db.get(`SELECT ${COLUMNS} FROM projects WHERE id = ?`, [id]));
    },

    async getOrFail(id) {
      const project = await repo.get(id);
      if (!project) throw notFound(`Проект ${id} не найден`);
      return project;
    },

    async create(input) {
      await assertExists('brand_presets', input.brandPresetId, 'Брендовый пресет');
      await assertExists('carousel_templates', input.templateId, 'Шаблон карусели');

      const id = randomUUID();
      const ts = nowIso();
      await db.run(
        `INSERT INTO projects (id, name, brief, language, status, brand_preset_id, template_id,
           canvas_width, canvas_height, settings, caption, hashtags, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          id,
          input.name,
          input.brief ?? '',
          input.language ?? 'ru',
          'draft',
          input.brandPresetId ?? null,
          input.templateId ?? null,
          input.canvas?.width ?? config.canvas.width,
          input.canvas?.height ?? config.canvas.height,
          toJson(input.settings ?? {}),
          input.caption ?? '',
          toJson(input.hashtags ?? []),
          ts,
          ts,
        ],
      );
      return repo.get(id);
    },

    async update(id, patch) {
      await repo.getOrFail(id);
      await assertExists('brand_presets', patch.brandPresetId, 'Брендовый пресет');
      await assertExists('carousel_templates', patch.templateId, 'Шаблон карусели');

      const update = buildUpdate('projects', id, {
        name: patch.name,
        brief: patch.brief,
        language: patch.language,
        status: patch.status,
        brand_preset_id: patch.brandPresetId,
        template_id: patch.templateId,
        canvas_width: patch.canvas?.width,
        canvas_height: patch.canvas?.height,
        settings: patch.settings === undefined ? undefined : toJson(patch.settings),
        caption: patch.caption,
        hashtags: patch.hashtags === undefined ? undefined : toJson(patch.hashtags),
      });
      if (update) await db.run(update.sql, update.params);
      return repo.get(id);
    },

    async remove(id) {
      await repo.getOrFail(id);
      // slides удаляются каскадом (FK ON DELETE CASCADE, PRAGMA foreign_keys = ON)
      await db.run('DELETE FROM projects WHERE id = ?', [id]);
      return true;
    },
  };

  return repo;
}
