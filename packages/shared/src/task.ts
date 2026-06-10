import { z } from 'zod';

export const TASK_STATUSES = ['todo', 'in_progress', 'done'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

// ISO date string YYYY-MM-DD (no time component — due dates are calendar days).
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'dueDate must be in YYYY-MM-DD format')
  .refine((s) => !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime()), 'invalid calendar date');

export const TaskSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).default(''),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  dueDate: isoDate.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Task = z.infer<typeof TaskSchema>;

/**
 * Payload to create a task. id, userId, timestamps are server-assigned.
 * dueDate is optional and may be null. Status defaults to 'todo' and
 * priority to 'medium' if the caller omits them.
 */
export const CreateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).optional().default(''),
    status: z.enum(TASK_STATUSES).optional().default('todo'),
    priority: z.enum(TASK_PRIORITIES).optional().default('medium'),
    dueDate: isoDate.nullable().optional(),
  })
  .strict();

export type CreateTask = z.infer<typeof CreateTaskSchema>;

/**
 * Partial update. At least one field must be provided — an empty PATCH
 * is almost certainly a caller bug, and an explicit refine surfaces it
 * instead of pretending the no-op was successful.
 */
export const UpdateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    status: z.enum(TASK_STATUSES).optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    dueDate: isoDate.nullable().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'update payload must contain at least one field',
  });

export type UpdateTask = z.infer<typeof UpdateTaskSchema>;

// ---------------------------------------------------------------------------
// List query

export const TASK_SORT_FIELDS = ['createdAt', 'dueDate', 'priority'] as const;
export type TaskSortField = (typeof TASK_SORT_FIELDS)[number];

export const SORT_DIRECTIONS = ['asc', 'desc'] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

export const ListTasksQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(TASK_STATUSES).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  sortBy: z.enum(TASK_SORT_FIELDS).default('createdAt'),
  sortDir: z.enum(SORT_DIRECTIONS).default('desc'),
});

export type ListTasksQuery = z.infer<typeof ListTasksQuerySchema>;

export interface ListTasksResult {
  items: Task[];
  total: number;
  page: number;
  pageSize: number;
}
