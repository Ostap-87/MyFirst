/** Ошибка с HTTP-статусом: роуты кидают её, единый error-handler превращает в JSON. */
export class HttpError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const badRequest = (message, details) => new HttpError(400, message, details);
export const notFound = (message = 'Не найдено') => new HttpError(404, message);
export const conflict = (message, details) => new HttpError(409, message, details);
/** Интеграция не настроена (нет ключа) — отдаём 503 с инструкцией, а не падаем. */
export const notConfigured = (what) =>
  new HttpError(503, `Интеграция не настроена: ${what}. Добавь ключ в carousel-studio/.env`);
