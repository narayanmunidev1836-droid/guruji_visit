import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 requires a driver adapter. The client is cached on globalThis so dev hot-reload does not
// open a new connection pool on every edit.
function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis;

export const db = globalForPrisma.__guruji_prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__guruji_prisma = db;
}
