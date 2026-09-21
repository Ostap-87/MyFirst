import { badRequest } from './errors.js';

export const isPlainObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);

export function requireObject(value, field) {
  if (!isPlainObject(value)) throw badRequest(`Поле "${field}" должно быть объектом`);
  return value;
}

export function requireString(value, field, { min = 1, max = 20000 } = {}) {
  if (typeof value !== 'string') throw badRequest(`Поле "${field}" должно быть строкой`);
  const trimmed = value.trim();
  if (trimmed.length < min) throw badRequest(`Поле "${field}" не может быть пустым`);
  if (trimmed.length > max) throw badRequest(`Поле "${field}" длиннее ${max} символов`);
  return trimmed;
}

export function optionalString(value, field, opts = {}) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') throw badRequest(`Поле "${field}" должно быть строкой`);
  return requireString(value, field, { min: 0, ...opts });
}

export function requireEnum(value, field, allowed) {
  if (!allowed.includes(value)) {
    throw badRequest(`Поле "${field}" должно быть одним из: ${allowed.join(', ')}`);
  }
  return value;
}

export function optionalEnum(value, field, allowed) {
  if (value === undefined || value === null) return undefined;
  return requireEnum(value, field, allowed);
}

export function optionalInt(value, field, { min = -Infinity, max = Infinity } = {}) {
  if (value === undefined || value === null) return undefined;
  const n = typeof value === 'number' ? value : Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) throw badRequest(`Поле "${field}" должно быть числом`);
  if (n < min || n > max) throw badRequest(`Поле "${field}" должно быть в диапазоне ${min}..${max}`);
  return Math.trunc(n);
}

export function optionalStringArray(value, field) {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    throw badRequest(`Поле "${field}" должно быть массивом строк`);
  }
  return value;
}

const KEY_RE = /^[a-z0-9_]{2,40}$/;

/** Машинный ключ пресета/шаблона: латиница, цифры, подчёркивания. */
export function requireKey(value, field) {
  const key = requireString(value, field, { max: 40 });
  if (!KEY_RE.test(key)) {
    throw badRequest(`Поле "${field}" должно состоять из латиницы, цифр и подчёркиваний (2-40 символов)`);
  }
  return key;
}
