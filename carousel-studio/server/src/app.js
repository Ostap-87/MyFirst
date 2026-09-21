import fs from 'node:fs';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import { config } from './config.js';
import { createDb } from './db/index.js';
import { HttpError } from './lib/errors.js';
import { createProjectsRepo } from './repos/projects.js';
import { createSlidesRepo } from './repos/slides.js';
import healthRoutes from './routes/health.js';
import projectRoutes from './routes/projects.js';
import slideRoutes from './routes/slides.js';

/**
 * Сборка приложения. Вынесена отдельно от запуска, чтобы тесты поднимали
 * тот же app с in-memory БД через app.inject().
 */
export async function buildApp({ dbFile = config.db.file, logger = { level: config.logLevel } } = {}) {
  const app = Fastify({ logger, bodyLimit: 25 * 1024 * 1024 });

  const db = await createDb({ file: dbFile, logger: app.log });
  app.decorate('db', db);
  app.decorate('repos', {
    projects: createProjectsRepo(db),
    slides: createSlidesRepo(db),
  });
  app.addHook('onClose', async () => db.close());

  await app.register(cors, { origin: true });

  // Локальное хранилище картинок слайдов доступно по /uploads/*
  fs.mkdirSync(config.storage.uploadsDir, { recursive: true });
  await app.register(fastifyStatic, { root: config.storage.uploadsDir, prefix: '/uploads/' });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof HttpError) {
      reply.code(error.statusCode).send({ error: error.message, details: error.details });
      return;
    }
    if (error.statusCode && error.statusCode < 500) {
      reply.code(error.statusCode).send({ error: error.message });
      return;
    }
    request.log.error(error);
    reply.code(500).send({ error: 'Внутренняя ошибка сервера' });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({ error: `Маршрут ${request.method} ${request.url} не найден` });
  });

  await app.register(healthRoutes);
  await app.register(projectRoutes);
  await app.register(slideRoutes);

  return app;
}

export default buildApp;
