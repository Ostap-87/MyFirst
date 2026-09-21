import { randomUUID } from 'node:crypto';
import { notFound, conflict, badRequest } from '../lib/errors.js';
import { SLIDE_ROLES, HOOK_TYPES } from '../lib/slide-schema.js';
import { nowIso, parseJson, toJson, toBool, buildUpdate } from './helpers.js';
import { isPlainObject } from '../lib/validate.js';

const COLUMNS = `id, key, name, content_type, description, structure,
  default_slide_count, is_builtin, created_at, updated_at`;

export function mapTemplate(row) {
  if (!row) return null;
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    contentType: row.content_type,
    description: row.description,
    structure: parseJson(row.structure, []),
    defaultSlideCount: row.default_slide_count,
    isBuiltin: toBool(row.is_builtin),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Слот шаблона = один слайд будущей карусели:
 * { role, hookType, intent, fields } — intent идёт в промпт ИИ (шаг 5),
 * fields перечисляет, какие текстовые поля слайда нужно заполнить.
 */
export function normalizeStructure(raw) {
  if (!Array.isArray(raw)) throw badRequest('structure должен быть массивом слотов');
  if (raw.length === 0) throw badRequest('structure не может быть пустым');
  return raw.map((slot, i) => {
    if (!isPlainObject(slot)) throw badRequest(`Слот #${i + 1} должен быть объектом`);
    if (!SLIDE_ROLES.includes(slot.role)) {
      throw badRequest(`Слот #${i + 1}: role должен быть одним из ${SLIDE_ROLES.join(', ')}`);
    }
    if (slot.hookType !== undefined && slot.hookType !== null && !HOOK_TYPES.includes(slot.hookType)) {
      throw badRequest(`Слот #${i + 1}: hookType должен быть одним из ${HOOK_TYPES.join(', ')}`);
    }
    const fields = Array.isArray(slot.fields) ? slot.fields : ['headline', 'body'];
    return {
      role: slot.role,
      hookType: slot.hookType ?? null,
      intent: typeof slot.intent === 'string' ? slot.intent : '',
      fields: fields.filter((f) => ['kicker', 'headline', 'body', 'cta'].includes(f)),
    };
  });
}

export function createCarouselTemplatesRepo(db) {
  const repo = {
    async list({ contentType } = {}) {
      const rows = contentType
        ? await db.all(`SELECT ${COLUMNS} FROM carousel_templates WHERE content_type = ? ORDER BY name`, [contentType])
        : await db.all(`SELECT ${COLUMNS} FROM carousel_templates ORDER BY name`);
      return rows.map(mapTemplate);
    },

    async get(id) {
      return mapTemplate(await db.get(`SELECT ${COLUMNS} FROM carousel_templates WHERE id = ?`, [id]));
    },

    async getByKey(key) {
      return mapTemplate(await db.get(`SELECT ${COLUMNS} FROM carousel_templates WHERE key = ?`, [key]));
    },

    async getOrFail(id) {
      const template = await repo.get(id);
      if (!template) throw notFound(`Шаблон карусели ${id} не найден`);
      return template;
    },

    async create(input) {
      if (await repo.getByKey(input.key)) {
        throw conflict(`Шаблон с ключом "${input.key}" уже существует`);
      }
      const structure = normalizeStructure(input.structure);
      const id = randomUUID();
      const ts = nowIso();
      await db.run(
        `INSERT INTO carousel_templates (id, key, name, content_type, description, structure,
           default_slide_count, is_builtin, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [
          id,
          input.key,
          input.name,
          input.contentType,
          input.description ?? '',
          toJson(structure),
          input.defaultSlideCount ?? structure.length,
          input.isBuiltin ? 1 : 0,
          ts,
          ts,
        ],
      );
      return repo.get(id);
    },

    async update(id, patch) {
      await repo.getOrFail(id);
      const structure = patch.structure === undefined ? undefined : normalizeStructure(patch.structure);
      const update = buildUpdate('carousel_templates', id, {
        name: patch.name,
        content_type: patch.contentType,
        description: patch.description,
        structure: structure === undefined ? undefined : toJson(structure),
        default_slide_count: patch.defaultSlideCount ?? (structure ? structure.length : undefined),
      });
      if (update) await db.run(update.sql, update.params);
      return repo.get(id);
    },

    async remove(id) {
      const template = await repo.getOrFail(id);
      if (template.isBuiltin) {
        throw conflict('Встроенный шаблон нельзя удалить — склонируй его и правь копию');
      }
      await db.run('DELETE FROM carousel_templates WHERE id = ?', [id]);
      return true;
    },

    /** Клонировать шаблон под свои правки (в т.ч. встроенный). */
    async clone(id, { key, name }) {
      const source = await repo.getOrFail(id);
      return repo.create({
        key,
        name: name ?? `${source.name} (копия)`,
        contentType: source.contentType,
        description: source.description,
        structure: source.structure,
        defaultSlideCount: source.defaultSlideCount,
        isBuiltin: false,
      });
    },
  };

  return repo;
}
