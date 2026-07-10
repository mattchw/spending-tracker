"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

import { categoryLabel } from "@/lib/categorize";
import { money } from "@/lib/format";
import { categoryColor, type Cat } from "@/lib/types";

export function CategoryDonut({ categories }: { categories: Cat[] }) {
  const spent = categories.reduce((a, c) => a + c.amount, 0);
  const spentLabel = new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(spent);

  if (categories.length === 0) {
    return (
      <p className="text-muted-foreground">No spending recorded this month.</p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative h-52 w-52 sm:h-60 sm:w-60">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={categories}
              dataKey="amount"
              nameKey="category"
              innerRadius="64%"
              outerRadius="100%"
              paddingAngle={1.5}
              stroke="none"
            >
              {categories.map((c) => (
                <Cell key={c.category} fill={categoryColor(c.category)} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-2 text-center">
          <span className="text-muted-foreground text-xs">Spent</span>
          <span
            className={`text-xl max-w-[64%] leading-none font-bold tabular-nums`}
          >
            {spentLabel}
          </span>
        </div>
      </div>
      <div className="w-full">
        {categories.map((c) => (
          <div key={c.category} className="flex items-center gap-2 py-1 text-sm">
            <span
              className="size-2.5 flex-none rounded-full"
              style={{ background: categoryColor(c.category) }}
            />
            <span className="flex-1 truncate">{categoryLabel(c.category)}</span>
            <span className="text-muted-foreground w-11 text-right">
              {spent > 0 ? Math.round((c.amount / spent) * 100) : 0}%
            </span>
            <span className="w-19 text-right tabular-nums">{money(c.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
