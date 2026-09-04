import "dotenv/config";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ path: ".env.local", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // 企業マスタ（Company）の投入。生成された Prisma Client は素の Node では
    // 読めないため、seed は pg を直接使う（prisma/seed.mts の冒頭を参照）。
    seed: "node prisma/seed.mts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
