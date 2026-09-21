import { PRESET_STATUSES } from '../repos/brand-presets.js';
import {
  requireObject, requireString, optionalString, optionalEnum, requireKey,
} from '../lib/validate.js';

export default async function brandPresetRoutes(app) {
  app.get('/api/brand-presets', async () => ({ items: await app.repos.brandPresets.list() }));

  app.get('/api/brand-presets/:id', async (request) =>
    app.repos.brandPresets.getOrFail(request.params.id));

  app.post('/api/brand-presets', async (request, reply) => {
    const body = requireObject(request.body ?? {}, 'body');
    const preset = await app.repos.brandPresets.create({
      key: requireKey(body.key, 'key'),
      name: requireString(body.name, 'name', { max: 200 }),
      status: optionalEnum(body.status, 'status', PRESET_STATUSES),
      fonts: body.fonts === undefined ? undefined : requireObject(body.fonts, 'fonts'),
      colors: body.colors === undefined ? undefined : requireObject(body.colors, 'colors'),
      imageStyle: optionalString(body.imageStyle, 'imageStyle', { max: 4000 }),
      logoPath: optionalString(body.logoPath, 'logoPath'),
      notes: optionalString(body.notes, 'notes', { max: 4000 }),
    });
    reply.code(201);
    return preset;
  });

  app.patch('/api/brand-presets/:id', async (request) => {
    const body = requireObject(request.body ?? {}, 'body');
    return app.repos.brandPresets.update(request.params.id, {
      name: body.name === undefined ? undefined : requireString(body.name, 'name', { max: 200 }),
      status: optionalEnum(body.status, 'status', PRESET_STATUSES),
      fonts: body.fonts === undefined ? undefined : requireObject(body.fonts, 'fonts'),
      colors: body.colors === undefined ? undefined : requireObject(body.colors, 'colors'),
      imageStyle: optionalString(body.imageStyle, 'imageStyle', { max: 4000 }),
      logoPath: body.logoPath === null ? null : optionalString(body.logoPath, 'logoPath'),
      notes: optionalString(body.notes, 'notes', { max: 4000 }),
    });
  });

  app.delete('/api/brand-presets/:id', async (request, reply) => {
    await app.repos.brandPresets.remove(request.params.id);
    reply.code(204);
    return null;
  });
}
