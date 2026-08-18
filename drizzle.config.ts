import { defineConfig } from "drizzle-kit";

// NOTE: do NOT throw when DATABASE_URL is unset — build tools (Railway,
// Nixpacks, local `npm run build`) load this file and must not crash. The
// Dockerfile guards migration runs behind `if [ -n "$DATABASE_URL" ]`.
const url = process.env.DATABASE_URL || "postgres://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url },
});
