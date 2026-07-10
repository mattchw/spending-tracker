import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "./db-client";
import {
  accounts,
  authStates,
  budgets,
  categoryRules,
  connections,
  transactions,
  users,
} from "./schema";
import { normalizeKey } from "./categorize";
import { decryptToken, encryptToken } from "./crypto";

/*
 * Async data layer backed by Neon Postgres via Drizzle. Table DDL lives in
 * [schema.ts] and is applied through drizzle-kit migrations, so this module
 * only contains query helpers. Row shapes below stay snake_case to match the
 * legacy better-sqlite3 API and keep call sites unchanged.
 */

// Placeholder owner used by older single-user rows until the first login claims
// them (see ensureUser). Kept for compatibility with migrated data.
const LEGACY = "__legacy__";

/**
 * Upsert the signed-in user. When LEGACY_OWNER_EMAIL matches, claim any
 * pre-multi-user data (rows with no owner) for this account — a one-time
 * migration so your existing banks/transactions attach to your login.
 */
export async function ensureUser(u: {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}): Promise<void> {
  await db
    .insert(users)
    .values({
      id: u.id,
      email: u.email ?? null,
      name: u.name ?? null,
      image: u.image ?? null,
      createdAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: users.id,
      set: { email: u.email ?? null, name: u.name ?? null, image: u.image ?? null },
    });

  const owner = process.env.LEGACY_OWNER_EMAIL;
  if (owner && u.email && u.email.toLowerCase() === owner.toLowerCase()) {
    await db
      .update(connections)
      .set({ userId: u.id })
      .where(isNull(connections.userId));
    await db.update(accounts).set({ userId: u.id }).where(isNull(accounts.userId));
    await db
      .update(transactions)
      .set({ userId: u.id })
      .where(isNull(transactions.userId));
    await db
      .update(budgets)
      .set({ userId: u.id })
      .where(sql`${budgets.userId} IS NULL OR ${budgets.userId} = ${LEGACY}`);
    await db
      .update(categoryRules)
      .set({ userId: u.id })
      .where(sql`${categoryRules.userId} IS NULL OR ${categoryRules.userId} = ${LEGACY}`);
  }
}

export interface AccountRow {
  uid: string;
  bank: string | null;
  name: string | null;
  iban: string | null;
  currency: string | null;
  kind: "account" | "card" | null;
  logo: string | null;
  balance: number | null;
  balance_currency: string | null;
  balance_updated_at: number | null;
  connection_id: string | null;
  connected_at: number | null;
  last_synced_at: number | null;
}

export interface ConnectionRow {
  id: string;
  provider: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
  connected_at: number | null;
}

export interface TxDetail {
  label: string;
  value: string;
}

export interface TxRow {
  id: string;
  account_uid: string;
  booking_date: string | null;
  amount: number;
  currency: string | null;
  direction: "in" | "out";
  description: string | null;
  category: string | null;
  is_internal: number;
  account?: string; // "Bank — Account name", filled in by monthSummary
  bank?: string; // bank/provider name, filled in by monthSummary
  logo?: string | null; // bank logo URL, filled in by monthSummary
  details?: TxDetail[]; // counterparty / meta surfaced for hover
}

/* -------------------------------------------------------------------------- */
/* Auth states (transient CSRF tokens for the TrueLayer OAuth handshake)      */
/* -------------------------------------------------------------------------- */

export async function saveAuthState(
  state: string,
  userId: string | null,
  createdAt: number,
): Promise<void> {
  await db
    .insert(authStates)
    .values({ state, userId, createdAt })
    .onConflictDoUpdate({
      target: authStates.state,
      set: { userId, createdAt },
    });
}

export async function getAuthState(
  state: string,
): Promise<{ state: string; user_id: string | null; created_at: number } | undefined> {
  const [row] = await db
    .select()
    .from(authStates)
    .where(eq(authStates.state, state))
    .limit(1);
  if (!row) return undefined;
  return { state: row.state, user_id: row.userId, created_at: row.createdAt };
}

