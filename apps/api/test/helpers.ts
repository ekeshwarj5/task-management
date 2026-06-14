import { afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { sql } from 'drizzle-orm';
import { buildApp } from '../src/app';
import { db, pool } from '../src/db/client';
import { config } from '../src/config';

/**
 * Test harness:
 *   - Builds a single Fastify instance per test file (no port binding;
 *     all assertions go through .inject()).
 *   - Truncates users + tasks before every test so each case starts
 *     from a clean slate without paying for migration teardown.
 *   - Closes the app + pool once all tests in the file finish.
 *
 * Run against TEST_DATABASE_URL (set in vitest.config or via env).
 */
export const createTestApp = (): FastifyInstance => {
  const app = buildApp({ logger: false });

  beforeEach(async () => {
    // RESTART IDENTITY isn't strictly necessary for uuid PKs but keeps
    // any future serial columns deterministic. CASCADE handles the FK
    // from tasks → users without ordering bookkeeping.
    await db.execute(sql`TRUNCATE TABLE tasks, users RESTART IDENTITY CASCADE`);
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  return app;
};

export interface SessionUser {
  cookie: string;
  user: { id: string; email: string; role: 'user' | 'admin' };
}

/**
 * Sign a user up and return both the parsed user object and the
 * session cookie value (formatted as 'task_session=…') ready to drop
 * straight into a subsequent .inject() call's `cookies` map.
 */
export const signupAs = async (
  app: FastifyInstance,
  email: string,
  password = 'super-secret-pw',
): Promise<SessionUser> => {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/signup',
    payload: { email, password },
  });
  if (response.statusCode !== 201) {
    throw new Error(`signup failed (${response.statusCode}): ${response.body}`);
  }
  const setCookie = response.headers['set-cookie'];
  const cookieHeader = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!cookieHeader) throw new Error('signup did not set a session cookie');

  const tokenMatch = cookieHeader.match(new RegExp(`${config.COOKIE_NAME}=([^;]+)`));
  if (!tokenMatch) throw new Error('session cookie not found in Set-Cookie');

  return {
    cookie: `${config.COOKIE_NAME}=${tokenMatch[1]}`,
    user: response.json().user,
  };
};
