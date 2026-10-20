// Runs before every test file. Provides safe, fake configuration - never real secrets.
process.env.SESSION_SECRET = process.env.SESSION_SECRET_FOR_TESTS ?? "test-secret-test-secret-test-secret-0123456789";
process.env.APP_URL = "http://localhost:3000";
process.env.HEARTBEAT_TTL_SECONDS = "180";
process.env.MOBILE_VISIBLE_ROLES = process.env.MOBILE_VISIBLE_ROLES_FOR_TESTS ?? "ADMIN,STAFF";
process.env.THUMBNAIL_DIR = "./data/test-thumbnails";
process.env.NODE_ENV = "test";
// Unit tests never connect, but the env validator and the Prisma adapter want a connection string to exist.
process.env.DATABASE_URL ??= "postgres://unit-test:unit-test@127.0.0.1:1/unit_test";

// Integration tests talk to a DEDICATED test database. They refuse to run against the development database.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
