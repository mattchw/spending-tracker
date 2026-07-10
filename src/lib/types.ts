export interface Account {
  uid: string;
  bank: string;
  name: string;
  currency: string;
  kind: "account" | "card" | null;
  logo: string | null;
  balance: number | null;
  balance_currency: string | null;
  balance_updated_at: number | null;
  last_synced_at: number | null;
}

export interface TxDetail {
  label: string;
  value: string;
}

export interface Tx {
  id: string;
  booking_date: string | null;
  amount: number;
  currency: string;
  direction: "in" | "out";
  description: string;
  category: string;
  is_internal: number;
  account?: string;
  bank?: string;
  logo?: string | null;
  details?: TxDetail[];
}

export interface Cat {
  category: string;
  amount: number;
  direction: "in" | "out";
}

export interface Summary {
  month: string;
  totalIn: number;
  totalOut: number;
  net: number;
  transfersCount: number;
  transfersTotal: number;
  byCategory: Cat[];
  transactions: Tx[];
}

export interface TopBalance {
  uid: string;
  bank: string;
  name: string;
  logo: string | null;
  balance: number;
  currency: string;
}

export interface Balances {
  byCurrency: Record<string, number>;
  top: TopBalance[];
}

export interface Trend {
  month: string;
  totalIn: number;
  totalOut: number;
}

export interface Deltas {
  in: number | null;
  out: number | null;
  net: number | null;
}

export interface Budget {
  category: string;
  limit: number;
}

export interface Recurring {
  key: string;
  description: string;
  category: string;
  amount: number;
  avgAmount: number;
  cadence: "weekly" | "fortnightly" | "monthly" | "quarterly" | "yearly";
  intervalDays: number;
  monthlyEstimate: number;
  count: number;
  lastDate: string | null;
}

export interface ConnectionHealth {
  id: string;
  provider: string;
  connectedAt: number | null;
  expiresAt: number | null;
  daysLeft: number | null;
  status: "ok" | "soon" | "expired";
}

export interface SummaryResp {
  configured: boolean;
  accounts: Account[];
  months: string[];
  summary: Summary;
  balances: Balances;
  trend: Trend[];
  deltas: Deltas;
  budgets: Budget[];
  recurring: Recurring[];
  connections: ConnectionHealth[];
}

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
];

/**
 * Deterministic colour for a category, shared across the whole app (donut,
 * bars, calendar dots) so the same category always gets the same colour.
 */
export function categoryColor(category: string): string {
  if (!category || category === "Uncategorised")
    return "var(--muted-foreground)";
  let h = 0;
  for (let i = 0; i < category.length; i++)
    h = (h * 31 + category.charCodeAt(i)) >>> 0;
  return CHART_COLORS[h % CHART_COLORS.length];
}
