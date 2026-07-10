"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

import { Card } from "@/components/ui/card";
import { TransactionRow } from "@/components/dashboard/transaction-row";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";
import { categoryColor, type Tx } from "@/lib/types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_PREVIEW = 3;

const compact = (n: number, ccy = "GBP") =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: ccy || "GBP",
    maximumFractionDigits: 0,
  }).format(n);

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

export function CalendarView({
  transactions,
  month,
  onSetCategory,
}: {
  transactions: Tx[];
  month: string;
  onSetCategory: (id: string, category: string) => void;
}) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const lastDay = useRef<string | null>(null);
  if (selectedDay) lastDay.current = selectedDay;

  const [year, monthIndex] = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    return [y, m - 1] as const;
  }, [month]);

  // Transactions grouped by day-of-month, biggest amounts first.
  const byDay = useMemo(() => {
    const map = new Map<number, Tx[]>();
    for (const t of transactions) {
      if (!t.booking_date?.startsWith(month)) continue;
      const day = Number(t.booking_date.slice(8, 10));
      const arr = map.get(day) || [];
      arr.push(t);
      map.set(day, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => b.amount - a.amount);
    return map;
  }, [transactions, month]);

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leadingBlanks = new Date(year, monthIndex, 1).getDay(); // 0 = Sunday
  const totalCells = Math.ceil((leadingBlanks + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const day = i - leadingBlanks + 1;
    return day >= 1 && day <= daysInMonth ? day : null;
  });

  const today = todayISO();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedDay(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const open = selectedDay !== null;
  const showDay = selectedDay ?? lastDay.current;
  const dayTxs = showDay
    ? [...transactions]
        .filter((t) => t.booking_date === showDay)
        .sort((a, b) => b.amount - a.amount)
    : [];
  const dayIn = dayTxs
    .filter((t) => !t.is_internal && t.direction === "in")
    .reduce((s, t) => s + t.amount, 0);
  const dayOut = dayTxs
    .filter((t) => !t.is_internal && t.direction === "out")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="flex items-start">
      <Card className="min-w-0 flex-1">
      <div className="mb-1.5 grid grid-cols-7 gap-1.5">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="text-muted-foreground px-1 text-xs font-medium tracking-wide uppercase"
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const dateStr = `${month}-${String(day).padStart(2, "0")}`;
          const txs = byDay.get(day) || [];
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDay;
          const preview = txs.slice(0, MAX_PREVIEW);
          const extra = txs.length - preview.length;
          const hasTx = txs.length > 0;
          const net = txs.reduce(
            (s, t) =>
              t.is_internal
                ? s
                : s + (t.direction === "in" ? t.amount : -t.amount),
            0
          );

          return (
            <button
              key={i}
              type="button"
              disabled={!hasTx}
              onClick={() => hasTx && setSelectedDay(dateStr)}
              className={cn(
                "relative min-h-36 rounded-lg border p-2 text-left align-top transition-colors",
                hasTx
                  ? "hover:border-primary/60 cursor-pointer"
                  : "cursor-default",
                isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border/70 bg-card-2/40"
              )}
            >
              <span
                className={cn(
                  "absolute top-2 left-2 grid size-6 place-items-center rounded-full text-sm",
                  isToday
                    ? "bg-primary text-primary-foreground font-semibold"
                    : hasTx
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                )}
              >
                {day}
              </span>
              {hasTx && (
                <span
                  className={cn(
                    "absolute top-2.5 right-2 text-[11px] tabular-nums",
                    net >= 0 ? "text-in" : "text-out"
                  )}
                >
                  {net >= 0 ? "+" : "−"}
                  {compact(Math.abs(net))}
                </span>
              )}
              <div className="space-y-1 pt-8">
                {preview.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-1.5"
                    title={t.description}
                  >
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor: t.is_internal
                          ? "var(--muted-foreground)"
                          : categoryColor(t.category),
                      }}
                    />
                    <span className="text-foreground/80 truncate text-[11px] leading-tight">
                      {t.description}
                    </span>
                  </div>
                ))}
                {extra > 0 && (
                  <div className="text-muted-foreground pl-3 text-[11px]">
                    +{extra} more
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
      </Card>

      {/* Non-modal docked day detail: pushes the calendar left, no backdrop. */}
      <aside
        aria-hidden={!open}
        className={cn(
          "sticky top-5 shrink-0 self-start overflow-hidden transition-[width,margin,opacity] duration-300",
          open ? "ml-4 w-80 opacity-100" : "w-0 opacity-0"
        )}
      >
        <div className="w-80">
          <Card className="max-h-[calc(100vh-2.5rem)] gap-0 overflow-y-auto p-0">
            <div className="bg-card sticky top-0 z-10 flex items-start justify-between gap-3 border-b p-4">
              <div>
                <div className="text-lg font-semibold">
                  {showDay &&
                    new Date(`${showDay}T00:00:00`).toLocaleDateString("en-GB", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                </div>
                <div className="text-muted-foreground mt-1 flex items-center gap-3 text-sm tabular-nums">
                  <span>
                    {dayTxs.length} transaction{dayTxs.length === 1 ? "" : "s"}
                  </span>
                  {dayIn > 0 && <span className="text-in">+{money(dayIn)}</span>}
                  {dayOut > 0 && (
                    <span className="text-out">−{money(dayOut)}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-muted-foreground hover:text-foreground -mr-1 cursor-pointer rounded-md p-1"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="px-4 pb-2">
              {dayTxs.map((t) => (
                <TransactionRow
                  key={t.id}
                  t={t}
                  onSetCategory={onSetCategory}
                  showDate={false}
                />
              ))}
            </div>
          </Card>
        </div>
      </aside>
    </div>
  );
}
