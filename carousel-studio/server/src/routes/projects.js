import { PROJECT_STATUSES, LANGUAGES } from '../repos/projects.js';
import {
  requireString, optionalString, optionalEnum, optionalInt, optionalStringArray, requireObject,
} from '../lib/validate.js';
import { isPlainObject } from '../lib/validate.js';
import { badRequest, conflict } from '../lib/errors.js';

const parseCanvasSize = (body) => {
  if (body.canvas === undefined) return undefined;
  const canvas = requireObject(body.canvas, 'canvas');
  return {
    width: optionalInt(canvas.width, 'canvas.width', { min: 320, max: 4096 }),
    height: optionalInt(canvas.height, 'canvas.height', { min: 320, max: 4096 }),
  };
};

export default async function projectRoutes(app) {
  app.get('/api/projects', async (request) => {
    const { limit, offset, status } = request.query ?? {};
    return {
      items: await app.repos.projects.list({
        limit: optionalInt(limit, 'limit', { min: 1, max: 200 }) ?? 50,
        offset: optionalInt(offset, 'offset', { min: 0 }) ?? 0,
        status: optionalEnum(status, 'status', PROJECT_STATUSES),
      }),
    };
  });

  app.get('/api/projects/:id', async (request) => {
    const project = await app.repos.projects.getOrFail(request.params.id);
    const include = String(request.query?.include ?? '').split(',');
    if (include.includes('slides')) {
      project.slides = await app.repos.slides.listByProject(project.id);
    }
    return project;
  });

  app.post('/api/projects', async (request, reply) => {
    const body = requireObject(request.body ?? {}, 'body');
    const project = await app.repos.projects.create({
      name: requireString(body.name, 'name', { max: 200 }),
      brief: optionalString(body.brief, 'brief', { max: 20000 }),
      language: optionalEnum(body.language, 'language', LANGUAGES),
      brandPresetId: optionalString(body.brandPresetId, 'brandPresetId'),
      templateId: optionalString(body.templateId, 'templateId'),
      canvas: parseCanvasSize(body),
      settings: body.settings === undefined ? undefined : requireObject(body.settings, 'settings'),
      caption: optionalString(body.caption, 'caption', { max: 4000 }),
      hashtags: optionalStringArray(body.hashtags, 'hashtags'),
    });
    reply.code(201);
    return project;
  });

  app.patch('/api/projects/:id', async (request) => {
    const body = requireObject(request.body ?? {}, 'body');
    return app.repos.projects.update(request.params.id, {
      name: body.name === undefined ? undefined : requireString(body.name, 'name', { max: 200 }),
      brief: optionalString(body.brief, 'brief', { max: 20000 }),
      language: optionalEnum(body.language, 'language', LANGUAGES),
      status: optionalEnum(body.status, 'status', PROJECT_STATUSES),
      brandPresetId: body.brandPresetId === null ? null : optionalString(body.brandPresetId, 'brandPresetId'),
      templateId: body.templateId === null ? null : optionalString(body.templateId, 'templateId'),
      canvas: parseCanvasSize(body),
      settings: body.settings === undefined ? undefined : requireObject(body.settings, 'settings'),
      caption: optionalString(body.caption, 'caption', { max: 4000 }),
      hashtags: optionalStringArray(body.hashtags, 'hashtags'),
    });
  });

  app.delete('/api/projects/:id', async (request, reply) => {
    await app.repos.projects.remove(request.params.id);
    reply.code(204);
    return null;
  });

  // ---- слайды проекта ----

  app.get('/api/projects/:id/slides', async (request) => {
    const project = await app.repos.projects.getOrFail(request.params.id);
    return { items: await app.repos.slides.listByProject(project.id) };
  });

  app.post('/api/projects/:id/slides', async (request, reply) => {
    const project = await app.repos.projects.getOrFail(request.params.id);
    const body = isPlainObject(request.body) ? request.body : {};
    const preset = project.brandPresetId
      ? await app.repos.brandPresets.get(project.brandPresetId)
      : null;
    const slide = await app.repos.slides.create(project.id, body, {
      size: project.canvas,
      preset,
    });
    reply.code(201);
    return slide;
  });

  /**
   * Применить шаблон карусели: развернуть его структуру в слайды-заготовки.
   * Текст остаётся пустым — его заполняет ИИ на шаге 5. Оформление берётся
   * из брендового пресета проекта.
   *
   * { templateId?, replace?: boolean } — templateId по умолчанию берётся из проекта,
   * replace: true стирает существующие слайды (кроме помеченных locked).
   */
  app.post('/api/projects/:id/apply-template', async (request, reply) => {
    const project = await app.repos.projects.getOrFail(request.params.id);
    const body = isPlainObject(request.body) ? request.body : {};
    const templateId = optionalString(body.templateId, 'templateId') ?? project.templateId;
    if (!templateId) {
      throw badRequest('Не указан шаблон: передай templateId или задай его в проекте');
    }
    const template = await app.repos.carouselTemplates.getOrFail(templateId);
    const preset = project.brandPresetId
      ? await app.repos.brandPresets.get(project.brandPresetId)
      : null;

    const existing = await app.repos.slides.count(project.id);
    if (existing > 0 && body.replace !== true) {
      throw conflict(
        `В проекте уже ${existing} слайдов. Передай replace: true, чтобы пересобрать карусель по шаблону`,
      );
    }
    if (body.replace === true) {
      await app.repos.slides.removeByProject(project.id, { keepLocked: true });
    }

    for (const slot of template.structure) {
      await app.repos.slides.create(
        project.id,
        { role: slot.role, hookType: slot.hookType, generation: { intent: slot.intent, fields: slot.fields } },
        { size: project.canvas, preset },
      );
    }

    if (project.templateId !== template.id) {
      await app.repos.projects.update(project.id, { templateId: template.id });
    }

    reply.code(201);
    return { items: await app.repos.slides.listByProject(project.id) };
  });

  app.put('/api/projects/:id/slides/reorder', async (request) => {
    const project = await app.repos.projects.getOrFail(request.params.id);
    const order = request.body?.order;
    if (!Array.isArray(order)) throw badRequest('Ожидается { order: [slideId, ...] }');
    return { items: await app.repos.slides.reorder(project.id, order) };
  });
}
