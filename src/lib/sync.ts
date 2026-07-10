import {
  getBalance,
  getTransactions,
  refreshTokens,
  type TlTransaction,
} from "./truelayer";
import { categorize } from "./categorize";
import {
  listAccountsByConnection,
  listConnections,
  listUserIdsWithConnections,
  reapplyLearnedCategories,
  reconcileInternalTransfers,
  setBalance,
  setLastSynced,
  updateConnectionTokens,
  upsertTransaction,
  type AccountRow,
  type ConnectionRow,
} from "./db";

function describe(tx: TlTransaction): string {
  return (tx.merchant_name || tx.description || "").trim() || "(no description)";
}

function dedupKey(uid: string, tx: TlTransaction): string {
  if (tx.transaction_id) return `${uid}:${tx.transaction_id}`;
  // Fall back to a stable composite when no id is provided.
  const d = tx.timestamp || "";
  return `${uid}:${d}:${tx.amount}:${describe(tx).slice(0, 40)}`;
}

function direction(tx: TlTransaction): "in" | "out" {
  if (tx.transaction_type === "CREDIT") return "in";
  if (tx.transaction_type === "DEBIT") return "out";
  // Fall back to the sign of the amount (negative = money out).
  return tx.amount >= 0 ? "in" : "out";
}

/** Ensure a connection has a valid access token, refreshing if near expiry. */
async function validAccessToken(conn: ConnectionRow): Promise<string> {
  const soon = Date.now() + 60_000;
  if (conn.access_token && conn.expires_at && conn.expires_at > soon) {
    return conn.access_token;
  }
  if (!conn.refresh_token) {
    throw new Error("connection has no refresh token — reconnect the bank");
  }
  const t = await refreshTokens(conn.refresh_token);
  const expiresAt = Date.now() + t.expires_in * 1000;
  await updateConnectionTokens(
    t.access_token,
    t.refresh_token || conn.refresh_token,
    expiresAt,
    conn.id,
  );
  return t.access_token;
}

/** Fetch + store transactions for one account since `dateFrom`. */
async function syncAccount(
  userId: string,
  accessToken: string,
  account: AccountRow,
  dateFrom: string,
  dateTo: string,
): Promise<number> {
  const kind = account.kind === "card" ? "card" : "account";
  const txns = await getTransactions(
    accessToken,
    account.uid,
    kind,
    dateFrom,
    dateTo,
  );
  const now = Date.now();
  let count = 0;
  for (const tx of txns) {
    const dir = direction(tx);
    const description = describe(tx);
    await upsertTransaction({
      id: dedupKey(account.uid, tx),
      user_id: userId,
      account_uid: account.uid,
      booking_date: tx.timestamp ? tx.timestamp.slice(0, 10) : null,
      amount: Math.abs(tx.amount),
      currency: tx.currency,
      direction: dir,
      description,
      category: categorize(description, dir),
      raw: JSON.stringify(tx),
      created_at: now,
    });
    count++;
  }
  await setLastSynced(now, account.uid);
  return count;
}

/**
 * Sync connected accounts.
 *
 * By default pulls the last 90 days across *all* connections — the maximum most
 * banks allow for *background* access (using the stored refresh token). Pass a
 * wider window (`days`) or explicit `from` date to backfill history; banks only
 * honour this right after the user authenticates (up to ~23 months). Because
 * that fresh-SCA window is per-connection, deep pulls must be scoped to the
 * just-connected bank via `connectionId` — requesting old history from a stale
 * connection returns a 403 "SCA exemption has expired".
 */
export async function syncAll(
  userId: string,
  opts: { days?: number; from?: string; connectionId?: string } = {},
): Promise<{
  accounts: number;
  transactions: number;
  transfers: number;
  errors: string[];
}> {
  const days = opts.days ?? 90;
  const dateFrom =
    opts.from ||
    new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
  const dateTo = new Date().toISOString().slice(0, 10);

  const allConnections = await listConnections(userId);
  const connections = opts.connectionId
    ? allConnections.filter((c) => c.id === opts.connectionId)
    : allConnections;
  let accountCount = 0;
  let transactions = 0;
  const errors: string[] = [];

  for (const conn of connections) {
    let accessToken: string;
    try {
      accessToken = await validAccessToken(conn);
    } catch (e: any) {
      errors.push(`${conn.provider || conn.id}: ${e.message}`);
      continue;
    }
    const accounts = await listAccountsByConnection(conn.id);
    for (const acc of accounts) {
      accountCount++;
      const kind = acc.kind === "card" ? "card" : "account";
      try {
        transactions += await syncAccount(
          userId,
          accessToken,
          acc,
          dateFrom,
          dateTo,
        );
        const bal = await getBalance(accessToken, acc.uid, kind);
        if (bal) await setBalance(bal.current, bal.currency, Date.now(), acc.uid);
      } catch (e: any) {
        errors.push(`${acc.bank} ${acc.name}: ${e.message}`);
      }
    }
  }

  // Apply any manually-learned category rules to the freshly synced data.
  await reapplyLearnedCategories(userId);
  // Flag money moved between the user's own accounts so it drops out of totals.
  const transfers = await reconcileInternalTransfers(userId);

  return { accounts: accountCount, transactions, transfers, errors };
}

/**
 * Background sync for every user with a bank connection (invoked by the Vercel
 * cron). Pulls the rolling 90-day window per user, which also refreshes any
 * near-expiry access tokens along the way (see validAccessToken), keeping the
 * refresh tokens — and thus the 90-day bank consent — alive between logins.
 * Errors are isolated per user so one bad connection can't abort the run.
 */
export async function syncAllUsers(): Promise<{
  users: number;
  transactions: number;
  errors: string[];
}> {
  const userIds = await listUserIdsWithConnections();
  let transactions = 0;
  const errors: string[] = [];
  for (const userId of userIds) {
    try {
      const res = await syncAll(userId);
      transactions += res.transactions;
      for (const e of res.errors) errors.push(`${userId}: ${e}`);
    } catch (e: any) {
      errors.push(`${userId}: ${e.message}`);
    }
  }
  return { users: userIds.length, transactions, errors };
}
