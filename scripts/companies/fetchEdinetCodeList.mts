/**
 * EDINET コードリストから企業マスタのシードデータを作る取り込みスクリプト。
 *
 *   pnpm companies:fetch
 *
 * 金融庁 EDINET が公開しているコードリスト（zip 内の Shift_JIS CSV）を取得し、
 * 内国法人だけを抜き出して prisma/seed/companies.json を書き出す。出力はリポジトリに
 * コミットするため、シード（prisma/seed.ts）はネットワークなしで再現できる。
 *
 * 依存を足さずに済むよう、zip 展開は zlib、文字コード変換は TextDecoder で行う。
 * Node の型ストリップで直接実行するので、このファイルは相対 import のみを使う
 * （`@/` エイリアスは解決されない）。
 */
import { inflateRawSync } from "node:zlib";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE_URL =
  "https://disclosure2dl.edinet-fsa.go.jp/searchdocument/codelist/Edinetcode.zip";
const OUTPUT_PATH = fileURLToPath(
  new URL("../../prisma/seed/companies.json", import.meta.url),
);

/** 出力する 1 社分。searchKey はシード時にドメインの正規化関数で算出する。 */
type SeedCompany = {
  edinetCode: string;
  name: string;
  nameKana: string | null;
  corporateNumber: string | null;
  /** 4 桁の証券コード。非上場なら null。 */
  securitiesCode: string | null;
  isListed: boolean;
  industryLabel: string | null;
  /** 資本金（百万円）。候補の並び順で「規模の大きい企業を先に」出すために使う。 */
  capitalMillionYen: number | null;
};

/* ── zip ── */

