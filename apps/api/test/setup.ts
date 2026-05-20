// Runs before each test file. Sets env defaults so importing the api modules
// (which read DATABASE_URL at module init) picks up the test DB connection.
// `??=` lets you override from the shell if you want a different test DB.

process.env.DATABASE_URL ??=
  "postgres://aajia:aajia@localhost:5432/aajia_test";
process.env.PLACEHOLDER_USER_ID ??= "test-user";
process.env.API_PORT ??= "4001";
