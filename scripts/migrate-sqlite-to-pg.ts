/**
 * One-off migration: copy every row from the legacy better-sqlite3 database
 * (`data/spending.db`) into Neon Postgres via Drizzle.
 *
 * Usage:
 *   npm run db:migrate:data                 # reads ./data/spending.db
 *   SQLITE_PATH=/path/to.db npm run db:migrate:data
 *
 * Requirements:
 *   - DATABASE_URL set (loaded from .env.local, same as drizzle-kit).
 *   - TOKEN_ENC_KEY set (bank tokens are encrypted at rest on the way in).
 *   - The Postgres schema already applied (`npm run db:migrate`).
 *
 * The copy is idempotent: rows are upserted on their primary key, so re-running
 * the script is safe and will refresh any rows that changed in SQLite.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import Database from "better-sqlite3";
import { sql } from "drizzle-orm";

// Load secrets the same way drizzle.config.ts does, before importing anything
// that reads DATABASE_URL / TOKEN_ENC_KEY at module load time.
config({ path: ".env.local" });

async function main() {
  const sqlitePath = process.env.SQLITE_PATH ?? path.join("data", "spending.db");
  if (!existsSync(sqlitePath)) {
    throw new Error(`SQLite database not found at ${sqlitePath}`);
  }

  // Imported lazily so DATABASE_URL is populated before db-client runs.
  const { db, schema } = await import("../src/lib/db-client");
  const { encryptToken } = await import("../src/lib/crypto");

  const sqlite = new Database(sqlitePath, { readonly: true, fileMustExist: true });
  sqlite.pragma("journal_mode = WAL");

  const rows = <T>(table: string): T[] =>
    sqlite.prepare(`SELECT * FROM ${table}`).all() as T[];

  // Chunked inserts keep us well under Postgres' 65535 bound-parameter limit
  // and avoid oversized single statements.
  async function insertAll<T>(
    label: string,
    data: T[],
    run: (chunk: T[]) => Promise<unknown>,
  ) {
    if (data.length === 0) {
      console.log(`  ${label}: 0 rows (nothing to copy)`);
      return;
    }
    const CHUNK = 200;
    let done = 0;
    for (let i = 0; i < data.length; i += CHUNK) {
      const chunk = data.slice(i, i + CHUNK);
      await run(chunk);
      done += chunk.length;
    }
    console.log(`  ${label}: ${done} rows copied`);
  }

  type UserRow = {
    id: string;
    email: string | null;
    name: string | null;
    image: string | null;
    created_at: number;
  };
  type AuthStateRow = {
    state: string;
    user_id: string | null;
    created_at: number;
  };
  type ConnectionRow = {
    id: string;
    user_id: string | null;
    provider: string | null;
    access_token: string | null;
    refresh_token: string | null;
    expires_at: number | null;
    connected_at: number | null;
  };
  type AccountRow = {
    uid: string;
    user_id: string | null;
    bank: string | null;
    name: string | null;
    iban: string | null;
    currency: string | null;
    kind: string | null;
    logo: string | null;
    balance: number | null;
    balance_currency: string | null;
    balance_updated_at: number | null;
    connection_id: string | null;
    connected_at: number | null;
    last_synced_at: number | null;
  };
  type CategoryRuleRow = {
    user_id: string;
    match_key: string;
    category: string;
    example: string | null;
    created_at: number;
  };
  type TransactionRow = {
    id: string;
    user_id: string | null;
    account_uid: string;
    booking_date: string | null;
    amount: number;
    currency: string | null;
    direction: string;
    description: string | null;
    category: string | null;
    is_internal: number;
    raw: string | null;
    created_at: number;
  };
  type BudgetRow = {
    user_id: string;
    category: string;
    monthly_limit: number;
    updated_at: number;
  };

  console.log(`Migrating ${sqlitePath} -> Neon Postgres\n`);

  await insertAll(
    "users",
    rows<UserRow>("users").map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      image: r.image,
      createdAt: r.created_at,
    })),
    (chunk) =>
      db
        .insert(schema.users)
        .values(chunk)
        .onConflictDoUpdate({
          target: schema.users.id,
          set: {
            email: sqlExcluded("email"),
            name: sqlExcluded("name"),
            image: sqlExcluded("image"),
            createdAt: sqlExcluded("created_at"),
          },
        }),
  );

  await insertAll(
    "auth_states",
    rows<AuthStateRow>("auth_states").map((r) => ({
      state: r.state,
      userId: r.user_id,
      createdAt: r.created_at,
    })),
    (chunk) =>
      db
        .insert(schema.authStates)
        .values(chunk)
        .onConflictDoUpdate({
          target: schema.authStates.state,
          set: {
            userId: sqlExcluded("user_id"),
            createdAt: sqlExcluded("created_at"),
          },
        }),
  );

  await insertAll(
    "connections",
    // Legacy SQLite tokens are plaintext; encrypt them so they land encrypted
    // at rest in Postgres, matching what the app writes on new connections.
    rows<ConnectionRow>("connections").map((r) => ({
      id: r.id,
      userId: r.user_id,
      provider: r.provider,
      accessToken: encryptToken(r.access_token),
      refreshToken: encryptToken(r.refresh_token),
      expiresAt: r.expires_at,
      connectedAt: r.connected_at,
    })),
    (chunk) =>
      db
        .insert(schema.connections)
        .values(chunk)
        .onConflictDoUpdate({
          target: schema.connections.id,
          set: {
            userId: sqlExcluded("user_id"),
            provider: sqlExcluded("provider"),
            accessToken: sqlExcluded("access_token"),
            refreshToken: sqlExcluded("refresh_token"),
            expiresAt: sqlExcluded("expires_at"),
            connectedAt: sqlExcluded("connected_at"),
          },
        }),
  );

  await insertAll(
    "accounts",
    rows<AccountRow>("accounts").map((r) => ({
      uid: r.uid,
      userId: r.user_id,
      bank: r.bank,
      name: r.name,
      iban: r.iban,
      currency: r.currency,
      kind: r.kind,
      logo: r.logo,
      balance: r.balance,
      balanceCurrency: r.balance_currency,
      balanceUpdatedAt: r.balance_updated_at,
      connectionId: r.connection_id,
      connectedAt: r.connected_at,
      lastSyncedAt: r.last_synced_at,
    })),
    (chunk) =>
      db
        .insert(schema.accounts)
        .values(chunk)
        .onConflictDoUpdate({
          target: schema.accounts.uid,
          set: {
            userId: sqlExcluded("user_id"),
            bank: sqlExcluded("bank"),
            name: sqlExcluded("name"),
            iban: sqlExcluded("iban"),
            currency: sqlExcluded("currency"),
            kind: sqlExcluded("kind"),
            logo: sqlExcluded("logo"),
            balance: sqlExcluded("balance"),
            balanceCurrency: sqlExcluded("balance_currency"),
            balanceUpdatedAt: sqlExcluded("balance_updated_at"),
            connectionId: sqlExcluded("connection_id"),
            connectedAt: sqlExcluded("connected_at"),
            lastSyncedAt: sqlExcluded("last_synced_at"),
          },
        }),
  );

  await insertAll(
    "category_rules",
    rows<CategoryRuleRow>("category_rules").map((r) => ({
      userId: r.user_id,
      matchKey: r.match_key,
      category: r.category,
      example: r.example,
      createdAt: r.created_at,
    })),
    (chunk) =>
      db
        .insert(schema.categoryRules)
        .values(chunk)
        .onConflictDoUpdate({
          target: [schema.categoryRules.userId, schema.categoryRules.matchKey],
          set: {
            category: sqlExcluded("category"),
            example: sqlExcluded("example"),
            createdAt: sqlExcluded("created_at"),
          },
        }),
  );

  await insertAll(
    "transactions",
    rows<TransactionRow>("transactions").map((r) => ({
      id: r.id,
      userId: r.user_id,
      accountUid: r.account_uid,
      bookingDate: r.booking_date,
      amount: r.amount,
      currency: r.currency,
      direction: r.direction,
      description: r.description,
      category: r.category,
      isInternal: r.is_internal,
      raw: r.raw,
      createdAt: r.created_at,
    })),
    (chunk) =>
      db
        .insert(schema.transactions)
        .values(chunk)
        .onConflictDoUpdate({
          target: schema.transactions.id,
          set: {
            userId: sqlExcluded("user_id"),
            accountUid: sqlExcluded("account_uid"),
            bookingDate: sqlExcluded("booking_date"),
            amount: sqlExcluded("amount"),
            currency: sqlExcluded("currency"),
            direction: sqlExcluded("direction"),
            description: sqlExcluded("description"),
            category: sqlExcluded("category"),
            isInternal: sqlExcluded("is_internal"),
            raw: sqlExcluded("raw"),
            createdAt: sqlExcluded("created_at"),
          },
        }),
  );

  await insertAll(
    "budgets",
    rows<BudgetRow>("budgets").map((r) => ({
      userId: r.user_id,
      category: r.category,
      monthlyLimit: r.monthly_limit,
      updatedAt: r.updated_at,
    })),
    (chunk) =>
      db
        .insert(schema.budgets)
        .values(chunk)
        .onConflictDoUpdate({
          target: [schema.budgets.userId, schema.budgets.category],
          set: {
            monthlyLimit: sqlExcluded("monthly_limit"),
            updatedAt: sqlExcluded("updated_at"),
          },
        }),
  );

  sqlite.close();
  console.log("\nDone.");
  process.exit(0);
}

// Reference the pseudo-table `excluded` (the row proposed for insert) inside an
// ON CONFLICT DO UPDATE, so re-runs overwrite existing rows with fresh values.
function sqlExcluded(column: string) {
  return sql.raw(`excluded."${column}"`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
