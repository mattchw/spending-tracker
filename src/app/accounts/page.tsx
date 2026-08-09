"use client";

import { BankLogo } from "@/components/dashboard/bank-logo";
import { BalanceDonut } from "@/components/dashboard/balance-donut";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ConnectionHealth } from "@/lib/types";

const connectionStatus = (c: ConnectionHealth) => {
  if (c.status === "expired")
    return { text: "Access expired — reconnect", className: "text-out" };
  if (c.status === "soon")
    return {
      text: `Access expires in ${c.daysLeft} day${c.daysLeft === 1 ? "" : "s"}`,
      className: "text-chart-3",
    };
  return {
    text:
      c.daysLeft != null
        ? `Active · ${c.daysLeft} day${c.daysLeft === 1 ? "" : "s"} of access left`
        : "Active",
    className: "text-muted-foreground",
  };
};

const syncedLabel = (ms: number | null) => {
  if (!ms) return "Not synced yet";
  return `Synced ${new Date(ms).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

export default function AccountsPage() {
  const { data, banksConfigured, busy, connect } = useDashboard();
  if (!data) return null;

  const accounts = [...data.accounts].sort(
    (a, b) => (b.balance ?? -Infinity) - (a.balance ?? -Infinity)
  );
  const byCurrency = Object.entries(data.balances.byCurrency);

  // Balance composition for the primary (largest-total) currency, positive
  // balances only so the pie represents assets you actually hold.
  const primaryCcy = [...byCurrency].sort((a, b) => b[1] - a[1])[0]?.[0];
  const balanceSlices = primaryCcy
    ? accounts
        .filter(
          (a) =>
            typeof a.balance === "number" &&
            a.balance > 0 &&
            (a.balance_currency || a.currency) === primaryCcy
        )
        .map((a) => ({ label: `${a.bank} — ${a.name}`, value: a.balance as number }))
    : [];

  if (accounts.length === 0) {
    return (
      <Card className="items-center p-10 text-center">
        <CardTitle>No accounts connected</CardTitle>
        <CardDescription>
          Connect a bank to see balances and transactions here.
        </CardDescription>
        {banksConfigured && (
          <Button
            variant="gradient"
            className="mt-3"
            onClick={connect}
            disabled={busy}
          >
            {busy ? "Starting…" : "+ Connect a bank"}
          </Button>
        )}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Totals by currency */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {byCurrency.map(([ccy, total]) => (
          <Card key={ccy}>
            <CardDescription>Total balance ({ccy})</CardDescription>
            <div className="text-2xl font-bold tracking-tight">
              {money(total, ccy)}
            </div>
          </Card>
        ))}
      </div>

      {/* Balance composition */}
      {balanceSlices.length > 0 && (
        <Card>
          <div>
            <CardTitle>Balance composition</CardTitle>
            <CardDescription className="mt-1">
              How your {primaryCcy} balance is split across accounts
            </CardDescription>
          </div>
          <BalanceDonut slices={balanceSlices} currency={primaryCcy} />
        </Card>
      )}

      {/* Bank connections — reconnect to renew access or refresh transactions */}
      {(data.connections?.length ?? 0) > 0 && (
        <Card>
          <div>
            <CardTitle>Bank connections</CardTitle>
            <CardDescription className="mt-1">
              Reconnect a bank to renew access or refresh its transactions. Some
              banks (e.g. Lloyds, Monzo) only share new transactions right after
              you sign in, so reconnect them when you want the latest.
            </CardDescription>
          </div>
          <div>
            {data.connections.map((c) => {
              const status = connectionStatus(c);
              const logo =
                accounts.find(
                  (a) => a.bank?.toLowerCase() === c.provider?.toLowerCase()
                )?.logo ?? null;
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3.5 border-t py-3.5 first:border-t-0"
                >
                  <BankLogo
                    logo={logo}
                    bank={c.provider}
                    className="size-10 rounded-full"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{c.provider}</div>
                    <div className={cn("text-xs", status.className)}>
                      {status.text}
                    </div>
                  </div>
                  {banksConfigured && (
                    <Button
                      variant={c.status === "expired" ? "gradient" : "outline"}
                      size="sm"
                      onClick={connect}
                      disabled={busy}
                    >
                      {busy ? "Starting…" : "Reconnect"}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* All accounts */}
      <Card>
        <CardTitle>All accounts &amp; cards</CardTitle>
        <div>
          {accounts.map((a) => (
            <div
              key={a.uid}
              className="flex items-center gap-3.5 border-t py-3.5 first:border-t-0"
            >
              <BankLogo
                logo={a.logo}
                bank={a.bank}
                className="size-10 rounded-full"
              />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">
                  {a.bank} — {a.name}
                </div>
                <div className="text-muted-foreground text-xs">
                  {a.kind === "card" ? "Card" : "Account"} · {a.currency} ·{" "}
                  {syncedLabel(a.last_synced_at)}
                </div>
              </div>
              <div className="text-right">
                {typeof a.balance === "number" ? (
                  <div className="font-semibold tabular-nums">
                    {money(a.balance, a.balance_currency || a.currency)}
                  </div>
                ) : (
                  <div className="text-out text-xs">reconnect for balance</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
