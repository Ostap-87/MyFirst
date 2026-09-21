import { randomUUID } from 'node:crypto';
import { notFound, badRequest } from '../lib/errors.js';
import { normalizeCanvas, normalizeTextContent } from '../lib/slide-schema.js';
import { nowIso, parseJson, toJson, toBool, fromBool, buildUpdate } from './helpers.js';

const COLUMNS = `id, project_id, position, role, hook_type, text_content, canvas,
  image_source, image_url, image_path, image_meta, generation, export_path, locked,
  created_at, updated_at`;

export function mapSlide(row) {
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id,
    position: row.position,
    role: row.role,
    hookType: row.hook_type ?? null,
    text: parseJson(row.text_content, {}),
    canvas: parseJson(row.canvas, {}),
    image: {
      source: row.image_source,
      url: row.image_url ?? null,
      path: row.image_path ?? null,
      meta: parseJson(row.image_meta, {}),
    },
    generation: parseJson(row.generation, {}),
    exportPath: row.export_path ?? null,
    locked: toBool(row.locked),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function createSlidesRepo(db) {
  const repo = {
    async listByProject(projectId) {
      const rows = await db.all(
        `SELECT ${COLUMNS} FROM slides WHERE project_id = ? ORDER BY position`,
        [projectId],
      );
      return rows.map(mapSlide);
    },

    async get(id) {
      return mapSlide(await db.get(`SELECT ${COLUMNS} FROM slides WHERE id = ?`, [id]));
    },

    async getOrFail(id) {
      const slide = await repo.get(id);
      if (!slide) throw notFound(`Слайд ${id} не найден`);
      return slide;
    },

    async count(projectId) {
      const row = await db.get('SELECT COUNT(*) AS n FROM slides WHERE project_id = ?', [projectId]);
      return row?.n ?? 0;
    },

    /** Вставить слайд. position = null → в конец; иначе сдвигаем хвост вправо. */
    async create(projectId, input = {}, { size = null } = {}) {
      return db.transaction(async () => {
        const total = await repo.count(projectId);
        const target =
          input.position === undefined || input.position === null
            ? total + 1
            : Math.min(Math.max(1, input.position), total + 1);

        if (target <= total) await shift(projectId, target, +1);

        const id = randomUUID();
        const ts = nowIso();
        await db.run(
          `INSERT INTO slides (id, project_id, position, role, hook_type, text_content, canvas,
             image_source, image_url, image_path, image_meta, generation, export_path, locked,
             created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            id,
            projectId,
            target,
            input.role ?? 'value',
            input.hookType ?? null,
            toJson(normalizeTextContent(input.text)),
            toJson(normalizeCanvas(input.canvas, { size })),
            input.image?.source ?? 'none',
            input.image?.url ?? null,
            input.image?.path ?? null,
            toJson(input.image?.meta ?? {}),
            toJson(input.generation ?? {}),
            null,
            fromBool(input.locked),
            ts,
            ts,
          ],
        );
        return repo.get(id);
      });
    },

    async update(id, patch, { size = null } = {}) {
      const current = await repo.getOrFail(id);
      const fields = {
        role: patch.role,
        hook_type: patch.hookType,
        text_content: patch.text === undefined ? undefined : toJson(normalizeTextContent(patch.text)),
        canvas:
          patch.canvas === undefined
            ? undefined
            : toJson(normalizeCanvas(patch.canvas, { size: size ?? current.canvas?.size })),
        image_source: patch.image?.source,
        image_url: patch.image?.url,
        image_path: patch.image?.path,
        image_meta: patch.image?.meta === undefined ? undefined : toJson(patch.image.meta),
        generation: patch.generation === undefined ? undefined : toJson(patch.generation),
        export_path: patch.exportPath,
        locked: patch.locked === undefined ? undefined : fromBool(patch.locked),
      };
      const update = buildUpdate('slides', id, fields);
      if (update) await db.run(update.sql, update.params);
      return repo.get(id);
    },

    async remove(id) {
      const slide = await repo.getOrFail(id);
      return db.transaction(async () => {
        await db.run('DELETE FROM slides WHERE id = ?', [id]);
        await shift(slide.projectId, slide.position + 1, -1);
        return true;
      });
    },

    /** Переставить слайды: orderedIds — полный список id проекта в нужном порядке. */
    async reorder(projectId, orderedIds) {
      const existing = await repo.listByProject(projectId);
      const known = new Set(existing.map((s) => s.id));
      if (orderedIds.length !== existing.length || orderedIds.some((id) => !known.has(id))) {
        throw badRequest('order должен содержать все id слайдов проекта ровно по одному разу');
      }
      return db.transaction(async () => {
        // UNIQUE(project_id, position): сначала уводим в отрицательные позиции.
        for (const [i, id] of orderedIds.entries()) {
          await db.run('UPDATE slides SET position = ? WHERE id = ?', [-(i + 1), id]);
        }
        const ts = nowIso();
        for (const [i, id] of orderedIds.entries()) {
          await db.run('UPDATE slides SET position = ?, updated_at = ? WHERE id = ?', [i + 1, ts, id]);
        }
        return repo.listByProject(projectId);
      });
    },

    async removeByProject(projectId, { keepLocked = false } = {}) {
      const sql = keepLocked
        ? 'DELETE FROM slides WHERE project_id = ? AND locked = 0'
        : 'DELETE FROM slides WHERE project_id = ?';
      await db.run(sql, [projectId]);
    },
  };

  async function shift(projectId, fromPosition, delta) {
    // Сдвигаем по одному в направлении, которое не ломает UNIQUE(project_id, position).
    const rows = await db.all(
      `SELECT id, position FROM slides WHERE project_id = ? AND position >= ? ORDER BY position ${
        delta > 0 ? 'DESC' : 'ASC'
      }`,
      [projectId, fromPosition],
    );
    for (const row of rows) {
      await db.run('UPDATE slides SET position = ? WHERE id = ?', [row.position + delta, row.id]);
    }
  }

  return repo;
}
