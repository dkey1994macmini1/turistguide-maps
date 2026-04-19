import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/common/db/schema.ts",
  out: "./src/common/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});