export async function deleteAuthState(state: string): Promise<void> {
  await db.delete(authStates).where(eq(authStates.state, state));
}

/* -------------------------------------------------------------------------- */
/* Connections                                                                */
/* -------------------------------------------------------------------------- */

export async function upsertConnection(c: {
  id: string;
  user_id: string | null;
  provider: string | null;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: number | null;
  connected_at: number | null;
}): Promise<void> {
  await db
    .insert(connections)
    .values({
      id: c.id,
      userId: c.user_id,
      provider: c.provider,
      accessToken: encryptToken(c.access_token),
      refreshToken: encryptToken(c.refresh_token),
      expiresAt: c.expires_at,
      connectedAt: c.connected_at,
    })
    .onConflictDoUpdate({
      target: connections.id,
      set: {
        provider: c.provider,
        accessToken: encryptToken(c.access_token),
        refreshToken: encryptToken(c.refresh_token),
        expiresAt: c.expires_at,
      },
    });
}

/** Distinct user ids that own at least one bank connection (for cron sync). */
export async function listUserIdsWithConnections(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ userId: connections.userId })
    .from(connections)
    .where(isNotNull(connections.userId));
  return rows.map((r) => r.userId).filter((id): id is string => Boolean(id));
}

/** All connections for a user. */
export async function listConnections(userId: string): Promise<ConnectionRow[]> {
  const rows = await db
    .select()
    .from(connections)
    .where(eq(connections.userId, userId));
  return rows.map((r) => ({
    id: r.id,
    provider: r.provider,
    access_token: decryptToken(r.accessToken),
    refresh_token: decryptToken(r.refreshToken),
    expires_at: r.expiresAt,
    connected_at: r.connectedAt,
  }));
}

export async function updateConnectionTokens(
  accessToken: string,
  refreshToken: string,
  expiresAt: number,
  id: string,
): Promise<void> {
  await db
    .update(connections)
    .set({
      accessToken: encryptToken(accessToken),
      refreshToken: encryptToken(refreshToken),
      expiresAt,
    })
    .where(eq(connections.id, id));
}

/* -------------------------------------------------------------------------- */
/* Accounts                                                                   */
/* -------------------------------------------------------------------------- */

export async function upsertAccount(a: {
  uid: string;
  user_id: string | null;
  bank: string | null;
  name: string | null;
  iban: string | null;
  currency: string | null;
  kind: string | null;
  logo: string | null;
  connection_id: string | null;
  connected_at: number | null;
}): Promise<void> {
  await db
    .insert(accounts)
    .values({
      uid: a.uid,
      userId: a.user_id,
      bank: a.bank,
      name: a.name,
      iban: a.iban,
      currency: a.currency,
      kind: a.kind,
      logo: a.logo,
      connectionId: a.connection_id,
      connectedAt: a.connected_at,
      lastSyncedAt: null,
    })
    .onConflictDoUpdate({
      target: accounts.uid,
      set: {
        userId: a.user_id,
        bank: a.bank,
        name: a.name,
        iban: a.iban,
        currency: a.currency,
        kind: a.kind,
        logo: a.logo,
        connectionId: a.connection_id,
        connectedAt: a.connected_at,
      },
    });
}

function toAccountRow(r: typeof accounts.$inferSelect): AccountRow {
  return {
    uid: r.uid,
    bank: r.bank,
    name: r.name,
    iban: r.iban,
    currency: r.currency,
    kind: (r.kind as "account" | "card" | null) ?? null,
    logo: r.logo,
    balance: r.balance,
    balance_currency: r.balanceCurrency,
    balance_updated_at: r.balanceUpdatedAt,
    connection_id: r.connectionId,
    connected_at: r.connectedAt,
    last_synced_at: r.lastSyncedAt,
  };
}

/** All accounts for a user. */
export async function listAccounts(userId: string): Promise<AccountRow[]> {
  const rows = await db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .orderBy(accounts.bank, accounts.name);
  return rows.map(toAccountRow);
}

