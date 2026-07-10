"use client";

import Link from "next/link";
import { PiggyBank, TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { Delta, StatCard } from "@/components/dashboard/stat-card";
import { SpendingTrendChart } from "@/components/dashboard/spending-trend-chart";
import { CategoryDonut } from "@/components/dashboard/category-donut";
import { CategoryBars } from "@/components/dashboard/category-bars";
import { AccountsPanel } from "@/components/dashboard/accounts-panel";
import { TransactionsList } from "@/components/dashboard/transactions-list";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { money, monthLabel } from "@/lib/format";
import type { Trend } from "@/lib/types";

export default function OverviewPage() {
  const { data, month, banksConfigured, busy, connect, setCategory } =
    useDashboard();
  if (!data) return null;

  const s = data.summary;
  const outCats = s.byCategory.filter((c) => c.direction === "out").slice(0, 8);
  const ccyEntries = Object.entries(data.balances.byCurrency);
  const primary = [...ccyEntries].sort((a, b) => b[1] - a[1])[0];
  const accountCount = data.accounts.filter((a) => a.kind !== "card").length;
  const selectedYear = month.slice(0, 4);

  const now = new Date();
  const lastMonth =
    selectedYear === String(now.getFullYear()) ? now.getMonth() + 1 : 12;
  const trendByMonth = new Map(data.trend.map((t) => [t.month, t]));
  const yearTrend: Trend[] = Array.from({ length: lastMonth }, (_, i) => {
    const key = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
    return trendByMonth.get(key) || { month: key, totalIn: 0, totalOut: 0 };
  });
  const monthsWithData = yearTrend.filter((t) => t.totalOut > 0);
  const avg = monthsWithData.length
    ? monthsWithData.reduce((a, b) => a + b.totalOut, 0) / monthsWithData.length
    : 0;

  return (
    <>
      {!banksConfigured && (
        <Card className="mb-4">
          <CardTitle>⚙️ Setup needed</CardTitle>
          <CardDescription>
            Add your TrueLayer credentials to connect a bank — see the{" "}
            <Link href="/settings" className="text-primary">
              Settings
            </Link>{" "}
            page.
          </CardDescription>
        </Card>
      )}

      {banksConfigured && data.accounts.length === 0 && (
        <Card className="mb-4 items-center p-10 text-center">
          <CardTitle>Connect your first bank</CardTitle>
          <CardDescription>
            You’ll be taken to TrueLayer to sign in securely. Repeat for each
            bank.
          </CardDescription>
          <Button
            variant="gradient"
            className="mt-3"
            onClick={connect}
            disabled={busy}
          >
            {busy ? "Starting…" : "+ Connect a bank"}
          </Button>
        </Card>
      )}

      {/* Stat cards */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total balance"
          icon={<Wallet className="size-4" />}
          amount={primary ? money(primary[1], primary[0]) : money(0)}
        >
          {ccyEntries.length > 1 ? (
            <span className="text-muted-foreground text-xs">
              {ccyEntries
                .slice(1)
                .map(([c, v]) => `+ ${money(v, c)}`)
                .join("  ")}
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">
              across {accountCount} accounts
            </span>
          )}
        </StatCard>
        <StatCard
          label="Monthly spending"
          icon={<TrendingDown className="size-4" />}
          amount={money(s.totalOut)}
        >
          <Delta value={data.deltas.out} goodWhenUp={false} />
        </StatCard>
        <StatCard
          label="Income"
          icon={<TrendingUp className="size-4" />}
          amount={money(s.totalIn)}
        >
          <Delta value={data.deltas.in} goodWhenUp={true} />
        </StatCard>
        <StatCard
          label="Net saved"
          icon={<PiggyBank className="size-4" />}
          amount={money(s.net)}
          amountClassName={s.net >= 0 ? "text-in" : "text-out"}
        >
          <Delta value={data.deltas.net} goodWhenUp={true} />
        </StatCard>
      </div>

      {/* Trend + donut */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Spending trend</CardTitle>
              <CardDescription className="mt-1">{selectedYear}</CardDescription>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground text-xs">Avg / month</div>
              <div className="font-bold">{money(avg)}</div>
            </div>
          </div>
          <div className="min-h-52 flex-1">
            <SpendingTrendChart data={yearTrend} />
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Monthly spending</CardTitle>
              <CardDescription className="mt-1">By category</CardDescription>
            </div>
            <Link href="/categories" className="text-primary text-sm">
              Details
            </Link>
          </div>
          <CategoryDonut categories={outCats} />
        </Card>
      </div>

      {/* Category bars + accounts */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <div>
            <CardTitle>Spending by category</CardTitle>
            <CardDescription className="mt-1">
              {monthLabel(month)}
            </CardDescription>
          </div>
          <CategoryBars
            categories={outCats}
            transfersCount={s.transfersCount}
            transfersTotal={s.transfersTotal}
          />
        </Card>

        <AccountsPanel
          accounts={data.accounts}
          canConnect={banksConfigured}
          onConnect={connect}
        />
      </div>

      {/* Recent transactions snapshot */}
      {s.transactions.length > 0 && (
        <TransactionsList
          transactions={s.transactions}
          month={month}
          onSetCategory={setCategory}
        />
      )}
    </>
  );
}
