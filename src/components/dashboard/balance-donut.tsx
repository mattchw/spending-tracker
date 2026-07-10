"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { money } from "@/lib/format";
import { CHART_COLORS } from "@/lib/types";

export interface BalanceSlice {
  label: string;
  value: number;
}

export function BalanceDonut({
  slices,
  currency,
}: {
  slices: BalanceSlice[];
  currency: string;
}) {
  const total = slices.reduce((a, s) => a + s.value, 0);
  const totalLabel = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: currency || "GBP",
    maximumFractionDigits: 0,
  }).format(total);

  if (slices.length === 0 || total <= 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No positive balances to break down.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative h-52 w-52 flex-none">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              innerRadius="64%"
              outerRadius="100%"
              paddingAngle={1.5}
              stroke="none"
            >
              {slices.map((s, i) => (
                <Cell
                  key={s.label}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
          <span className="text-muted-foreground text-xs">Total</span>
          <span className="max-w-[70%] text-xl leading-none font-bold tabular-nums">
            {totalLabel}
          </span>
        </div>
      </div>
      <div className="w-full flex-1">
        {slices.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2 py-1 text-sm">
            <span
              className="size-2.5 flex-none rounded-full"
              style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
            />
            <span className="flex-1 truncate">{s.label}</span>
            <span className="text-muted-foreground w-11 text-right">
              {total > 0 ? Math.round((s.value / total) * 100) : 0}%
            </span>
            <span className="w-24 text-right tabular-nums">
              {money(s.value, currency)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
