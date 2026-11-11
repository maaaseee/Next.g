/**
 * PostgreSQL Database Connection and Schema Initialization.
 * 
 * Sources:
 * - postgres (porsager): https://github.com/porsager/postgres
 * - Supabase / Neon connection string compatibility
 */

import postgres from 'postgres';
import { ENV } from '../config/env';
import { runMigrations } from './migrate';

export type SqlClient = ReturnType<typeof postgres>;

let sqlInstance: SqlClient | null = null;

export async function initDatabase(customUrl?: string): Promise<SqlClient> {
  if (sqlInstance && !customUrl) {
    return sqlInstance;
  }

  const connectionString = customUrl || ENV.DATABASE_URL;

  // Determine if SSL is needed (Neon, Supabase, Azure, AWS require SSL; local docker usually does not)
  const isSsl =
    connectionString.includes('sslmode=require') ||
    connectionString.includes('neon.tech') ||
    connectionString.includes('supabase.co') ||
    connectionString.includes('postgres.database.azure.com') ||
    ENV.NODE_ENV === 'production';

  const sql = postgres(connectionString, {
    ssl: isSsl ? 'require' : false,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  // Run versioned migrations safely with PostgreSQL advisory lock
  await runMigrations(sql);

  if (!customUrl) {
    sqlInstance = sql;
  }

  return sql;
}

export function getDatabase(): SqlClient {
  if (!sqlInstance) {
    // If called before await initDatabase(), lazy instantiate default
    const connectionString = ENV.DATABASE_URL;
    const isSsl = connectionString.includes('sslmode=require') || connectionString.includes('neon.tech') || connectionString.includes('supabase.co');
    sqlInstance = postgres(connectionString, {
      ssl: isSsl ? 'require' : false,
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return sqlInstance;
}

export async function closeDatabase(): Promise<void> {
  if (sqlInstance) {
    await sqlInstance.end();
    sqlInstance = null;
  }
}

