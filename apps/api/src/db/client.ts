import pg from 'pg';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { config } from '../config';

const { Pool } = pg;

/**
 * One pg pool per process; Drizzle wraps it for type-safe queries.
 * Connection limit kept modest by default — production should override
 * via env if the deployment can sustain more.
 */
export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
});

export const db: NodePgDatabase = drizzle(pool);

export type Db = typeof db;
