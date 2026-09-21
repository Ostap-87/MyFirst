import { SLIDE_ROLES, HOOK_TYPES, IMAGE_SOURCES } from '../lib/slide-schema.js';
import { isPlainObject, requireObject, optionalEnum, optionalString } from '../lib/validate.js';

export default async function slideRoutes(app) {
  app.get('/api/slides/:id', async (request) => app.repos.slides.getOrFail(request.params.id));

  app.patch('/api/slides/:id', async (request) => {
    const body = requireObject(request.body ?? {}, 'body');
    const slide = await app.repos.slides.getOrFail(request.params.id);
    const project = await app.repos.projects.getOrFail(slide.projectId);

    const image = isPlainObject(body.image)
      ? {
          source: optionalEnum(body.image.source, 'image.source', IMAGE_SOURCES),
          url: body.image.url === null ? null : optionalString(body.image.url, 'image.url'),
          path: body.image.path === null ? null : optionalString(body.image.path, 'image.path'),
          meta: body.image.meta === undefined ? undefined : requireObject(body.image.meta, 'image.meta'),
        }
      : undefined;

    return app.repos.slides.update(
      slide.id,
      {
        role: optionalEnum(body.role, 'role', SLIDE_ROLES),
        hookType: body.hookType === null ? null : optionalEnum(body.hookType, 'hookType', HOOK_TYPES),
        text: body.text === undefined ? undefined : requireObject(body.text, 'text'),
        canvas: body.canvas === undefined ? undefined : requireObject(body.canvas, 'canvas'),
        image,
        generation: body.generation === undefined ? undefined : requireObject(body.generation, 'generation'),
        locked: body.locked === undefined ? undefined : Boolean(body.locked),
      },
      { size: project.canvas },
    );
  });

  app.delete('/api/slides/:id', async (request, reply) => {
    await app.repos.slides.remove(request.params.id);
    reply.code(204);
    return null;
  });
}
