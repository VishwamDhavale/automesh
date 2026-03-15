import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString = process.env.DATABASE_URL ?? 'postgresql://automesh:automesh@localhost:5433/automesh';

const client = postgres(connectionString);
export const db = drizzle(client, { schema });

export { schema };
