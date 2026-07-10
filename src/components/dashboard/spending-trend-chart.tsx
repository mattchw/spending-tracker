"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { money, monthShort } from "@/lib/format";
import type { Trend } from "@/lib/types";

export function SpendingTrendChart({ data }: { data: Trend[] }) {
  if (data.length === 0) {
    return (
      <div className="text-muted-foreground grid h-full place-items-center py-10 text-center">
        No data yet
      </div>
    );
  }

  const points = data.map((t) => ({ month: monthShort(t.month), out: t.totalOut }));

  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={200}>
      <AreaChart data={points} margin={{ top: 8, right: 16, left: 16, bottom: 0 }}>
        <defs>
          <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          interval={0}
          padding={{ left: 12, right: 12 }}
          dy={6}
        />
        <YAxis hide domain={[0, "dataMax"]} />
        <Tooltip
          cursor={{ stroke: "var(--border)" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            color: "var(--foreground)",
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--muted-foreground)" }}
          formatter={(v) => [money(Number(v)), "Spent"]}
        />
        <Area
          type="monotone"
          dataKey="out"
          stroke="var(--chart-1)"
          strokeWidth={2.5}
          fill="url(#trendArea)"
          dot={{ r: 2.5, fill: "var(--chart-1)" }}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
