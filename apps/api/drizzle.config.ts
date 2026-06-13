import type { Config } from 'drizzle-kit';

const databaseUrl = process.env.DATABASE_URL ?? 'postgres://task:task@localhost:5432/task_management';

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: databaseUrl },
  strict: true,
  verbose: true,
} satisfies Config;
