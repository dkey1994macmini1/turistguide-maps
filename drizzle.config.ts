import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/adapters/db/schema.ts",
  out: "./src/adapters/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});