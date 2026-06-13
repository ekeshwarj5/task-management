import { sql } from 'drizzle-orm';
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Enums

export const taskStatusEnum = pgEnum('task_status', ['todo', 'in_progress', 'done']);
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high']);
export const userRoleEnum = pgEnum('user_role', ['user', 'admin']);

// ---------------------------------------------------------------------------
// Tables

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 254 }).notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: userRoleEnum('role').notNull().default('user'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index('idx_users_email').on(table.email),
  }),
);

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description').notNull().default(''),
    status: taskStatusEnum('status').notNull().default('todo'),
    priority: taskPriorityEnum('priority').notNull().default('medium'),
    // Stored as DATE (no time component). Drizzle returns it as a string.
    dueDate: timestamp('due_date', { mode: 'string' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    // Multi-column index for the dominant list query: scoped by user, filtered
    // by status, sorted by createdAt desc.
    userStatusCreatedIdx: index('idx_tasks_user_status_created').on(
      table.userId,
      table.status,
      table.createdAt,
    ),
    userDueIdx: index('idx_tasks_user_due').on(table.userId, table.dueDate),
    userPriorityIdx: index('idx_tasks_user_priority').on(table.userId, table.priority),
    // ILIKE-friendly index on lower(title) for case-insensitive search.
    titleLowerIdx: index('idx_tasks_title_lower').on(sql`lower(${table.title})`),
  }),
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;
