import { mkdirSync } from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import {
  accountSummary,
  canIdentify,
  monthKey,
  type AccountSummary,
} from "./quota";

const globalForDb = globalThis as unknown as { easesellDb?: DatabaseSync };

export function database(): DatabaseSync {
  if (globalForDb.easesellDb) return globalForDb.easesellDb;
  const directory = path.join(process.cwd(), "data");
  mkdirSync(directory, { recursive: true });
  const db = new DatabaseSync(path.join(directory, "easesell.sqlite"));
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS listings (
      user_id TEXT NOT NULL,
      month TEXT NOT NULL,
      draft_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, draft_id)
    );
    CREATE TABLE IF NOT EXISTS subscriptions (
      user_id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      original_transaction_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      environment TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
  globalForDb.easesellDb = db;
  return db;
}

export function ensureUser(userId: string): void {
  database()
    .prepare("INSERT OR IGNORE INTO users (id, created_at) VALUES (?, ?)")
    .run(userId, new Date().toISOString());
}

export function isSubscribed(userId: string, now = new Date()): boolean {
  const row = database()
    .prepare("SELECT expires_at FROM subscriptions WHERE user_id = ?")
    .get(userId) as { expires_at: string } | undefined;
  if (!row) return false;
  return Date.parse(row.expires_at) > now.getTime();
}

export function usageCount(userId: string, month = monthKey()): number {
  const row = database()
    .prepare(
      "SELECT COUNT(*) AS n FROM listings WHERE user_id = ? AND month = ?"
    )
    .get(userId, month) as { n: number };
  return Number(row.n);
}

export function readAccount(userId: string, now = new Date()): AccountSummary {
  return accountSummary(
    usageCount(userId, monthKey(now)),
    isSubscribed(userId, now),
    monthKey(now)
  );
}

export type Reservation =
  | { ok: true; already: boolean; account: AccountSummary }
  | { ok: false; account: AccountSummary };

export function reserveListing(
  userId: string,
  draftId: string,
  now = new Date()
): Reservation {
  const db = database();
  const month = monthKey(now);
  db.exec("BEGIN IMMEDIATE");
  try {
    const existing = db
      .prepare("SELECT draft_id FROM listings WHERE user_id = ? AND draft_id = ?")
      .get(userId, draftId);
    if (existing) {
      db.exec("COMMIT");
      return { ok: true, already: true, account: readAccount(userId, now) };
    }
    const subscribed = isSubscribed(userId, now);
    const used = usageCount(userId, month);
    if (!canIdentify(used, subscribed)) {
      db.exec("ROLLBACK");
      return {
        ok: false,
        account: accountSummary(used, subscribed, month),
      };
    }
    db.prepare(
      "INSERT INTO listings (user_id, month, draft_id, created_at) VALUES (?, ?, ?, ?)"
    ).run(userId, month, draftId, now.toISOString());
    db.exec("COMMIT");
    return { ok: true, already: false, account: readAccount(userId, now) };
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* the transaction is already closed */
    }
    throw error;
  }
}

export function releaseListing(userId: string, draftId: string): void {
  database()
    .prepare("DELETE FROM listings WHERE user_id = ? AND draft_id = ?")
    .run(userId, draftId);
}

export function saveSubscription(input: {
  userId: string;
  productId: string;
  originalTransactionId: string;
  expiresAt: string;
  environment: string;
}): void {
  database()
    .prepare(
      `INSERT INTO subscriptions (
         user_id, product_id, original_transaction_id, expires_at, environment, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         product_id = excluded.product_id,
         original_transaction_id = excluded.original_transaction_id,
         expires_at = excluded.expires_at,
         environment = excluded.environment,
         updated_at = excluded.updated_at`
    )
    .run(
      input.userId,
      input.productId,
      input.originalTransactionId,
      input.expiresAt,
      input.environment,
      new Date().toISOString()
    );
}
