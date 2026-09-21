/**
 * Контракт адаптера БД.
 *
 * Весь код выше (репозитории, роуты) знает только этот интерфейс и пишет
 * переносимый SQL с позиционными плейсхолдерами `?`. Сейчас реализация одна —
 * SQLite для локальной работы. Перенос на VPS рядом с контент-дашбордом =
 * новый класс с теми же методами (например PostgresAdapter, где `?` на входе
 * транслируется в `$1..$n`), схема данных не меняется.
 *
 * Все методы асинхронные намеренно: синхронный SQLite оборачивается легко,
 * а сетевая СУБД иначе не ляжет в тот же интерфейс.
 */
export class DbAdapter {
  /** Открыть соединение и применить миграции. */
  async init() { throw new Error('not implemented'); }

  /** INSERT/UPDATE/DELETE. Возвращает { changes }. */
  async run(_sql, _params = []) { throw new Error('not implemented'); }

  /** Одна строка или undefined. */
  async get(_sql, _params = []) { throw new Error('not implemented'); }

  /** Массив строк. */
  async all(_sql, _params = []) { throw new Error('not implemented'); }

  /** Выполнить fn внутри транзакции; откат при исключении. */
  async transaction(_fn) { throw new Error('not implemented'); }

  /** Выполнить пакет DDL (миграции). */
  async exec(_sql) { throw new Error('not implemented'); }

  async close() { throw new Error('not implemented'); }
}

export default DbAdapter;
