import pg from "pg";
import { runMigrations } from "../src/migrate.js";

// Runs once before all tests in this workspace.
// 1. Connects to the admin DB ("postgres") and creates aajia_test if missing
// 2. Applies migrations to aajia_test
//
// Requires: `docker compose up postgres` (or equivalent) so Postgres is
// reachable at localhost:5432.

const TEST_DB = "aajia_test";
const ADMIN_URL =
  process.env.ADMIN_DATABASE_URL ??
  "postgres://aajia:aajia@localhost:5432/postgres";
const TEST_URL =
  process.env.TEST_DATABASE_URL ??
  `postgres://aajia:aajia@localhost:5432/${TEST_DB}`;

export async function setup(): Promise<void> {
  const admin = new pg.Pool({ connectionString: ADMIN_URL });
  try {
    const { rows } = await admin.query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS exists`,
      [TEST_DB],
    );
    if (!rows[0]?.exists) {
      // Identifier is hardcoded above, so this is safe to inline.
      await admin.query(`CREATE DATABASE "${TEST_DB}"`);
    }
  } finally {
    await admin.end();
  }

  await runMigrations(TEST_URL);
}

export async function teardown(): Promise<void> {
  // Leave the test DB around between runs so failures can be inspected.
  // `docker compose down -v` resets everything when you want a clean slate.
}
