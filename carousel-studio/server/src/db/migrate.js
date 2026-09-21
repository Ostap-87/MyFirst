import { createDb } from './index.js';
import { config } from '../config.js';

const db = await createDb({ logger: console });
const rows = await db.all('SELECT version, applied_at FROM schema_migrations ORDER BY version');
console.log(`БД: ${config.db.file}`);
console.log('Применённые миграции:');
for (const r of rows) console.log(`  ${r.version}  ${r.applied_at}`);
await db.close();
