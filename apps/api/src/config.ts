function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

export const config = {
  databaseUrl: required("DATABASE_URL"),
  placeholderUserId: required("PLACEHOLDER_USER_ID"),
  port: Number.parseInt(process.env.API_PORT ?? "4000", 10),
};
