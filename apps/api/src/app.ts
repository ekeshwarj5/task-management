import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { config } from './config';
import { authRoutes } from './routes/auth';
import { taskRoutes } from './routes/tasks';

export interface BuildAppOptions {
  logger?: boolean;
}

/**
 * Build a Fastify instance with the standard plugin set:
 *   - @fastify/cookie for auth cookies
 *   - @fastify/cors so the Next.js frontend can call this API
 *   - @fastify/sensible for httpErrors helpers (404, 401, etc.)
 *
 * Routes are registered later by the entry point or by tests.
 */
export const buildApp = (options: BuildAppOptions = {}): FastifyInstance => {
  const app = Fastify({ logger: options.logger ?? false });

  app.register(cookie);
  app.register(cors, {
    origin: config.CORS_ORIGIN,
    credentials: true,
  });
  app.register(sensible);

  app.get('/health', async () => ({ ok: true, service: 'task-api' }));

  app.register(authRoutes);
  app.register(taskRoutes);

  return app;
};
