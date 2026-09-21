import { createDb } from './index.js';
import { config } from '../config.js';
import { createBrandPresetsRepo } from '../repos/brand-presets.js';
import { createCarouselTemplatesRepo } from '../repos/carousel-templates.js';
import { BRAND_PRESETS, CAROUSEL_TEMPLATES } from './seed-data.js';

/**
 * Идемпотентный посев встроенных пресетов и шаблонов.
 * Добавляет только недостающие ключи и НИКОГДА не перезаписывает то,
 * что пользователь уже отредактировал.
 */
export async function seedBuiltins(db, { logger = null } = {}) {
  const presets = createBrandPresetsRepo(db);
  const templates = createCarouselTemplatesRepo(db);
  const added = { presets: [], templates: [] };

  for (const preset of BRAND_PRESETS) {
    if (await presets.getByKey(preset.key)) continue;
    await presets.create(preset);
    added.presets.push(preset.key);
  }
  for (const template of CAROUSEL_TEMPLATES) {
    if (await templates.getByKey(template.key)) continue;
    await templates.create(template);
    added.templates.push(template.key);
  }

  if (added.presets.length || added.templates.length) {
    logger?.info?.(added, 'встроенные данные добавлены');
  }
  return added;
}

// Запуск напрямую: npm run seed
if (import.meta.url === `file://${process.argv[1]}`) {
  const db = await createDb({ logger: console });
  const added = await seedBuiltins(db, { logger: console });
  console.log(`БД: ${config.db.file}`);
  console.log('Добавлены пресеты:', added.presets.join(', ') || '— (уже были)');
  console.log('Добавлены шаблоны:', added.templates.join(', ') || '— (уже были)');
  await db.close();
}