export async function listAccountsByConnection(
  connectionId: string,
): Promise<AccountRow[]> {
  const rows = await db
    .select()
    .from(accounts)
    .where(eq(accounts.connectionId, connectionId))
    .orderBy(accounts.bank, accounts.name);
  return rows.map(toAccountRow);
}

export async function setLastSynced(ts: number, uid: string): Promise<void> {
  await db.update(accounts).set({ lastSyncedAt: ts }).where(eq(accounts.uid, uid));
}

export async function setBalance(
  balance: number,
  currency: string | null,
  updatedAt: number,
  uid: string,
): Promise<void> {
  await db
    .update(accounts)
    .set({ balance, balanceCurrency: currency, balanceUpdatedAt: updatedAt })
    .where(eq(accounts.uid, uid));
}

/* -------------------------------------------------------------------------- */
/* Category rules                                                             */
/* -------------------------------------------------------------------------- */

export async function upsertCategoryRule(r: {
  user_id: string;
  match_key: string;
  category: string;
  example: string | null;
  created_at: number;
}): Promise<void> {
  await db
    .insert(categoryRules)
    .values({
      userId: r.user_id,
      matchKey: r.match_key,
      category: r.category,
      example: r.example,
      createdAt: r.created_at,
    })
    .onConflictDoUpdate({
      target: [categoryRules.userId, categoryRules.matchKey],
      set: { category: r.category, example: r.example },
    });
}

export async function listCategoryRules(
  userId: string,
): Promise<{ match_key: string; category: string }[]> {
  const rows = await db
    .select({ match_key: categoryRules.matchKey, category: categoryRules.category })
    .from(categoryRules)
    .where(eq(categoryRules.userId, userId));
  return rows;
}

/* -------------------------------------------------------------------------- */
/* Transactions                                                               */
/* -------------------------------------------------------------------------- */

export async function upsertTransaction(t: {
  id: string;
  user_id: string | null;
  account_uid: string;
  booking_date: string | null;
  amount: number;
  currency: string | null;
  direction: string;
  description: string | null;
  category: string | null;
  raw: string | null;
  created_at: number;
}): Promise<void> {
  await db
    .insert(transactions)
    .values({
      id: t.id,
      userId: t.user_id,
      accountUid: t.account_uid,
      bookingDate: t.booking_date,
      amount: t.amount,
      currency: t.currency,
      direction: t.direction,
      description: t.description,
      category: t.category,
      raw: t.raw,
      createdAt: t.created_at,
    })
    .onConflictDoUpdate({
      target: transactions.id,
      set: {
        userId: t.user_id,
        category: t.category,
        description: t.description,
      },
    });
}

export interface MonthSummary {
  month: string;
  totalIn: number;
  totalOut: number;
  net: number;
  transfersCount: number; // internal transfer legs excluded from the totals
  transfersTotal: number; // sum of those excluded amounts (per leg)
  byCategory: { category: string; amount: number; direction: "in" | "out" }[];
  transactions: TxRow[];
}

/** Pull out any counterparty / metadata worth showing from a raw TrueLayer tx. */
function extractDetails(raw: string | null): TxDetail[] {
  if (!raw) return [];
  let tx: any;
  try {
    tx = JSON.parse(raw);
  } catch {
    return [];
  }
  const out: TxDetail[] = [];
  const push = (label: string, value: unknown) => {
    if (value === undefined || value === null || value === "") return;
    out.push({ label, value: String(value) });
  };

  push("Merchant", tx.merchant_name);
  const cls = Array.isArray(tx.transaction_classification)
    ? tx.transaction_classification.join(" › ")
    : undefined;
  push("Classification", cls);
  push("Type", tx.transaction_type);

  const meta = tx.meta || {};
  // Counterparty / destination identifiers vary by bank; surface what exists.
  push("Payee", meta.counter_party_preferred_name || meta.provider_merchant_name);
  push("Account no.", meta.account_number || meta.destination_account_number);
  push("Sort code", meta.sort_code || meta.destination_sort_code);
  push("IBAN", meta.iban || meta.destination_iban);
  push("Reference", meta.provider_reference || meta.transaction_reference);
  push("Provider category", meta.provider_category);
  if (typeof tx.running_balance?.amount === "number") {
    push(
      "Balance after",
      `${tx.running_balance.amount} ${tx.running_balance.currency || ""}`.trim(),
    );
  }
  return out;
}

