import { config } from '../config.js';

/** Health + публичная часть конфига: фронт узнаёт формат холста и какие интеграции включены. */
export default async function healthRoutes(app) {
  app.get('/api/health', async () => {
    const row = await app.db.get('SELECT COUNT(*) AS n FROM projects');
    return { ok: true, env: config.env, projects: row.n, time: new Date().toISOString() };
  });

  app.get('/api/config', async () => ({
    canvas: config.canvas,
    slides: config.slides,
    languages: ['ru', 'en'],
    integrations: {
      claude: Boolean(config.keys.anthropic),
      pexels: Boolean(config.keys.pexels),
      unsplash: Boolean(config.keys.unsplash),
      higgsfield: Boolean(config.keys.higgsfield),
      googleFonts: Boolean(config.keys.googleFonts),
      meta: Boolean(config.keys.metaAppId && config.keys.metaAppSecret),
    },
  }));
}
