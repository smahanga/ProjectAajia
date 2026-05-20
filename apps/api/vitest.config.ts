import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./test/globalSetup.ts"],
    setupFiles: ["./test/setup.ts"],
    // Sequential single-fork execution: tests share one Postgres test DB
    // and TRUNCATE between cases, so parallel runs would race.
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    include: ["src/**/*.test.ts"],
  },
});
