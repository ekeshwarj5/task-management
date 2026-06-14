import { describe, expect, it } from 'vitest';
import { createTestApp, signupAs } from './helpers';

const app = createTestApp();

const validTask = {
  title: 'Private to user A',
  description: 'Only the owner should see this',
  status: 'todo' as const,
  priority: 'medium' as const,
  dueDate: null,
};

describe('Per-user isolation', () => {
  it('user B cannot read, update, or delete user A’s task', async () => {
    const alice = await signupAs(app, 'alice@example.com');
    const bob = await signupAs(app, 'bob@example.com');

    // Alice creates a task.
    const created = await app
      .inject({
        method: 'POST',
        url: '/tasks',
        headers: { cookie: alice.cookie },
        payload: validTask,
      })
      .then((r) => r.json());

    // Bob's reads / mutations on Alice's id must all 404 — never 200,
    // never 403 (403 would leak existence).
    const bobReads = await app.inject({
      method: 'GET',
      url: `/tasks/${created.id}`,
      headers: { cookie: bob.cookie },
    });
    expect(bobReads.statusCode).toBe(404);

    const bobPatches = await app.inject({
      method: 'PATCH',
      url: `/tasks/${created.id}`,
      headers: { cookie: bob.cookie },
      payload: { status: 'done' },
    });
    expect(bobPatches.statusCode).toBe(404);

    const bobDeletes = await app.inject({
      method: 'DELETE',
      url: `/tasks/${created.id}`,
      headers: { cookie: bob.cookie },
    });
    expect(bobDeletes.statusCode).toBe(404);

    // And it really is unchanged — Alice still sees the original.
    const aliceReads = await app.inject({
      method: 'GET',
      url: `/tasks/${created.id}`,
      headers: { cookie: alice.cookie },
    });
    expect(aliceReads.statusCode).toBe(200);
    expect(aliceReads.json().status).toBe('todo');
  });

  it('list only returns the caller’s tasks', async () => {
    const alice = await signupAs(app, 'alice@example.com');
    const bob = await signupAs(app, 'bob@example.com');

    await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { cookie: alice.cookie },
      payload: { ...validTask, title: 'Alice 1' },
    });
    await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { cookie: alice.cookie },
      payload: { ...validTask, title: 'Alice 2' },
    });
    await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { cookie: bob.cookie },
      payload: { ...validTask, title: 'Bob 1' },
    });

    const aliceList = await app.inject({
      method: 'GET',
      url: '/tasks',
      headers: { cookie: alice.cookie },
    });
    const bobList = await app.inject({
      method: 'GET',
      url: '/tasks',
      headers: { cookie: bob.cookie },
    });

    expect(aliceList.json().total).toBe(2);
    expect(bobList.json().total).toBe(1);
    expect(bobList.json().items[0].title).toBe('Bob 1');
  });
});
