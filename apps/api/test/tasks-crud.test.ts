import { describe, expect, it } from 'vitest';
import { createTestApp, signupAs } from './helpers';

const app = createTestApp();

const validTask = {
  title: 'Write API contract',
  description: 'Document POST / GET / PATCH / DELETE shapes',
  status: 'todo' as const,
  priority: 'high' as const,
  dueDate: '2026-07-01',
};

describe('Tasks CRUD lifecycle', () => {
  it('POST → GET → PATCH → DELETE round-trips a task', async () => {
    const { cookie } = await signupAs(app, 'crud@example.com');

    // Create
    const created = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { cookie },
      payload: validTask,
    });
    expect(created.statusCode).toBe(201);
    const task = created.json();
    expect(task).toMatchObject({
      title: validTask.title,
      status: 'todo',
      priority: 'high',
      dueDate: '2026-07-01',
    });

    // Read by id
    const fetched = await app.inject({
      method: 'GET',
      url: `/tasks/${task.id}`,
      headers: { cookie },
    });
    expect(fetched.statusCode).toBe(200);
    expect(fetched.json().id).toBe(task.id);

    // Update
    const patched = await app.inject({
      method: 'PATCH',
      url: `/tasks/${task.id}`,
      headers: { cookie },
      payload: { status: 'done', priority: 'low' },
    });
    expect(patched.statusCode).toBe(200);
    expect(patched.json().status).toBe('done');
    expect(patched.json().priority).toBe('low');
    // Untouched field is preserved.
    expect(patched.json().title).toBe(validTask.title);

    // Delete
    const removed = await app.inject({
      method: 'DELETE',
      url: `/tasks/${task.id}`,
      headers: { cookie },
    });
    expect(removed.statusCode).toBe(204);

    // Subsequent read is a 404.
    const gone = await app.inject({
      method: 'GET',
      url: `/tasks/${task.id}`,
      headers: { cookie },
    });
    expect(gone.statusCode).toBe(404);
  });

  it('rejects creating a task without a session (401)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/tasks',
      payload: validTask,
    });
    expect(response.statusCode).toBe(401);
  });

  it('rejects creating a task with an empty title (400)', async () => {
    const { cookie } = await signupAs(app, 'bad-input@example.com');
    const response = await app.inject({
      method: 'POST',
      url: '/tasks',
      headers: { cookie },
      payload: { ...validTask, title: '   ' },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error).toBe('ValidationError');
  });

  it('rejects an empty PATCH body (400, schema requires at least one field)', async () => {
    const { cookie } = await signupAs(app, 'empty-patch@example.com');
    const created = await app
      .inject({ method: 'POST', url: '/tasks', headers: { cookie }, payload: validTask })
      .then((r) => r.json());

    const response = await app.inject({
      method: 'PATCH',
      url: `/tasks/${created.id}`,
      headers: { cookie },
      payload: {},
    });
    expect(response.statusCode).toBe(400);
  });

  it('returns 404 for a non-existent id (no UUID-format leak)', async () => {
    const { cookie } = await signupAs(app, 'missing@example.com');
    const response = await app.inject({
      method: 'GET',
      url: '/tasks/00000000-0000-0000-0000-000000000000',
      headers: { cookie },
    });
    expect(response.statusCode).toBe(404);
  });
});
