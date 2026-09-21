import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { DbAdapter } from './adapter.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(here, 'migrations');

/**
 * SQLite-реализация контракта DbAdapter.
 * better-sqlite3 синхронный, поэтому методы возвращают уже готовый результат,
 * обёрнутый в Promise — снаружи интерфейс асинхронный и одинаковый для любой СУБД.
 */
export class SqliteAdapter extends DbAdapter {
  constructor({ file, logger = null } = {}) {
    super();
    this.file = file;
    this.logger = logger;
    this.db = null;
    this.inTransaction = false;
  }

  async init() {
    if (this.file !== ':memory:') {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
    }
    this.db = new Database(this.file);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    await this.migrate();
    return this;
  }

  async migrate() {
    this.db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )`);

    const applied = new Set(
      this.db.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version),
    );
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files) {
      const version = file.replace(/\.sql$/, '');
      if (applied.has(version)) continue;
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const run = this.db.transaction(() => {
        this.db.exec(sql);
        this.db
          .prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)')
          .run(version, new Date().toISOString());
      });
      run();
      this.logger?.info({ migration: version }, 'migration applied');
    }
  }

  async run(sql, params = []) {
    const info = this.db.prepare(sql).run(params);
    return { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
  }

  async get(sql, params = []) {
    return this.db.prepare(sql).get(params);
  }

  async all(sql, params = []) {
    return this.db.prepare(sql).all(params);
  }

  async exec(sql) {
    this.db.exec(sql);
  }

  /**
   * Транзакция через явные BEGIN/COMMIT: better-sqlite3 .transaction() не умеет
   * async-колбэки, а нам нужен общий интерфейс с сетевыми драйверами.
   * Приложение однопроцессное и локальное, вложенные транзакции не поддерживаются.
   */
  async transaction(fn) {
    if (this.inTransaction) return fn(this);
    this.db.exec('BEGIN');
    this.inTransaction = true;
    try {
      const result = await fn(this);
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    } finally {
      this.inTransaction = false;
    }
  }

  async close() {
    this.db?.close();
    this.db = null;
  }
}

export default SqliteAdapter;
