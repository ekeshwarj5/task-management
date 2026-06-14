import type { FastifyInstance, FastifyReply } from 'fastify';
import type { ZodError } from 'zod';
import {
  CreateTaskSchema,
  ListTasksQuerySchema,
  UpdateTaskSchema,
  type Task,
} from '@task/shared';
import { db } from '../db/client';
import { TaskRepository } from '../repositories/task-repository';
import { requireAuth } from '../middleware/auth';
import type { TaskRow } from '../db/schema';

const sendValidationError = (reply: FastifyReply, error: ZodError) =>
  reply.code(400).send({
    error: 'ValidationError',
    issues: error.issues.map((i) => ({ path: i.path, message: i.message, code: i.code })),
  });

const notFound = (reply: FastifyReply, id: string) =>
  reply.code(404).send({ error: 'NotFound', message: `task ${id} not found` });

/**
 * Map a DB row to the shared Task contract. Drizzle returns Dates for
 * timestamp columns and the dueDate column as a string already; here
 * we serialise everything as JSON-friendly strings for the API surface.
 */
const toTask = (row: TaskRow): Task => ({
  id: row.id,
  userId: row.userId,
  title: row.title,
  description: row.description,
  status: row.status,
  priority: row.priority,
  // due_date is stored as a timestamp (mode:'string') so the driver
  // returns e.g. '2026-07-01 00:00:00'. Slice to YYYY-MM-DD so the
  // wire format matches the date-only contract in the shared schema.
  dueDate: row.dueDate ? row.dueDate.slice(0, 10) : null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const taskRoutes = async (app: FastifyInstance): Promise<void> => {
  const tasks = new TaskRepository(db);

  // Every route below this point requires a valid JWT cookie. Per-user
  // isolation is enforced via the userId column on every query.
  app.addHook('preHandler', requireAuth);

  // POST /tasks --------------------------------------------------------------
  app.post('/tasks', async (request, reply) => {
    const parsed = CreateTaskSchema.safeParse(request.body);
    if (!parsed.success) return sendValidationError(reply, parsed.error);

    const userId = request.user!.sub;
    const row = await tasks.insert({
      userId,
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status,
      priority: parsed.data.priority,
      dueDate: parsed.data.dueDate ?? null,
    });
    return reply.code(201).send(toTask(row));
  });

  // GET /tasks ---------------------------------------------------------------
  app.get('/tasks', async (request, reply) => {
    const parsed = ListTasksQuerySchema.safeParse(request.query);
    if (!parsed.success) return sendValidationError(reply, parsed.error);

    const userId = request.user!.sub;
    const result = await tasks.list({ userId, ...parsed.data });

    return {
      items: result.items.map(toTask),
      total: result.total,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    };
  });

  // GET /tasks/:id -----------------------------------------------------------
  app.get<{ Params: { id: string } }>('/tasks/:id', async (request, reply) => {
    const userId = request.user!.sub;
    const row = await tasks.findOwnedById(request.params.id, userId);
    if (!row) return notFound(reply, request.params.id);
    return toTask(row);
  });

  // PATCH /tasks/:id ---------------------------------------------------------
  app.patch<{ Params: { id: string } }>('/tasks/:id', async (request, reply) => {
    const parsed = UpdateTaskSchema.safeParse(request.body);
    if (!parsed.success) return sendValidationError(reply, parsed.error);

    const userId = request.user!.sub;
    const row = await tasks.updateOwned(request.params.id, userId, parsed.data);
    if (!row) return notFound(reply, request.params.id);
    return toTask(row);
  });

  // DELETE /tasks/:id --------------------------------------------------------
  app.delete<{ Params: { id: string } }>('/tasks/:id', async (request, reply) => {
    const userId = request.user!.sub;
    const removed = await tasks.deleteOwned(request.params.id, userId);
    if (!removed) return notFound(reply, request.params.id);
    return reply.code(204).send();
  });
};
