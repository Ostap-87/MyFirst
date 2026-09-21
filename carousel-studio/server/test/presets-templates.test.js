import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';

const newApp = () => buildApp({ dbFile: ':memory:', logger: false });
const json = (res) => JSON.parse(res.body);

test('встроенные пресеты заводятся пустыми и со статусом draft', async (t) => {
  const app = await newApp();
  t.after(() => app.close());

  const { items } = json(await app.inject({ method: 'GET', url: '/api/brand-presets' }));
  assert.equal(items.length, 3);
  assert.deepEqual(
    items.map((p) => p.key).sort(),
    ['aura_robotics', 'gtt', 'ostapdotcenko'],
  );
  for (const preset of items) {
    assert.equal(preset.status, 'draft', `${preset.key}: пресет должен быть незаполненным`);
    assert.deepEqual(preset.fonts, {}, `${preset.key}: шрифты не выдумываем`);
    assert.deepEqual(preset.colors, {}, `${preset.key}: цвета не выдумываем`);
    assert.equal(preset.imageStyle, '');
    assert.equal(preset.isBuiltin, true);
  }
});

test('посев идемпотентен: повторный старт не дублирует и не затирает правки', async (t) => {
  const app = await newApp();
  t.after(() => app.close());

  const { items } = json(await app.inject({ method: 'GET', url: '/api/brand-presets' }));
  const gtt = items.find((p) => p.key === 'gtt');

  const filled = json(
    await app.inject({
      method: 'PATCH',
      url: `/api/brand-presets/${gtt.id}`,
      payload: {
        status: 'ready',
        fonts: { heading: { family: 'Montserrat', weight: 700 }, body: { family: 'Inter', weight: 400 } },
        colors: { background: '#0B1F3A', text: '#FFFFFF', accent: '#F5A623' },
        imageStyle: 'тёмный техно-минимализм',
      },
    }),
  );
  assert.equal(filled.status, 'ready');
  assert.equal(filled.fonts.heading.family, 'Montserrat');

  const { seedBuiltins } = await import('../src/db/seed.js');
  const added = await seedBuiltins(app.db);
  assert.deepEqual(added.presets, []);
  assert.deepEqual(added.templates, []);

  const again = json(await app.inject({ method: 'GET', url: `/api/brand-presets/${gtt.id}` }));
  assert.equal(again.colors.accent, '#F5A623');
  assert.equal(json(await app.inject({ method: 'GET', url: '/api/brand-presets' })).items.length, 3);
});

test('встроенный пресет нельзя удалить, свой — можно', async (t) => {
  const app = await newApp();
  t.after(() => app.close());

  const { items } = json(await app.inject({ method: 'GET', url: '/api/brand-presets' }));
  const res = await app.inject({ method: 'DELETE', url: `/api/brand-presets/${items[0].id}` });
  assert.equal(res.statusCode, 409);

  const own = json(
    await app.inject({
      method: 'POST',
      url: '/api/brand-presets',
      payload: { key: 'test_brand', name: 'Тестовый бренд' },
    }),
  );
  assert.equal(own.isBuiltin, false);
  assert.equal((await app.inject({ method: 'DELETE', url: `/api/brand-presets/${own.id}` })).statusCode, 204);

  const dup = await app.inject({
    method: 'POST',
    url: '/api/brand-presets',
    payload: { key: 'gtt', name: 'Дубль' },
  });
  assert.equal(dup.statusCode, 409);

  const badKey = await app.inject({
    method: 'POST',
    url: '/api/brand-presets',
    payload: { key: 'Плохой Ключ', name: 'X' },
  });
  assert.equal(badKey.statusCode, 400);
});

test('пять встроенных шаблонов, структура хук → подтверждение → ценности → CTA', async (t) => {
  const app = await newApp();
  t.after(() => app.close());

  const { items } = json(await app.inject({ method: 'GET', url: '/api/carousel-templates' }));
  assert.deepEqual(
    items.map((tpl) => tpl.key).sort(),
    ['before_after', 'case_study', 'myths_vs_reality', 'product_showcase', 'top5_facts'],
  );

  for (const tpl of items) {
    const roles = tpl.structure.map((slot) => slot.role);
    assert.equal(roles[0], 'hook', `${tpl.key}: первый слайд — хук`);
    assert.equal(roles[1], 'proof', `${tpl.key}: второй — подтверждение`);
    assert.equal(roles.at(-1), 'cta', `${tpl.key}: последний — CTA`);
    assert.ok(roles.slice(2, -1).every((r) => r === 'value'), `${tpl.key}: середина — ценности`);
    // объём карусели из ТЗ: 5-10 слайдов
    assert.ok(tpl.structure.length >= 5 && tpl.structure.length <= 10, `${tpl.key}: ${tpl.structure.length} слайдов`);
    assert.ok(tpl.structure.every((slot) => slot.intent.length > 0), `${tpl.key}: у каждого слота есть intent`);
  }
});

