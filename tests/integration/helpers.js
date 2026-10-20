import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "dotenv";

// Integration tests need a DEDICATED, disposable PostgreSQL database:
//   TEST_DATABASE_URL=postgres://... npx vitest run tests/integration
// Every test starts by TRUNCATING all tables, so they refuse to run against the development database.
export const HAS_DB = Boolean(process.env.TEST_DATABASE_URL);

function stripQuery(url) {
  return String(url ?? "").split("?")[0];
}

if (HAS_DB) {
  try {
    const dev = parse(readFileSync(path.resolve(process.cwd(), ".env")));
    if (dev.DATABASE_URL && stripQuery(dev.DATABASE_URL) === stripQuery(process.env.TEST_DATABASE_URL)) {
      throw new Error("TEST_DATABASE_URL points at the development database from .env. Use a separate database.");
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

export async function getDb() {
  return (await import("@/lib/db")).db;
}

export async function resetDb(db) {
  await db.$executeRawUnsafe(
    'TRUNCATE TABLE "AuditLog","ScanJob","IndexerToken","Photo","VisitHaribhagat","Visit","Haribhagat","Event","HardDisk","User" RESTART IDENTITY CASCADE',
  );
}

let counter = 0;

export async function makeUser(db, role = "STAFF", overrides = {}) {
  counter += 1;
  return db.user.create({
    data: {
      name: `${role} user ${counter}`,
      email: `${role.toLowerCase()}${counter}-${Date.now()}@example.test`,
      passwordHash: "x",
      role,
      ...overrides,
    },
  });
}

export const IDENTIFIER = "11111111-2222-3333-4444-555555555555";

export async function makeDisk(db, labelName, overrides = {}) {
  const { diskLabelKey } = await import("@/lib/normalize");
  return db.hardDisk.create({
    data: { labelName, labelKey: diskLabelKey(labelName), stableIdentifier: IDENTIFIER, ...overrides },
  });
}

export async function makeEvent(db, name, overrides = {}) {
  const { eventNameKey } = await import("@/lib/normalize");
  return db.event.create({ data: { name, nameKey: eventNameKey(name), ...overrides } });
}

export async function makePerson(db, overrides = {}) {
  const { makeDupKey } = await import("@/lib/normalize");
  const data = { name: "Ramesh", fatherName: "Kanji", surname: "Patel", gam: "Vadodara", jillo: "Vadodara", ...overrides };
  return db.haribhagat.create({ data: { ...data, dupKey: makeDupKey(data) } });
}

export const day = (iso) => new Date(`${iso}T00:00:00.000Z`);
