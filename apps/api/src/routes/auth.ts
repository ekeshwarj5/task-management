import type { FastifyInstance } from 'fastify';
import { SignupSchema, LoginSchema } from '@task/shared';
import { config } from '../config';
import { db } from '../db/client';
import { UserRepository } from '../repositories/user-repository';
import { requireAuth } from '../middleware/auth';
import { hashPassword, verifyPassword } from '../utils/password';
import { signToken } from '../utils/jwt';

/**
 * Auth endpoints: POST /auth/signup, POST /auth/login, POST /auth/logout, GET /auth/me.
 *
 * Successful signup / login set a JWT in an HTTP-only cookie. Logout
 * clears it. GET /auth/me lets the frontend hydrate its auth state on
 * page refresh - it reads the cookie, returns the current user or 401.
 */
export const authRoutes = async (app: FastifyInstance): Promise<void> => {
  const users = new UserRepository(db);

  const cookieOptions = {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: 'lax' as const,
    path: '/',
    ...(config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {}),
  };

  // POST /auth/signup --------------------------------------------------------
  app.post('/auth/signup', async (request, reply) => {
    const parsed = SignupSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: 'ValidationError', issues: parsed.error.issues });
    }

    const existing = await users.findByEmail(parsed.data.email);
    if (existing) {
      return reply
        .code(409)
        .send({ error: 'Conflict', message: 'Email is already registered' });
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await users.insert({ email: parsed.data.email, passwordHash });

    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    reply.setCookie(config.COOKIE_NAME, token, cookieOptions);

    return reply
      .code(201)
      .send({ user: { id: user.id, email: user.email, role: user.role } });
  });

  // POST /auth/login ---------------------------------------------------------
  app.post('/auth/login', async (request, reply) => {
    const parsed = LoginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: 'ValidationError', issues: parsed.error.issues });
    }

    const user = await users.findByEmail(parsed.data.email);
    // Generic 401 for both "no user" and "bad password" so we don't
    // leak which emails are registered.
    const generic401 = { error: 'Unauthorized', message: 'Invalid email or password' };
    if (!user) return reply.code(401).send(generic401);

    const matches = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!matches) return reply.code(401).send(generic401);

    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    reply.setCookie(config.COOKIE_NAME, token, cookieOptions);

    return reply
      .code(200)
      .send({ user: { id: user.id, email: user.email, role: user.role } });
  });

  // POST /auth/logout --------------------------------------------------------
  app.post('/auth/logout', async (_request, reply) => {
    reply.clearCookie(config.COOKIE_NAME, { path: '/' });
    return reply.code(204).send();
  });

  // GET /auth/me -------------------------------------------------------------
  app.get('/auth/me', { preHandler: requireAuth }, async (request) => {
    // requireAuth has attached request.user.
    return { user: request.user };
  });
};
