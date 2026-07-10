import {
  bigint,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
} from "drizzle-orm/pg-core";

/**
 * Drizzle schema for Neon Postgres. Mirrors the legacy better-sqlite3 tables in
 * [db.ts]. Epoch-millisecond timestamps kept as `bigint` (they exceed int4) and
 * monetary/REAL values as `double precision` to preserve the existing semantics.
 */

// One row per signed-in person. id = Auth.js/Google stable subject id.
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  name: text("name"),
  image: text("image"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

// Transient CSRF state tokens for the TrueLayer OAuth handshake.
export const authStates = pgTable("auth_states", {
  state: text("state").primaryKey(),
  userId: text("user_id"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

// One row per bank connection (OAuth grant). Holds the tokens we refresh.
export const connections = pgTable("connections", {
  id: text("id").primaryKey(),
  userId: text("user_id"),
  provider: text("provider"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  // epoch ms when the access token expires
  expiresAt: bigint("expires_at", { mode: "number" }),
  connectedAt: bigint("connected_at", { mode: "number" }),
});

export const accounts = pgTable("accounts", {
  uid: text("uid").primaryKey(),
  userId: text("user_id"),
  bank: text("bank"),
  name: text("name"),
  iban: text("iban"),
  currency: text("currency"),
  // 'account' | 'card'
  kind: text("kind"),
  // provider logo URL
  logo: text("logo"),
  // current balance
  balance: doublePrecision("balance"),
  balanceCurrency: text("balance_currency"),
  balanceUpdatedAt: bigint("balance_updated_at", { mode: "number" }),
  connectionId: text("connection_id"),
  connectedAt: bigint("connected_at", { mode: "number" }),
  lastSyncedAt: bigint("last_synced_at", { mode: "number" }),
});

// Learned category rules from manual edits (keyed by a normalised description
// so future look-alike transactions map automatically).
export const categoryRules = pgTable(
  "category_rules",
  {
    userId: text("user_id").notNull(),
    matchKey: text("match_key").notNull(),
    category: text("category").notNull(),
    example: text("example"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.matchKey] })],
);

export const transactions = pgTable(
  "transactions",
  {
    // account_uid + dedup key
    id: text("id").primaryKey(),
    userId: text("user_id"),
    accountUid: text("account_uid").notNull(),
    // YYYY-MM-DD
    bookingDate: text("booking_date"),
    // always positive
    amount: doublePrecision("amount").notNull(),
    currency: text("currency"),
    // 'in' | 'out'
    direction: text("direction").notNull(),
    description: text("description"),
    category: text("category"),
    // 1 = transfer between own accounts
    isInternal: integer("is_internal").notNull().default(0),
    raw: text("raw"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("idx_tx_date").on(t.bookingDate),
    index("idx_tx_user").on(t.userId),
  ],
);

// Monthly spending limit per category, per user (0/absent = no budget).
export const budgets = pgTable(
  "budgets",
  {
    userId: text("user_id").notNull(),
    category: text("category").notNull(),
    monthlyLimit: doublePrecision("monthly_limit").notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.category] })],
);
