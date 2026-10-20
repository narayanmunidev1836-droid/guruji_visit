import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.mjs",
  },
  datasource: {
    // DIRECT_URL (session-mode / direct connection) is for migrations; a transaction-mode pooler (pgbouncer) breaks them.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
    // Only needed for `prisma migrate dev` on the embedded `prisma dev` server (it cannot create temp databases).
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