/** 単一ファイルの zip を展開する（中央ディレクトリを読むので data descriptor でも安全）。 */
function extractSingleFile(zip: Buffer): Buffer {
  // End of Central Directory を末尾から探す（コメント長は可変のため後ろから走査する）。
  let eocd = -1;
  for (let i = zip.length - 22; i >= 0; i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("zip: End of Central Directory が見つかりません");

  const entryCount = zip.readUInt16LE(eocd + 10);
  if (entryCount < 1) throw new Error("zip: エントリがありません");

  const centralDir = zip.readUInt32LE(eocd + 16);
  if (zip.readUInt32LE(centralDir) !== 0x02014b50) {
    throw new Error("zip: 中央ディレクトリの署名が不正です");
  }

  const method = zip.readUInt16LE(centralDir + 10);
  const compressedSize = zip.readUInt32LE(centralDir + 20);
  const localHeader = zip.readUInt32LE(centralDir + 42);
  if (zip.readUInt32LE(localHeader) !== 0x04034b50) {
    throw new Error("zip: ローカルヘッダの署名が不正です");
  }

  // データ本体はローカルヘッダ(30 バイト)＋ファイル名＋拡張フィールドの直後から始まる。
  const dataStart =
    localHeader + 30 + zip.readUInt16LE(localHeader + 26) + zip.readUInt16LE(localHeader + 28);
  const body = zip.subarray(dataStart, dataStart + compressedSize);

  if (method === 0) return Buffer.from(body); // 無圧縮
  if (method === 8) return inflateRawSync(body); // deflate
  throw new Error(`zip: 未対応の圧縮方式です (method=${method})`);
}

/* ── CSV ── */

/** RFC 4180 相当の CSV パーサ。値に「,」を含む列（英字社名）があるため自前で解く。 */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (ch !== "\r") {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/* ── 変換 ── */

/** 表示用に整える（全角英数を半角へ、連続空白を 1 つに）。 */
function cleanName(raw: string): string {
  return raw.normalize("NFKC").replace(/\s+/g, " ").trim();
}

/**
 * EDINET の証券コードは末尾 0 詰めの 5 桁。一般に使う 4 桁へ戻す。
 * 5 桁の英数コード（例: 135A0）も同じ規則で扱える。
 */
function toSecuritiesCode(raw: string): string | null {
  const value = raw.trim();
  if (value === "") return null;
  return value.length === 5 && value.endsWith("0") ? value.slice(0, 4) : value;
}

/** 資本金（百万円）。空欄・数値でない行は null。 */
function toCapital(raw: string): number | null {
  const value = Number(raw.trim().replace(/,/g, ""));
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** 同じ法人番号の重複（商号変更後に旧コードが残る等）から 1 件を選ぶ優先度。 */
function priority(company: SeedCompany & { isFiler: boolean }): number {
  return (company.isListed ? 4 : 0) + (company.isFiler ? 2 : 0);
}

const EXPECTED_COLUMNS = 13;
const COLUMN = {
  edinetCode: 0,
  submitterKind: 1,
  listing: 2,
  capital: 4,
  name: 6,
  nameKana: 8,
  industry: 10,
  securitiesCode: 11,
  corporateNumber: 12,
} as const;

async function main(): Promise<void> {
  console.log(`取得中: ${SOURCE_URL}`);
  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`ダウンロードに失敗しました: HTTP ${response.status}`);
  }

  const csvBytes = extractSingleFile(Buffer.from(await response.arrayBuffer()));
  // EDINET の CSV は Windows-31J。WHATWG の "shift_jis" ラベルが CP932 に対応する。
  const rows = parseCsv(new TextDecoder("shift_jis").decode(csvBytes));

  // 1 行目はダウンロード日と件数のメタ行。2 行目が見出し。
  const header = rows[1];
  if (!header || header.length !== EXPECTED_COLUMNS) {
    throw new Error(
      `列構成が変わっています（${header?.length ?? 0} 列）。COLUMN の対応を見直してください。`,
    );
  }

  const byCorporateNumber = new Map<string, SeedCompany & { isFiler: boolean }>();
  const companies: (SeedCompany & { isFiler: boolean })[] = [];

  for (const row of rows.slice(2)) {
    if (row.length !== EXPECTED_COLUMNS) continue;
    const submitterKind = row[COLUMN.submitterKind]!;
    // 個人・外国法人・外国政府は面接の候補にならないので落とす。
    if (!submitterKind.startsWith("内国法人")) continue;

    const name = cleanName(row[COLUMN.name]!);
    if (name === "") continue;

    const corporateNumber = row[COLUMN.corporateNumber]!.trim() || null;
    const company = {
      edinetCode: row[COLUMN.edinetCode]!.trim(),
      name,
      nameKana: cleanName(row[COLUMN.nameKana]!) || null,
      corporateNumber,
      securitiesCode: toSecuritiesCode(row[COLUMN.securitiesCode]!),
      isListed: row[COLUMN.listing]!.trim() === "上場",
      industryLabel: row[COLUMN.industry]!.trim() || null,
      capitalMillionYen: toCapital(row[COLUMN.capital]!),
      isFiler: submitterKind === "内国法人・組合",
    };

    // 同一法人番号が複数コードで載ることがある（商号変更など）。上場・提出義務者を優先。
    if (corporateNumber !== null) {
      const existing = byCorporateNumber.get(corporateNumber);
      if (existing !== undefined) {
        if (priority(company) > priority(existing)) {
          Object.assign(existing, company);
        }
        continue;
      }
      byCorporateNumber.set(corporateNumber, company);
    }
    companies.push(company);
  }

  const output = {
    source: "EDINET コードリスト（金融庁）",
    sourceUrl: SOURCE_URL,
    fetchedAt: new Date().toISOString().slice(0, 10),
    companies: companies.map((company): SeedCompany => ({
      edinetCode: company.edinetCode,
      name: company.name,
      nameKana: company.nameKana,
      corporateNumber: company.corporateNumber,
      securitiesCode: company.securitiesCode,
      isListed: company.isListed,
      industryLabel: company.industryLabel,
      capitalMillionYen: company.capitalMillionYen,
    })),
  };

  // 1 社 1 行で書き出す（差分が読める形にするため）。
  const body = output.companies.map((company) => `    ${JSON.stringify(company)}`).join(",\n");
  const json = `{
  "source": ${JSON.stringify(output.source)},
  "sourceUrl": ${JSON.stringify(output.sourceUrl)},
  "fetchedAt": ${JSON.stringify(output.fetchedAt)},
  "companies": [
${body}
  ]
}
`;

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, json, "utf8");
  console.log(`${output.companies.length} 社を書き出しました: ${OUTPUT_PATH}`);
}

await main();
