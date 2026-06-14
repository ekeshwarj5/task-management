import { describe, expect, it } from 'vitest';
import { createTestApp, signupAs } from './helpers';

const app = createTestApp();

const create = async (cookie: string, overrides: Record<string, unknown>) => {
  const response = await app.inject({
    method: 'POST',
    url: '/tasks',
    headers: { cookie },
    payload: {
      title: 'Default',
      description: '',
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      ...overrides,
    },
  });
  if (response.statusCode !== 201) {
    throw new Error(`create failed (${response.statusCode}): ${response.body}`);
  }
  return response.json();
};

describe('GET /tasks — filter, search, sort, pagination', () => {
  it('filters by status', async () => {
    const { cookie } = await signupAs(app, 'filter@example.com');
    await create(cookie, { title: 'Open A', status: 'todo' });
    await create(cookie, { title: 'Open B', status: 'todo' });
    await create(cookie, { title: 'Closed A', status: 'done' });

    const open = await app.inject({
      method: 'GET',
      url: '/tasks?status=todo',
      headers: { cookie },
    });
    expect(open.json().total).toBe(2);
    expect(open.json().items.every((t: { status: string }) => t.status === 'todo')).toBe(true);
  });

  it('searches title by case-insensitive substring', async () => {
    const { cookie } = await signupAs(app, 'search@example.com');
    await create(cookie, { title: 'Write deployment notes' });
    await create(cookie, { title: 'Plan WRITE-once-read-many index' });
    await create(cookie, { title: 'Review staging deploy' });

    const response = await app.inject({
      method: 'GET',
      url: '/tasks?search=write',
      headers: { cookie },
    });
    expect(response.json().total).toBe(2);
    expect(
      response
        .json()
        .items.map((t: { title: string }) => t.title)
        .sort(),
    ).toEqual(['Plan WRITE-once-read-many index', 'Write deployment notes']);
  });

  it('sorts by priority desc (high → low)', async () => {
    const { cookie } = await signupAs(app, 'sort-priority@example.com');
    await create(cookie, { title: 'A low', priority: 'low' });
    await create(cookie, { title: 'B high', priority: 'high' });
    await create(cookie, { title: 'C medium', priority: 'medium' });

    const response = await app.inject({
      method: 'GET',
      url: '/tasks?sortBy=priority&sortDir=desc',
      headers: { cookie },
    });
    const priorities = response.json().items.map((t: { priority: string }) => t.priority);
    // Postgres enum sort order matches our declared enum order
    // (low < medium < high), so DESC gives high-first.
    expect(priorities).toEqual(['high', 'medium', 'low']);
  });

  it('sorts by dueDate asc, with nulls last (Postgres default)', async () => {
    const { cookie } = await signupAs(app, 'sort-due@example.com');
    await create(cookie, { title: 'No due date', dueDate: null });
    await create(cookie, { title: 'Earlier', dueDate: '2026-06-10' });
    await create(cookie, { title: 'Later', dueDate: '2026-12-31' });

    const response = await app.inject({
      method: 'GET',
      url: '/tasks?sortBy=dueDate&sortDir=asc',
      headers: { cookie },
    });
    const titles = response.json().items.map((t: { title: string }) => t.title);
    // ASC with default null-handling: nulls sort last on Postgres.
    expect(titles).toEqual(['Earlier', 'Later', 'No due date']);
  });

  it('paginates with bounded pageSize', async () => {
    const { cookie } = await signupAs(app, 'paginate@example.com');
    for (let i = 1; i <= 7; i += 1) {
      await create(cookie, { title: `T${String(i).padStart(2, '0')}` });
    }

    const page1 = await app.inject({
      method: 'GET',
      url: '/tasks?pageSize=3&page=1&sortBy=createdAt&sortDir=asc',
      headers: { cookie },
    });
    expect(page1.json().items).toHaveLength(3);
    expect(page1.json().total).toBe(7);

    const page2 = await app.inject({
      method: 'GET',
      url: '/tasks?pageSize=3&page=2&sortBy=createdAt&sortDir=asc',
      headers: { cookie },
    });
    expect(page2.json().items).toHaveLength(3);

    const page3 = await app.inject({
      method: 'GET',
      url: '/tasks?pageSize=3&page=3&sortBy=createdAt&sortDir=asc',
      headers: { cookie },
    });
    // 7 total → pages of 3,3,1.
    expect(page3.json().items).toHaveLength(1);
  });

  it('rejects pageSize > 100 (400)', async () => {
    const { cookie } = await signupAs(app, 'too-big@example.com');
    const response = await app.inject({
      method: 'GET',
      url: '/tasks?pageSize=1000',
      headers: { cookie },
    });
    expect(response.statusCode).toBe(400);
  });
});
