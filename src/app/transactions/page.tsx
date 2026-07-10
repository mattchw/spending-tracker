"use client";

import { useState } from "react";
import { List, CalendarDays } from "lucide-react";

import { TransactionsList } from "@/components/dashboard/transactions-list";
import { CalendarView } from "@/components/dashboard/calendar-view";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { monthLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

type Mode = "list" | "calendar";

export default function TransactionsPage() {
  const { data, month, setCategory } = useDashboard();
  const [mode, setMode] = useState<Mode>("list");
  if (!data) return null;

  const txs = data.summary.transactions;

  if (txs.length === 0) {
    return (
      <Card className="items-center p-10 text-center">
        <CardTitle>No transactions</CardTitle>
        <CardDescription>
          Nothing recorded for {monthLabel(month)}. Try another month or sync
          your banks.
        </CardDescription>
      </Card>
    );
  }

  const tabs: { id: Mode; label: string; icon: typeof List }[] = [
    { id: "list", label: "List", icon: List },
    { id: "calendar", label: "Calendar", icon: CalendarDays },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <div className="border-border bg-card-2 inline-flex rounded-lg border p-0.5">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setMode(t.id)}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  mode === t.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {mode === "list" ? (
        <TransactionsList
          transactions={txs}
          month={month}
          onSetCategory={setCategory}
          title="All transactions"
          defaultShowAll
          advancedFilters
        />
      ) : (
        <CalendarView
          transactions={txs}
          month={month}
          onSetCategory={setCategory}
        />
      )}
    </div>
  );
}
