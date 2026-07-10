"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Card, CardTitle } from "@/components/ui/card";
import { BankLogo } from "@/components/dashboard/bank-logo";
import { money } from "@/lib/format";
import type { Account } from "@/lib/types";

const DEFAULT_VISIBLE = 3;

export function AccountsPanel({
  accounts,
  canConnect,
  onConnect,
}: {
  accounts: Account[];
  canConnect: boolean;
  onConnect: () => void;
}) {
  const [showAll, setShowAll] = useState(false);

  const sorted = [...accounts].sort(
    (a, b) => (b.balance ?? -Infinity) - (a.balance ?? -Infinity)
  );
  const hero = sorted.find((a) => typeof a.balance === "number") || sorted[0];
  const rest = sorted.filter((a) => a.uid !== hero?.uid);
  const visibleRest = showAll ? rest : rest.slice(0, DEFAULT_VISIBLE);

  return (
    <Card id="accounts">
      <div className="flex items-center justify-between">
        <CardTitle>Cards &amp; accounts</CardTitle>
        <div className="flex items-center gap-4">
          {canConnect && (
            <button
              onClick={onConnect}
              className="text-primary flex cursor-pointer items-center gap-1 text-sm"
            >
              <Plus className="size-3.5" /> Add
            </button>
          )}
          {rest.length > DEFAULT_VISIBLE && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="text-primary cursor-pointer text-sm"
            >
              {showAll ? "Show less" : "View all"}
            </button>
          )}
        </div>
      </div>

      {hero && (
        <div className="rounded-2xl p-4.5 text-white shadow-lg [background:var(--grad-blue)]">
          <div className="flex items-center justify-between text-sm opacity-90">
            <span className="flex items-center gap-2">
              <BankLogo
                logo={hero.logo}
                bank={hero.bank}
                className="size-7 rounded-full border-0 bg-white/95 shadow-sm"
              />
              {hero.bank}
            </span>
            <span>{hero.kind === "card" ? "CARD" : "BANK"}</span>
          </div>
          <div className="my-3 text-3xl font-bold tracking-tight">
            {typeof hero.balance === "number"
              ? money(hero.balance, hero.balance_currency || hero.currency)
              : "—"}
          </div>
          <div className="text-sm tracking-widest opacity-90">{hero.name}</div>
        </div>
      )}

      <div>
        {visibleRest.map((a) => (
          <div
            key={a.uid}
            className="flex items-center gap-3 border-t py-2.5 first:border-t-0"
          >
            <BankLogo logo={a.logo} bank={a.bank} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">
                {a.bank} — {a.name}
              </div>
              <div className="text-muted-foreground text-xs">
                {a.kind === "card" ? "Card" : "Account"}
                {a.last_synced_at ? "" : " · not synced"}
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
  );
}
