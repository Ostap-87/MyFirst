import { randomUUID } from 'node:crypto';
import { notFound, conflict } from '../lib/errors.js';
import { nowIso, parseJson, toJson, toBool, buildUpdate } from './helpers.js';

const COLUMNS = `id, key, name, status, fonts, colors, image_style, logo_path, notes,
  is_builtin, created_at, updated_at`;

export const PRESET_STATUSES = ['draft', 'ready'];

export function mapPreset(row) {
  if (!row) return null;
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    status: row.status,
    fonts: parseJson(row.fonts, {}),
    colors: parseJson(row.colors, {}),
    imageStyle: row.image_style,
    logoPath: row.logo_path ?? null,
    notes: row.notes,
    isBuiltin: toBool(row.is_builtin),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createBrandPresetsRepo(db) {
  const repo = {
    async list() {
      const rows = await db.all(`SELECT ${COLUMNS} FROM brand_presets ORDER BY name`);
      return rows.map(mapPreset);
    },

    async get(id) {
      return mapPreset(await db.get(`SELECT ${COLUMNS} FROM brand_presets WHERE id = ?`, [id]));
    },

    async getByKey(key) {
      return mapPreset(await db.get(`SELECT ${COLUMNS} FROM brand_presets WHERE key = ?`, [key]));
    },

    async getOrFail(id) {
      const preset = await repo.get(id);
      if (!preset) throw notFound(`Брендовый пресет ${id} не найден`);
      return preset;
    },

    async create(input) {
      if (await repo.getByKey(input.key)) {
        throw conflict(`Пресет с ключом "${input.key}" уже существует`);
      }
      const id = randomUUID();
      const ts = nowIso();
      await db.run(
        `INSERT INTO brand_presets (id, key, name, status, fonts, colors, image_style,
           logo_path, notes, is_builtin, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          id,
          input.key,
          input.name,
          input.status ?? 'draft',
          toJson(input.fonts ?? {}),
          toJson(input.colors ?? {}),
          input.imageStyle ?? '',
          input.logoPath ?? null,
          input.notes ?? '',
          input.isBuiltin ? 1 : 0,
          ts,
          ts,
        ],
      );
      return repo.get(id);
    },

    async update(id, patch) {
      await repo.getOrFail(id);
      const update = buildUpdate('brand_presets', id, {
        name: patch.name,
        status: patch.status,
        fonts: patch.fonts === undefined ? undefined : toJson(patch.fonts),
        colors: patch.colors === undefined ? undefined : toJson(patch.colors),
        image_style: patch.imageStyle,
        logo_path: patch.logoPath,
        notes: patch.notes,
      });
      if (update) await db.run(update.sql, update.params);
      return repo.get(id);
    },

    async remove(id) {
      const preset = await repo.getOrFail(id);
      if (preset.isBuiltin) {
        throw conflict('Встроенный пресет нельзя удалить — его можно только отредактировать');
      }
      await db.run('DELETE FROM brand_presets WHERE id = ?', [id]);
      return true;
    },
  };

  return repo;
}
