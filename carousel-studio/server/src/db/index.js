import { config } from '../config.js';
import { SqliteAdapter } from './sqlite-adapter.js';

let instance = null;

/** Фабрика адаптера. Единственное место, где выбирается драйвер БД. */
export async function createDb({ file = config.db.file, driver = config.db.driver, logger } = {}) {
  if (driver !== 'sqlite') {
    throw new Error(`Неизвестный DB_DRIVER: ${driver}. Сейчас поддерживается только sqlite.`);
  }
  const adapter = new SqliteAdapter({ file, logger });
  await adapter.init();
  return adapter;
}

/** Синглтон для приложения. */
export async function getDb(options) {
  if (!instance) instance = await createDb(options);
  return instance;
}

export async function closeDb() {
  await instance?.close();
  instance = null;
}