/** Aggregate a month (YYYY-MM) into totals + category breakdown. */
export async function monthSummary(
  userId: string,
  month: string,
): Promise<MonthSummary> {
  const raw = await db
    .select({
      id: transactions.id,
      account_uid: transactions.accountUid,
      booking_date: transactions.bookingDate,
      amount: transactions.amount,
      currency: transactions.currency,
      direction: transactions.direction,
      description: transactions.description,
      category: transactions.category,
      is_internal: transactions.isInternal,
      raw_json: transactions.raw,
      bank: accounts.bank,
      acct_name: accounts.name,
      logo: accounts.logo,
    })
    .from(transactions)
    .leftJoin(accounts, eq(accounts.uid, transactions.accountUid))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(sql`substr(${transactions.bookingDate}, 1, 7)`, month),
      ),
    )
    .orderBy(desc(transactions.bookingDate));

  const rows: TxRow[] = raw.map((r) => ({
    id: r.id,
    account_uid: r.account_uid,
    booking_date: r.booking_date,
    amount: r.amount,
    currency: r.currency,
    direction: r.direction as "in" | "out",
    description: r.description,
    category: r.category,
    is_internal: r.is_internal,
    account: [r.bank, r.acct_name].filter(Boolean).join(" — ") || undefined,
    bank: r.bank || undefined,
    logo: r.logo,
    details: extractDetails(r.raw_json),
  }));

  let totalIn = 0;
  let totalOut = 0;
  let transfersCount = 0;
  let transfersTotal = 0;
  const catMap = new Map<string, { amount: number; direction: "in" | "out" }>();
  for (const r of rows) {
    // Internal transfers between the user's own accounts are noise for
    // money-in/out — keep them in the list but exclude from the maths.
    if (r.is_internal) {
      transfersCount += 1;
      transfersTotal += r.amount;
      continue;
    }
    if (r.direction === "in") totalIn += r.amount;
    else totalOut += r.amount;
    const key = `${r.category}|${r.direction}`;
    const cur = catMap.get(key) || { amount: 0, direction: r.direction };
    cur.amount += r.amount;
    catMap.set(key, cur);
  }

  const byCategory = Array.from(catMap.entries())
    .map(([key, v]) => ({
      category: key.split("|")[0] || "Uncategorised",
      amount: v.amount,
      direction: v.direction,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    month,
    totalIn,
    totalOut,
    net: totalIn - totalOut,
    transfersCount,
    transfersTotal,
    byCategory,
    transactions: rows,
  };
}

interface ReconcileRow {
  id: string;
  account_uid: string;
  booking_date: string | null;
  amount: number;
  currency: string | null;
  direction: "in" | "out";
}

/**
 * Flag transfers between the user's own linked accounts as internal.
 *
 * An outgoing payment is considered internal when there's a matching incoming
 * payment in a *different* linked account with the same amount and currency
 * within `windowDays`. Both legs are then excluded from money-in/out totals.
 * Transfers to non-linked accounts have no matching leg and stay counted.
 *
 * When several transfers of the same amount happen close together, a greedy
 * pass can pair the wrong legs and orphan a genuine pair (e.g. two legs that
 * end up on the same account and so can't match each other). To avoid that we
 * compute a *maximum bipartite matching* per amount/currency group, which
 * always finds the most valid pairs possible.
 * Idempotent: recomputes flags from scratch on every call.
 */
export async function reconcileInternalTransfers(
  userId: string,
  windowDays = 4,
): Promise<number> {
  const rows = (await db
    .select({
      id: transactions.id,
      account_uid: transactions.accountUid,
      booking_date: transactions.bookingDate,
      amount: transactions.amount,
      currency: transactions.currency,
      direction: transactions.direction,
    })
    .from(transactions)
    .where(eq(transactions.userId, userId))) as ReconcileRow[];

  const day = (d: string | null) =>
    d ? Date.parse(`${d}T00:00:00Z`) / 86_400_000 : NaN;

  // Group legs by amount + currency; only legs within a group can ever match.
  const groups = new Map<string, { outs: ReconcileRow[]; ins: ReconcileRow[] }>();
  for (const r of rows) {
    if (r.direction !== "in" && r.direction !== "out") continue;
    const key = `${r.currency || ""}|${Math.round(r.amount * 100)}`;
    const g = groups.get(key) || { outs: [], ins: [] };
    (r.direction === "out" ? g.outs : g.ins).push(r);
    groups.set(key, g);
  }

  const internal = new Set<string>();

  for (const { outs, ins } of groups.values()) {
    if (outs.length === 0 || ins.length === 0) continue;

    // adj[i] = indices of ins that out i could legitimately pair with.
    const adj: number[][] = outs.map((out) => {
      const od = day(out.booking_date);
      const eligible: number[] = [];
      ins.forEach((cand, j) => {
        if (cand.account_uid === out.account_uid) return;
        const diff = Math.abs(day(cand.booking_date) - od);
        if (Number.isNaN(diff) || diff > windowDays) return;
        eligible.push(j);
      });
      return eligible;
    });

    // Kuhn's algorithm for maximum bipartite matching.
    const matchIn = new Array<number>(ins.length).fill(-1); // in index -> out index
    const augment = (u: number, seen: boolean[]): boolean => {
      for (const j of adj[u]) {
        if (seen[j]) continue;
        seen[j] = true;
        if (matchIn[j] === -1 || augment(matchIn[j], seen)) {
          matchIn[j] = u;
          return true;
        }
      }
      return false;
    };
    for (let u = 0; u < outs.length; u++) {
      augment(u, new Array<boolean>(ins.length).fill(false));
    }

    for (let j = 0; j < ins.length; j++) {
      if (matchIn[j] !== -1) {
        internal.add(ins[j].id);
        internal.add(outs[matchIn[j]].id);
      }
    }
  }

  await db.transaction(async (tx) => {
    await tx
      .update(transactions)
      .set({ isInternal: 0 })
      .where(eq(transactions.userId, userId));
    for (const id of internal) {
      await tx
        .update(transactions)
        .set({ isInternal: 1 })
        .where(eq(transactions.id, id));
    }
  });

  return internal.size / 2;
}

/** Per-month in/out totals (excluding internal transfers), oldest first. */
export async function monthlyTotals(userId: string): Promise<
  {
    month: string;
    totalIn: number;
    totalOut: number;
  }[]
> {
  const monthExpr = sql<string>`substr(${transactions.bookingDate}, 1, 7)`;
  const rows = await db
    .select({
      m: monthExpr,
      direction: transactions.direction,
      total: sql<number>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.isInternal, 0),
        isNotNull(transactions.bookingDate),
      ),
    )
    .groupBy(monthExpr, transactions.direction);

  const map = new Map<string, { in: number; out: number }>();
  for (const r of rows) {
    const e = map.get(r.m) || { in: 0, out: 0 };
    const total = Number(r.total) || 0;
    if (r.direction === "in") e.in += total;
    else e.out += total;
    map.set(r.m, e);
  }
  return [...map.entries()]
    .map(([month, v]) => ({ month, totalIn: v.in, totalOut: v.out }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/** Distinct months that have transactions for a user, newest first. */
export async function availableMonths(userId: string): Promise<string[]> {
  const monthExpr = sql<string>`substr(${transactions.bookingDate}, 1, 7)`;
  const rows = await db
    .selectDistinct({ m: monthExpr })
    .from(transactions)
    .where(
      and(eq(transactions.userId, userId), isNotNull(transactions.bookingDate)),
    )
    .orderBy(desc(monthExpr));
  return rows.map((r) => r.m);
}

/** Re-apply a user's learned category rules across their stored transactions. */
export async function reapplyLearnedCategories(userId: string): Promise<number> {
  const rules = await listCategoryRules(userId);
  if (!rules.length) return 0;
  const map = new Map(rules.map((r) => [r.match_key, r.category]));
  const txs = await db
    .select({
      id: transactions.id,
      description: transactions.description,
      category: transactions.category,
    })
    .from(transactions)
    .where(eq(transactions.userId, userId));

  let n = 0;
  await db.transaction(async (tx) => {
    for (const t of txs) {
      const cat = map.get(normalizeKey(t.description || ""));
      if (cat && cat !== t.category) {
        await tx
          .update(transactions)
          .set({ category: cat })
          .where(eq(transactions.id, t.id));
        n += 1;
      }
    }
  });
  return n;
}

/**
 * Manually set a transaction's category, remember it as a rule, and back-apply
 * it to every matching transaction (past and future syncs). Scoped to the user
 * so one person's edits never touch another's data.
 */
export async function setCategoryForTransaction(
  userId: string,
  id: string,
  category: string,
): Promise<{ updated: number; remembered: boolean }> {
  const [tx] = await db
    .select({ description: transactions.description })
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .limit(1);
  if (!tx) throw new Error("transaction not found");

  const key = normalizeKey(tx.description || "");
  if (!key) {
    await db
      .update(transactions)
      .set({ category })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    return { updated: 1, remembered: false };
  }
  await upsertCategoryRule({
    user_id: userId,
    match_key: key,
    category,
    example: tx.description,
    created_at: Date.now(),
  });
  return { updated: await reapplyLearnedCategories(userId), remembered: true };
}

/* -------------------------------------------------------------------------- */
/* Budgets                                                                    */
/* -------------------------------------------------------------------------- */

export interface Budget {
  category: string;
  limit: number;
}

export async function listBudgets(userId: string): Promise<Budget[]> {
  const rows = await db
    .select({ category: budgets.category, monthly_limit: budgets.monthlyLimit })
    .from(budgets)
    .where(eq(budgets.userId, userId))
    .orderBy(budgets.category);
  return rows.map((r) => ({ category: r.category, limit: r.monthly_limit }));
}

/** Set (or, when limit <= 0, clear) the monthly budget for a category. */
export async function setBudget(
  userId: string,
  category: string,
  limit: number,
): Promise<void> {
  if (!category) return;
  if (!limit || limit <= 0) {
    await db
      .delete(budgets)
      .where(and(eq(budgets.userId, userId), eq(budgets.category, category)));
    return;
  }
  await db
    .insert(budgets)
    .values({
      userId,
      category,
      monthlyLimit: limit,
      updatedAt: Date.now(),
    })
    .onConflictDoUpdate({
      target: [budgets.userId, budgets.category],
      set: { monthlyLimit: limit, updatedAt: Date.now() },
    });
}

/* -------------------------------------------------------------------------- */
/* Recurring payment detection                                                */
/* -------------------------------------------------------------------------- */

export interface Recurring {
  key: string;
  description: string;
  category: string;
  amount: number; // most recent charge amount
  avgAmount: number; // median amount across all charges (for context)
  cadence: "weekly" | "fortnightly" | "monthly" | "quarterly" | "yearly";
  intervalDays: number; // median gap between charges
  monthlyEstimate: number; // amount normalised to a monthly figure
  count: number;
  lastDate: string | null;
}

const median = (xs: number[]): number => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

function classifyCadence(days: number): Recurring["cadence"] {
  if (days <= 10) return "weekly";
  if (days <= 20) return "fortnightly";
  if (days <= 45) return "monthly";
  if (days <= 135) return "quarterly";
  return "yearly";
}

const CADENCE_PER_MONTH: Record<Recurring["cadence"], number> = {
  weekly: 52 / 12,
  fortnightly: 26 / 12,
  monthly: 1,
  quarterly: 1 / 3,
  yearly: 1 / 12,
};

/**
 * Detect recurring outgoing payments (subscriptions, bills, standing orders)
 * by grouping look-alike descriptions and checking for a regular cadence.
 * Heuristic: >= 3 charges, spread across >= 3 distinct months, with a roughly
 * consistent gap between them.
 */
export async function detectRecurring(userId: string): Promise<Recurring[]> {
  const rows = (await db
    .select({
      description: transactions.description,
      amount: transactions.amount,
      category: transactions.category,
      booking_date: transactions.bookingDate,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.direction, "out"),
        eq(transactions.isInternal, 0),
        isNotNull(transactions.bookingDate),
      ),
    )) as {
    description: string | null;
    amount: number;
    category: string | null;
    booking_date: string;
  }[];

  const groups = new Map<
    string,
    {
      descriptions: Map<string, number>;
      categories: Map<string, number>;
      entries: { date: string; amount: number }[];
    }
  >();

  for (const r of rows) {
    const key = normalizeKey(r.description || "");
    if (!key) continue;
    const g =
      groups.get(key) ||
      {
        descriptions: new Map<string, number>(),
        categories: new Map<string, number>(),
        entries: [] as { date: string; amount: number }[],
      };
    g.descriptions.set(
      r.description || "",
      (g.descriptions.get(r.description || "") || 0) + 1,
    );
    if (r.category)
      g.categories.set(r.category, (g.categories.get(r.category) || 0) + 1);
    g.entries.push({ date: r.booking_date, amount: r.amount });
    groups.set(key, g);
  }

  const mostCommon = (m: Map<string, number>): string => {
    let best = "";
    let n = -1;
    for (const [k, v] of m) if (v > n) [best, n] = [k, v];
    return best;
  };

  const out: Recurring[] = [];
  const DAY = 86_400_000;

  // Reference "now" for recency: the latest transaction we actually have, so a
  // lagging sync doesn't wrongly retire an active subscription.
  const latestDate = rows.reduce(
    (max, r) => (r.booking_date > max ? r.booking_date : max),
    "",
  );
  const latestMs = latestDate ? Date.parse(latestDate) : Date.now();

  for (const [key, g] of groups) {
    if (g.entries.length < 3) continue;
    // Sort charges oldest → newest so the last entry is the most recent.
    const entries = [...g.entries].sort((a, b) => a.date.localeCompare(b.date));
    const uniqueDates = Array.from(new Set(entries.map((e) => e.date))).sort();
    const months = new Set(uniqueDates.map((d) => d.slice(0, 7)));
    if (months.size < 3 || uniqueDates.length < 3) continue;

    const gaps: number[] = [];
    for (let i = 1; i < uniqueDates.length; i++) {
      gaps.push(
        Math.round(
          (Date.parse(uniqueDates[i]) - Date.parse(uniqueDates[i - 1])) / DAY,
        ),
      );
    }
    const gap = median(gaps);
    if (gap < 5 || gap > 400) continue;

    // Require reasonable regularity: most gaps close to the median.
    const regular =
      gaps.filter((d) => Math.abs(d - gap) <= Math.max(4, gap * 0.35)).length >=
      Math.ceil(gaps.length / 2);
    if (!regular) continue;

    // Still active? Skip series whose last charge is older than ~1.6 cycles
    // (plus a few days' grace) before the latest data we have — e.g. a
    // cancelled subscription or a past rent that no longer bills.
    const lastDate = uniqueDates[uniqueDates.length - 1];
    const staleAfter = gap * 1.6 * DAY + 5 * DAY;
    if (latestMs - Date.parse(lastDate) > staleAfter) continue;

    const cadence = classifyCadence(gap);
    // Headline amount = the most recent charge (bills like Amex/insurance vary
    // month to month; the latest figure is the most useful). Keep the average
    // for context.
    const amount = entries[entries.length - 1].amount;
    const avgAmount = median(entries.map((e) => e.amount));
    out.push({
      key,
      description: mostCommon(g.descriptions) || key,
      category: mostCommon(g.categories) || "Uncategorised",
      amount,
      avgAmount,
      cadence,
      intervalDays: gap,
      monthlyEstimate: amount * CADENCE_PER_MONTH[cadence],
      count: entries.length,
      lastDate: lastDate || null,
    });
  }

  return out.sort((a, b) => b.monthlyEstimate - a.monthlyEstimate);
}
