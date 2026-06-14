import { and, asc, desc, eq, ilike, sql } from 'drizzle-orm';
import type { Db } from '../db/client';
import { tasks, type NewTaskRow, type TaskRow } from '../db/schema';
import type { TaskSortField, SortDirection, TaskStatus } from '@task/shared';

export interface ListTasksFilter {
  userId: string;
  page: number;
  pageSize: number;
  status?: TaskStatus;
  search?: string;
  sortBy: TaskSortField;
  sortDir: SortDirection;
}

export interface ListTasksResult {
  items: TaskRow[];
  total: number;
}

const sortColumn = (field: TaskSortField) => {
  switch (field) {
    case 'createdAt':
      return tasks.createdAt;
    case 'dueDate':
      return tasks.dueDate;
    case 'priority':
      return tasks.priority;
  }
};

/**
 * Drizzle-backed task repository. Routes call these methods; the data
 * layer enforces ownership via the userId column on every query so a
 * caller can't accidentally fetch / mutate another user's row.
 */
export class TaskRepository {
  constructor(private readonly db: Db) {}

  async insert(row: NewTaskRow): Promise<TaskRow> {
    const [inserted] = await this.db.insert(tasks).values(row).returning();
    if (!inserted) throw new Error('Failed to insert task');
    return inserted;
  }

  async findOwnedById(id: string, userId: string): Promise<TaskRow | null> {
    const rows = await this.db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async updateOwned(
    id: string,
    userId: string,
    patch: Partial<Omit<TaskRow, 'id' | 'userId' | 'createdAt'>>,
  ): Promise<TaskRow | null> {
    const [updated] = await this.db
      .update(tasks)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();
    return updated ?? null;
  }

  async deleteOwned(id: string, userId: string): Promise<boolean> {
    const result = await this.db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning({ id: tasks.id });
    return result.length > 0;
  }

  async list(filter: ListTasksFilter): Promise<ListTasksResult> {
    const conditions = [eq(tasks.userId, filter.userId)];
    if (filter.status) conditions.push(eq(tasks.status, filter.status));
    if (filter.search) conditions.push(ilike(tasks.title, `%${filter.search}%`));
    const where = and(...conditions);

    const orderBy =
      filter.sortDir === 'asc' ? asc(sortColumn(filter.sortBy)) : desc(sortColumn(filter.sortBy));

    const items = await this.db
      .select()
      .from(tasks)
      .where(where)
      .orderBy(orderBy, asc(tasks.id))
      .limit(filter.pageSize)
      .offset((filter.page - 1) * filter.pageSize);

    const totalRow = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(where);

    return { items, total: totalRow[0]?.count ?? 0 };
  }
}
