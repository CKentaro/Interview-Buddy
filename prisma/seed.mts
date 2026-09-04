/**
 * 企業マスタ（Company）のシード。
 *
 *   pnpm db:seed
 *
 * prisma/seed/companies.json（EDINET コードリストから生成。pnpm companies:fetch で更新）
 * を読み、edinetCode をキーに upsert する。何度実行しても同じ結果になる。
 *
 * Prisma Client ではなく pg を直接使う。生成される Prisma Client は拡張子なしの相対
 * import を含む TypeScript のため、Node の型ストリップだけでは読み込めず、seed の
 * ためだけに TS ローダを依存へ足したくないため。
 *
 * EDINET から消えた企業（合併・上場廃止など）は削除しない。過去の面接練習が
 * 参照している可能性があり、消しても検索性以外に得るものがないため。
 */
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { normalizeCompanyName } from "../src/domain/company/services/normalizeCompanyName.ts";

type SeedCompany = {
  edinetCode: string;
  name: string;
  nameKana: string | null;
  corporateNumber: string | null;
  securitiesCode: string | null;
  isListed: boolean;
  industryLabel: string | null;
  capitalMillionYen: number | null;
};

const DATA_PATH = fileURLToPath(new URL("./seed/companies.json", import.meta.url));
/** 1 文あたりの行数。10 列 × 500 行 = 5,000 でも PostgreSQL のパラメータ上限に余裕がある。 */
const BATCH_SIZE = 500;

async function main(): Promise<void> {
  const connectionString = process.env["DATABASE_URL"];
  if (!connectionString) {
    throw new Error("DATABASE_URL が未設定です（pnpm db:seed から実行してください）");
  }

  const raw = JSON.parse(await readFile(DATA_PATH, "utf8")) as {
    source: string;
    fetchedAt: string;
    companies: SeedCompany[];
  };

  // 正規化して空になる社名は検索できないので落とす（「株式会社」だけ等）。
  const rows = raw.companies
    .map((company) => ({ ...company, searchKey: normalizeCompanyName(company.name) }))
    .filter((company) => company.searchKey !== "");

  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
      const batch = rows.slice(offset, offset + BATCH_SIZE);
      const values: unknown[] = [];
      const placeholders = batch.map((company) => {
        // id は新規行のときだけ使われる（既存行は edinetCode 一致で更新される）。
        values.push(
          randomUUID(),
          company.edinetCode,
          company.corporateNumber,
          company.name,
          company.nameKana,
          company.searchKey,
          company.securitiesCode,
          company.isListed,
          company.industryLabel,
          company.capitalMillionYen,
        );
        const base = values.length - 10;
        return `(${Array.from({ length: 10 }, (_, i) => `$${base + i + 1}`).join(", ")})`;
      });

      await client.query(
        `INSERT INTO "Company" ("id", "edinetCode", "corporateNumber", "name", "nameKana", "searchKey", "securitiesCode", "isListed", "industryLabel", "capitalMillionYen")
         VALUES ${placeholders.join(", ")}
         ON CONFLICT ("edinetCode") DO UPDATE SET
           "corporateNumber" = EXCLUDED."corporateNumber",
           "name" = EXCLUDED."name",
           "nameKana" = EXCLUDED."nameKana",
           "searchKey" = EXCLUDED."searchKey",
           "securitiesCode" = EXCLUDED."securitiesCode",
           "isListed" = EXCLUDED."isListed",
           "industryLabel" = EXCLUDED."industryLabel",
           "capitalMillionYen" = EXCLUDED."capitalMillionYen"`,
        values,
      );
    }

    const { rows: counted } = await client.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM "Company"',
    );
    console.log(
      `企業マスタを更新しました（投入 ${rows.length} 件 / テーブル合計 ${counted[0]?.count ?? "?"} 件、出典: ${raw.source} ${raw.fetchedAt} 時点）`,
    );
  } finally {
    await client.end();
  }
}

await main();
