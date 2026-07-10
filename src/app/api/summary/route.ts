import { NextResponse } from "next/server";
import {
  availableMonths,
  detectRecurring,
  listAccounts,
  listBudgets,
  listConnections,
  monthlyTotals,
  monthSummary,
} from "@/lib/db";
import { isConfigured } from "@/lib/truelayer";
import { requireUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

// Open Banking consent typically lasts 90 days from authentication.
const CONSENT_DAYS = 90;

export async function GET(req: Request) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const months = await availableMonths(userId);
  const month =
    url.searchParams.get("month") ||
    months[0] ||
    new Date().toISOString().slice(0, 7);

  const accounts = await listAccounts(userId);

  // Balances: only spendable accounts (exclude cards, which represent debt).
  const spendable = accounts.filter(
    (a) => a.kind !== "card" && typeof a.balance === "number",
  );
  const byCurrency: Record<string, number> = {};
  for (const a of spendable) {
    const ccy = a.balance_currency || "GBP";
    byCurrency[ccy] = (byCurrency[ccy] || 0) + (a.balance || 0);
  }
  const top = [...spendable]
    .sort((x, y) => (y.balance || 0) - (x.balance || 0))
    .slice(0, 3)
    .map((a) => ({
      uid: a.uid,
      bank: a.bank,
      name: a.name,
      logo: a.logo,
      balance: a.balance,
      currency: a.balance_currency || "GBP",
    }));

  // Full monthly history (the dashboard slices it per selected year) +
  // month-over-month deltas for the stat cards.
  const totals = await monthlyTotals(userId);
  const trend = totals;
  const idx = totals.findIndex((t) => t.month === month);
  const cur = idx >= 0 ? totals[idx] : { totalIn: 0, totalOut: 0 };
  const prev = idx > 0 ? totals[idx - 1] : null;
  const pct = (c: number, p: number | undefined) =>
    p && p !== 0 ? ((c - p) / Math.abs(p)) * 100 : null;
  const deltas = {
    in: pct(cur.totalIn, prev?.totalIn),
    out: pct(cur.totalOut, prev?.totalOut),
    net: pct(cur.totalIn - cur.totalOut, prev ? prev.totalIn - prev.totalOut : undefined),
  };

  // Consent health per connection (expires ~90 days after connecting).
  const now = Date.now();
  const DAY = 86_400_000;
  const connections = (await listConnections(userId)).map((c) => {
    const expiresAt = c.connected_at ? c.connected_at + CONSENT_DAYS * DAY : null;
    const daysLeft =
      expiresAt !== null ? Math.floor((expiresAt - now) / DAY) : null;
    const status: "ok" | "soon" | "expired" =
      daysLeft === null ? "ok" : daysLeft < 0 ? "expired" : daysLeft <= 7 ? "soon" : "ok";
    return {
      id: c.id,
      provider: c.provider || "Bank",
      connectedAt: c.connected_at,
      expiresAt,
      daysLeft,
      status,
    };
  });

  const [summary, budgets, recurring] = await Promise.all([
    monthSummary(userId, month),
    listBudgets(userId),
    detectRecurring(userId),
  ]);

  return NextResponse.json({
    configured: isConfigured(),
    accounts,
    months,
    summary,
    balances: { byCurrency, top },
    trend,
    deltas,
    budgets,
    recurring,
    connections,
  });
}
