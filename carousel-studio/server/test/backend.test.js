import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../src/app.js';

const newApp = () => buildApp({ dbFile: ':memory:', logger: false });
const json = (res) => JSON.parse(res.body);

test('health и config отвечают', async (t) => {
  const app = await newApp();
  t.after(() => app.close());

  const health = await app.inject({ method: 'GET', url: '/api/health' });
  assert.equal(health.statusCode, 200);
  assert.equal(json(health).ok, true);

  const cfg = json(await app.inject({ method: 'GET', url: '/api/config' }));
  assert.equal(cfg.canvas.width, 1080);
  assert.equal(cfg.canvas.height, 1440);
  assert.equal(typeof cfg.integrations.claude, 'boolean');
});

test('CRUD проекта', async (t) => {
  const app = await newApp();
  t.after(() => app.close());

  const created = await app.inject({
    method: 'POST',
    url: '/api/projects',
    payload: { name: 'Тест карусели', brief: 'Робот-бариста для кофеен', language: 'ru' },
  });
  assert.equal(created.statusCode, 201);
  const project = json(created);
  assert.equal(project.status, 'draft');
  assert.deepEqual(project.canvas, { width: 1080, height: 1440 });

  const patched = json(
    await app.inject({
      method: 'PATCH',
      url: `/api/projects/${project.id}`,
      payload: { status: 'ready', hashtags: ['#robots', '#horeca'] },
    }),
  );
  assert.equal(patched.status, 'ready');
  assert.deepEqual(patched.hashtags, ['#robots', '#horeca']);

  const list = json(await app.inject({ method: 'GET', url: '/api/projects' }));
  assert.equal(list.items.length, 1);

  assert.equal((await app.inject({ method: 'DELETE', url: `/api/projects/${project.id}` })).statusCode, 204);
  assert.equal((await app.inject({ method: 'GET', url: `/api/projects/${project.id}` })).statusCode, 404);
});

test('валидация входа', async (t) => {
  const app = await newApp();
  t.after(() => app.close());

  const noName = await app.inject({ method: 'POST', url: '/api/projects', payload: { brief: 'x' } });
  assert.equal(noName.statusCode, 400);

  const badStatus = await app.inject({
    method: 'POST',
    url: '/api/projects',
    payload: { name: 'A' },
  });
  const id = json(badStatus).id;
  const res = await app.inject({ method: 'PATCH', url: `/api/projects/${id}`, payload: { status: 'wat' } });
  assert.equal(res.statusCode, 400);

  const badPreset = await app.inject({
    method: 'POST',
    url: '/api/projects',
    payload: { name: 'B', brandPresetId: 'нет-такого' },
  });
  assert.equal(badPreset.statusCode, 400);
});