test('шаблон: клонирование, правка копии, защита встроенного', async (t) => {
  const app = await newApp();
  t.after(() => app.close());

  const { items } = json(await app.inject({ method: 'GET', url: '/api/carousel-templates' }));
  const source = items.find((tpl) => tpl.key === 'case_study');

  assert.equal((await app.inject({ method: 'DELETE', url: `/api/carousel-templates/${source.id}` })).statusCode, 409);

  const clone = json(
    await app.inject({
      method: 'POST',
      url: `/api/carousel-templates/${source.id}/clone`,
      payload: { key: 'case_study_aura', name: 'Разбор кейса — Aura' },
    }),
  );
  assert.equal(clone.isBuiltin, false);
  assert.deepEqual(clone.structure, source.structure);

  const trimmed = json(
    await app.inject({
      method: 'PATCH',
      url: `/api/carousel-templates/${clone.id}`,
      payload: {
        structure: [
          { role: 'hook', intent: 'Результат кейса' },
          { role: 'proof', intent: 'Кто клиент' },
          { role: 'value', hookType: 'before_after', intent: 'Цифры' },
          { role: 'cta', intent: 'Написать' },
        ],
      },
    }),
  );
  assert.equal(trimmed.structure.length, 4);
  assert.equal(trimmed.defaultSlideCount, 4);
  assert.equal((await app.inject({ method: 'DELETE', url: `/api/carousel-templates/${clone.id}` })).statusCode, 204);

  const badRole = await app.inject({
    method: 'POST',
    url: '/api/carousel-templates',
    payload: { key: 'bad', name: 'X', contentType: 'y', structure: [{ role: 'финал' }] },
  });
  assert.equal(badRole.statusCode, 400);
});

test('применение шаблона разворачивает структуру в слайды с оформлением пресета', async (t) => {
  const app = await newApp();
  t.after(() => app.close());

  const presets = json(await app.inject({ method: 'GET', url: '/api/brand-presets' })).items;
  const gtt = presets.find((p) => p.key === 'gtt');
  await app.inject({
    method: 'PATCH',
    url: `/api/brand-presets/${gtt.id}`,
    payload: {
      status: 'ready',
      fonts: { heading: { family: 'Montserrat', weight: 800, size: 104 }, body: { family: 'Inter', weight: 400 } },
      colors: { background: '#0B1F3A', text: '#FFFFFF', muted: '#B9C4D4' },
    },
  });

  const templates = json(await app.inject({ method: 'GET', url: '/api/carousel-templates' })).items;
  const myths = templates.find((tpl) => tpl.key === 'myths_vs_reality');

  const project = json(
    await app.inject({
      method: 'POST',
      url: '/api/projects',
      payload: { name: 'Мифы о роботизации', brief: 'Роботы для общепита', brandPresetId: gtt.id },
    }),
  );

  const applied = json(
    await app.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/apply-template`,
      payload: { templateId: myths.id },
    }),
  ).items;

  assert.equal(applied.length, myths.structure.length);
  assert.deepEqual(applied.map((s) => s.position), myths.structure.map((_, i) => i + 1));
  assert.deepEqual(applied.map((s) => s.role), myths.structure.map((slot) => slot.role));
  assert.equal(applied[0].generation.intent, myths.structure[0].intent);
  // оформление пришло из пресета
  assert.equal(applied[0].canvas.background.color, '#0B1F3A');
  const headline = applied[0].canvas.layers.find((l) => l.name === 'headline');
  assert.equal(headline.font.family, 'Montserrat');
  assert.equal(headline.font.size, 104);
  // templateId записался в проект
  assert.equal(json(await app.inject({ method: 'GET', url: `/api/projects/${project.id}` })).templateId, myths.id);

  // повторное применение без replace — 409
  const again = await app.inject({
    method: 'POST',
    url: `/api/projects/${project.id}/apply-template`,
    payload: { templateId: myths.id },
  });
  assert.equal(again.statusCode, 409);

  // залоченный слайд переживает пересборку, позиции остаются плотными
  await app.inject({ method: 'PATCH', url: `/api/slides/${applied[2].id}`, payload: { locked: true } });
  const rebuilt = json(
    await app.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/apply-template`,
      payload: { templateId: templates.find((tpl) => tpl.key === 'before_after').id, replace: true },
    }),
  ).items;
  assert.equal(rebuilt.length, 1 + 6);
  assert.deepEqual(rebuilt.map((s) => s.position), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(rebuilt[0].id, applied[2].id, 'залоченный слайд сохранился');

  // шаблон не указан нигде — понятная ошибка
  const bare = json(await app.inject({ method: 'POST', url: '/api/projects', payload: { name: 'Без шаблона' } }));
  const noTemplate = await app.inject({ method: 'POST', url: `/api/projects/${bare.id}/apply-template`, payload: {} });
  assert.equal(noTemplate.statusCode, 400);
});
