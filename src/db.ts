import { PGlite } from "@electric-sql/pglite";
import { tallyRequest, buildCollectionXml } from "./tally.js";
import { extractRecords } from "./clean.js";

// In-memory Postgres (WASM). No file path => data lives only for this process's lifetime.
const db = new PGlite();
let schemaReady: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = db.exec(`
      CREATE TABLE IF NOT EXISTS ledgers (
        name TEXT PRIMARY KEY,
        parent TEXT,
        closing_balance NUMERIC
      );
      CREATE TABLE IF NOT EXISTS groups (
        name TEXT PRIMARY KEY,
        parent TEXT
      );
      CREATE TABLE IF NOT EXISTS stock_items (
        name TEXT PRIMARY KEY,
        parent TEXT,
        closing_balance NUMERIC
      );
      CREATE TABLE IF NOT EXISTS vouchers (
        id SERIAL PRIMARY KEY,
        date TEXT,
        voucher_type TEXT,
        ledger TEXT,
        amount NUMERIC,
        narration TEXT
      );
    `).then(() => undefined);
  }
  await schemaReady;
}

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  return String(v);
}

async function fetchCollection(
  collectionName: string,
  type: string,
  fields: string[],
  recordTag: string
): Promise<Record<string, unknown>[]> {
  const xml = buildCollectionXml(collectionName, type, fields);
  const parsed = await tallyRequest(xml);
  return extractRecords(parsed, recordTag) as Record<string, unknown>[];
}

// Pulls ledgers, groups, stock items, and the last year of Day Book vouchers
// from Tally and loads them into the local SQL cache, replacing prior data.
export async function syncAll(): Promise<string> {
  await ensureSchema();

  const [ledgers, groups, stockItems] = await Promise.all([
    fetchCollection("Ledger", "Ledger", ["NAME", "PARENT", "CLOSINGBALANCE"], "LEDGER"),
    fetchCollection("Group", "Group", ["NAME", "PARENT"], "GROUP"),
    fetchCollection("Stock Item", "Stock Item", ["NAME", "PARENT", "CLOSINGBALANCE"], "STOCKITEM"),
  ]);

  await db.exec("BEGIN");
  try {
    await db.exec("DELETE FROM ledgers");
    for (const l of ledgers) {
      await db.query("INSERT INTO ledgers (name, parent, closing_balance) VALUES ($1, $2, $3)", [
        str(l.NAME),
        str(l.PARENT),
        num(l.CLOSINGBALANCE),
      ]);
    }

    await db.exec("DELETE FROM groups");
    for (const g of groups) {
      await db.query("INSERT INTO groups (name, parent) VALUES ($1, $2)", [
        str(g.NAME),
        str(g.PARENT),
      ]);
    }

    await db.exec("DELETE FROM stock_items");
    for (const s of stockItems) {
      await db.query(
        "INSERT INTO stock_items (name, parent, closing_balance) VALUES ($1, $2, $3)",
        [str(s.NAME), str(s.PARENT), num(s.CLOSINGBALANCE)]
      );
    }
    await db.exec("COMMIT");
  } catch (err) {
    await db.exec("ROLLBACK");
    throw err;
  }

  return (
    `Synced ${ledgers.length} ledgers, ${groups.length} groups, ` +
    `${stockItems.length} stock items into the local SQL cache. ` +
    `Vouchers are not bulk-synced (fetch via get_vouchers/get_ledger_vouchers per range) ` +
    `since Tally's Day Book export doesn't page well for large date spans.`
  );
}

const DDL_KEYWORDS = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)\b/i;

export async function runSql(sql: string): Promise<string> {
  await ensureSchema();

  const trimmed = sql.trim().replace(/;+\s*$/, "");
  if (!/^SELECT\b/i.test(trimmed)) {
    throw new Error("Only SELECT statements are allowed.");
  }
  if (DDL_KEYWORDS.test(trimmed)) {
    throw new Error("Only read-only SELECT statements are allowed.");
  }

  const result = await db.query(trimmed);
  return JSON.stringify(result.rows, null, 2);
}
