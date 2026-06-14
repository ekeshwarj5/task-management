import { describe, expect, it } from 'vitest';
import { createTestApp, signupAs } from './helpers';

const app = createTestApp();

describe('Auth flow', () => {
  it('signup → me roundtrip: user can read their session after sign-up', async () => {
    const { cookie, user } = await signupAs(app, 'jane@example.com');

    expect(user.email).toBe('jane@example.com');
    expect(user.role).toBe('user');
    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);

    // /auth/me with the cookie returns the same user.
    const me = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { cookie },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().user.email).toBe('jane@example.com');
    expect(me.json().user.sub).toBe(user.id);
  });

  it('rejects duplicate signup with 409', async () => {
    await signupAs(app, 'dup@example.com');

    const second = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { email: 'dup@example.com', password: 'another-strong-pw' },
    });
    expect(second.statusCode).toBe(409);
    expect(second.json().error).toBe('Conflict');
  });

  it('login with wrong password returns a generic 401 (no enumeration)', async () => {
    await signupAs(app, 'enum@example.com');

    const wrongPassword = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'enum@example.com', password: 'wrong-password!!' },
    });
    expect(wrongPassword.statusCode).toBe(401);

    const wrongEmail = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'never-signed-up@example.com', password: 'whatever-123' },
    });
    expect(wrongEmail.statusCode).toBe(401);

    // Same shape both times — caller can't tell which email is registered.
    expect(wrongPassword.json().message).toEqual(wrongEmail.json().message);
  });

  it('rejects signup with an 8-character password as 400', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: { email: 'short@example.com', password: 'short' },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('ValidationError');
  });

  it('GET /auth/me without a cookie returns 401', async () => {
    const response = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(response.statusCode).toBe(401);
  });
});
