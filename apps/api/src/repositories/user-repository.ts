import { eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { users, type NewUserRow, type UserRow } from '../db/schema';

/**
 * Thin Drizzle-backed access to the users table. Routes call these
 * methods instead of touching the ORM directly so swapping storage
 * later (or unit-testing with a fake) is a one-place change.
 */
export class UserRepository {
  constructor(private readonly db: Db) {}

  async findByEmail(email: string): Promise<UserRow | null> {
    const rows = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return rows[0] ?? null;
  }

  async findById(id: string): Promise<UserRow | null> {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async insert(row: NewUserRow): Promise<UserRow> {
    const [inserted] = await this.db.insert(users).values(row).returning();
    if (!inserted) throw new Error('Failed to insert user');
    return inserted;
  }
}
