export const nowIso = () => new Date().toISOString();

export function parseJson(value, fallback) {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export const toJson = (value) => JSON.stringify(value ?? null);
export const toBool = (value) => value === 1 || value === true;
export const fromBool = (value) => (value ? 1 : 0);

/**
 * Собрать UPDATE только из переданных полей.
 * @returns {{sql: string, params: unknown[]}|null} null, если менять нечего.
 */
export function buildUpdate(table, id, fields, { touchUpdatedAt = true } = {}) {
  const entries = Object.entries(fields).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return null;
  if (touchUpdatedAt) entries.push(['updated_at', nowIso()]);
  const set = entries.map(([column]) => `${column} = ?`).join(', ');
  return { sql: `UPDATE ${table} SET ${set} WHERE id = ?`, params: [...entries.map(([, v]) => v), id] };
}