test('слайды: создание, дефолтный canvas, позиции, перестановка, каскад', async (t) => {
  const app = await newApp();
  t.after(() => app.close());

  const project = json(
    await app.inject({ method: 'POST', url: '/api/projects', payload: { name: 'Карусель' } }),
  );

  const first = json(
    await app.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/slides`,
      payload: { role: 'hook', text: { headline: 'Останови скролл' } },
    }),
  );
  assert.equal(first.position, 1);
  assert.equal(first.role, 'hook');
  assert.equal(first.text.headline, 'Останови скролл');
  // дефолтный холст: 1080×1440 + блоки headline и body с позицией, размером и шрифтом
  assert.equal(first.canvas.size.width, 1080);
  assert.equal(first.canvas.layers.length, 2);
  const headline = first.canvas.layers.find((l) => l.name === 'headline');
  assert.equal(headline.type, 'text');
  assert.ok(headline.box.width > 0 && headline.box.height > 0);
  assert.ok(headline.font.family);
  assert.equal(headline.autoFit.enabled, true);

  const second = json(
    await app.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/slides`,
      payload: { role: 'value', hookType: 'before_after' },
    }),
  );
  const third = json(
    await app.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/slides`,
      payload: { role: 'cta' },
    }),
  );
  assert.deepEqual([second.position, third.position], [2, 3]);

  // вставка в середину сдвигает хвост
  const inserted = json(
    await app.inject({
      method: 'POST',
      url: `/api/projects/${project.id}/slides`,
      payload: { role: 'proof', position: 2 },
    }),
  );
  assert.equal(inserted.position, 2);
  let slides = json(await app.inject({ method: 'GET', url: `/api/projects/${project.id}/slides` })).items;
  assert.deepEqual(slides.map((s) => s.role), ['hook', 'proof', 'value', 'cta']);

  // перестановка
  const reordered = json(
    await app.inject({
      method: 'PUT',
      url: `/api/projects/${project.id}/slides/reorder`,
      payload: { order: [third.id, first.id, inserted.id, second.id] },
    }),
  ).items;
  assert.deepEqual(reordered.map((s) => s.position), [1, 2, 3, 4]);
  assert.deepEqual(reordered.map((s) => s.role), ['cta', 'hook', 'proof', 'value']);

  // неполный order отклоняется
  const badOrder = await app.inject({
    method: 'PUT',
    url: `/api/projects/${project.id}/slides/reorder`,
    payload: { order: [first.id] },
  });
  assert.equal(badOrder.statusCode, 400);

  // удаление слайда уплотняет позиции
  assert.equal((await app.inject({ method: 'DELETE', url: `/api/slides/${first.id}` })).statusCode, 204);
  slides = json(await app.inject({ method: 'GET', url: `/api/projects/${project.id}/slides` })).items;
  assert.deepEqual(slides.map((s) => s.position), [1, 2, 3]);

  // проект с include=slides
  const withSlides = json(
    await app.inject({ method: 'GET', url: `/api/projects/${project.id}?include=slides` }),
  );
  assert.equal(withSlides.slides.length, 3);

  // каскадное удаление
  await app.inject({ method: 'DELETE', url: `/api/projects/${project.id}` });
  assert.equal((await app.inject({ method: 'GET', url: `/api/slides/${second.id}` })).statusCode, 404);
});

test('слайд: обновление canvas и картинки нормализуется', async (t) => {
  const app = await newApp();
  t.after(() => app.close());

  const project = json(
    await app.inject({ method: 'POST', url: '/api/projects', payload: { name: 'P' } }),
  );
  const slide = json(
    await app.inject({ method: 'POST', url: `/api/projects/${project.id}/slides`, payload: {} }),
  );

  const updated = json(
    await app.inject({
      method: 'PATCH',
      url: `/api/slides/${slide.id}`,
      payload: {
        canvas: {
          background: { color: '#0B1F3A', overlay: { color: '#000000', opacity: 0.4 } },
          layers: [
            {
              type: 'text',
              name: 'headline',
              text: 'Заголовок',
              box: { x: 80, y: 120, width: 920, height: 400 },
              font: { family: 'Montserrat', weight: 700, size: 96 },
              zIndex: 5,
            },
            { type: 'image', name: 'photo', src: '/uploads/a.png', box: { x: 0, y: 0, width: 1080, height: 1440 }, zIndex: 1 },
          ],
        },
        image: { source: 'pexels', url: 'https://example.com/a.jpg', meta: { author: 'X' } },
        locked: true,
      },
    }),
  );

  assert.equal(updated.canvas.background.color, '#0B1F3A');
  assert.equal(updated.canvas.background.overlay.opacity, 0.4);
  // слои отсортированы по zIndex
  assert.deepEqual(updated.canvas.layers.map((l) => l.name), ['photo', 'headline']);
  assert.equal(updated.canvas.layers[1].font.family, 'Montserrat');
  assert.equal(updated.image.source, 'pexels');
  assert.equal(updated.image.meta.author, 'X');
  assert.equal(updated.locked, true);

  const badLayer = await app.inject({
    method: 'PATCH',
    url: `/api/slides/${slide.id}`,
    payload: { canvas: { layers: [{ type: 'видео' }] } },
  });
  assert.equal(badLayer.statusCode, 400);

  const badSource = await app.inject({
    method: 'PATCH',
    url: `/api/slides/${slide.id}`,
    payload: { image: { source: 'midjourney' } },
  });
  assert.equal(badSource.statusCode, 400);
});
