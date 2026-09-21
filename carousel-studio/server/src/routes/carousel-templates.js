import { requireObject, requireString, optionalString, optionalInt, requireKey } from '../lib/validate.js';
import { badRequest } from '../lib/errors.js';

export default async function carouselTemplateRoutes(app) {
  app.get('/api/carousel-templates', async (request) => ({
    items: await app.repos.carouselTemplates.list({
      contentType: optionalString(request.query?.contentType, 'contentType'),
    }),
  }));

  app.get('/api/carousel-templates/:id', async (request) =>
    app.repos.carouselTemplates.getOrFail(request.params.id));

  app.post('/api/carousel-templates', async (request, reply) => {
    const body = requireObject(request.body ?? {}, 'body');
    if (!Array.isArray(body.structure)) throw badRequest('Поле "structure" обязательно');
    const template = await app.repos.carouselTemplates.create({
      key: requireKey(body.key, 'key'),
      name: requireString(body.name, 'name', { max: 200 }),
      contentType: requireString(body.contentType, 'contentType', { max: 60 }),
      description: optionalString(body.description, 'description', { max: 4000 }),
      structure: body.structure,
      defaultSlideCount: optionalInt(body.defaultSlideCount, 'defaultSlideCount', { min: 1, max: 20 }),
    });
    reply.code(201);
    return template;
  });

  app.patch('/api/carousel-templates/:id', async (request) => {
    const body = requireObject(request.body ?? {}, 'body');
    return app.repos.carouselTemplates.update(request.params.id, {
      name: body.name === undefined ? undefined : requireString(body.name, 'name', { max: 200 }),
      contentType: optionalString(body.contentType, 'contentType', { max: 60 }),
      description: optionalString(body.description, 'description', { max: 4000 }),
      structure: body.structure,
      defaultSlideCount: optionalInt(body.defaultSlideCount, 'defaultSlideCount', { min: 1, max: 20 }),
    });
  });

  app.delete('/api/carousel-templates/:id', async (request, reply) => {
    await app.repos.carouselTemplates.remove(request.params.id);
    reply.code(204);
    return null;
  });

  /** Склонировать шаблон (в т.ч. встроенный), чтобы править копию. */
  app.post('/api/carousel-templates/:id/clone', async (request, reply) => {
    const body = requireObject(request.body ?? {}, 'body');
    const clone = await app.repos.carouselTemplates.clone(request.params.id, {
      key: requireKey(body.key, 'key'),
      name: optionalString(body.name, 'name', { max: 200 }),
    });
    reply.code(201);
    return clone;
  });
}
