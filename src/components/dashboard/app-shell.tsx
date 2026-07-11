"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Sidebar, NAV, type SessionUser } from "@/components/dashboard/sidebar";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { greeting, monthName } from "@/lib/format";
import { cn } from "@/lib/utils";

// Pages that are scoped to a month/year show the period pickers in the top bar.
const PERIOD_PAGES = new Set([
  "/",
  "/transactions",
  "/categories",
  "/budgets",
]);

export function AppShell({
  children,
  user,
}: {
  children: ReactNode;
  user: SessionUser | null;
}) {
  const pathname = usePathname();
  const { data, month, banksConfigured, busy, note, connect, sync, selectMonth } =
    useDashboard();

  // The sign-in page renders outside the dashboard chrome.
  if (pathname === "/signin") return <>{children}</>;

  const staleConsents = (data?.connections ?? []).filter(
    (c) => c.status !== "ok"
  );
  const anyExpired = staleConsents.some((c) => c.status === "expired");

  const title =
    NAV.find((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)))
      ?.label || "Overview";
  const isOverview = pathname === "/";
  const showPeriod = PERIOD_PAGES.has(pathname) && (data?.months.length ?? 0) > 0;

  const years = data
    ? Array.from(new Set(data.months.map((m) => m.slice(0, 4)))).sort((a, b) =>
        b.localeCompare(a)
      )
    : [];
  const selectedYear = month.slice(0, 4);
  const monthsInYear = data
    ? data.months.filter((m) => m.startsWith(selectedYear))
    : [];

  const selectYear = (year: string) => {
    if (!data) return;
    const mm = month.slice(5, 7);
    const target =
      data.months.find((m) => m === `${year}-${mm}`) ||
      data.months.filter((m) => m.startsWith(year)).sort().at(-1);
    if (target) selectMonth(target);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <main className="w-full min-w-0 flex-1 px-4 py-5 pb-16 sm:px-6 lg:px-10">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <MobileNav user={user} />
            <div>
              {isOverview && (
                <div className="text-muted-foreground text-sm">{greeting()}</div>
              )}
              <h1 className="mt-0.5 text-2xl font-bold">{title}</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {showPeriod && (
              <>
                <Select value={selectedYear} onValueChange={selectYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={month} onValueChange={selectMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthsInYear.map((m) => (
                      <SelectItem key={m} value={m}>
                        {monthName(m)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            {banksConfigured && (
              <Button variant="outline" onClick={connect} disabled={busy}>
                + Connect bank
              </Button>
            )}
            {(data?.accounts.length ?? 0) > 0 && (
              <Button variant="gradient" onClick={sync} disabled={busy}>
                {busy ? "Syncing…" : "Sync now"}
              </Button>
            )}
          </div>
        </div>

        {note && (
          <div
            className={cn(
              "mb-4 rounded-lg border px-4 py-2.5 text-sm",
              note.kind === "ok"
                ? "border-in/25 bg-in/10 text-in"
                : "border-out/25 bg-out/10 text-out"
            )}
          >
            {note.text}
          </div>
        )}

        {staleConsents.length > 0 && (
          <div
            className={cn(
              "mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm",
              anyExpired
                ? "border-out/25 bg-out/10 text-out"
                : "border-chart-3/30 bg-chart-3/10 text-chart-3"
            )}
          >
            <span>
              {anyExpired
                ? `Bank access has expired for ${staleConsents.length} connection${staleConsents.length === 1 ? "" : "s"}. Reconnect to keep balances and transactions up to date.`
                : `Bank access expires soon for ${staleConsents.length} connection${staleConsents.length === 1 ? "" : "s"}. Reconnect to avoid interruption.`}
            </span>
            {banksConfigured && (
              <Button
                variant={anyExpired ? "gradient" : "outline"}
                size="sm"
                onClick={connect}
                disabled={busy}
              >
                Reconnect
              </Button>
            )}
          </div>
        )}

        {!data ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
