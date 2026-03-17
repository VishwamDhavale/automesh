/// <reference types="node" />
import type { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://automesh:automesh@localhost:5433/automesh",
  },
} satisfies ReturnType<typeof defineConfig>;
