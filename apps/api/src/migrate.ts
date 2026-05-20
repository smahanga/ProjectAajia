import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const here = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(here, "../migrations");

export async function runMigrations(databaseUrl: string): Promise<void> {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    const allFiles = await readdir(MIGRATIONS_DIR);
    const sqlFiles = allFiles.filter((f) => f.endsWith(".sql")).sort();

    const appliedRes = await pool.query<{ name: string }>(
      "SELECT name FROM _migrations",
    );
    const applied = new Set(appliedRes.rows.map((r) => r.name));

    for (const file of sqlFiles) {
      if (applied.has(file)) {
        console.log(`[migrate] skip   ${file}`);
        continue;
      }
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf-8");
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query("INSERT INTO _migrations (name) VALUES ($1)", [
          file,
        ]);
        await client.query("COMMIT");
        console.log(`[migrate] apply  ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }
  console.log("[migrate] done");
}

// CLI entry: only run when invoked directly (e.g., `tsx src/migrate.ts`),
// not when imported by tests.
const invokedDirectly =
  process.argv[1] !== undefined &&
  import.meta.url === `file://${process.argv[1]}`;

if (invokedDirectly) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  runMigrations(url).catch((err: unknown) => {
    console.error("[migrate] failed:", err);
    process.exit(1);
  });
}
