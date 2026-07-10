"use client";

import { CategoryDonut } from "@/components/dashboard/category-donut";
import { CategoryBars } from "@/components/dashboard/category-bars";
import { useDashboard } from "@/components/dashboard/dashboard-context";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { money, monthLabel } from "@/lib/format";

export default function CategoriesPage() {
  const { data, month } = useDashboard();
  if (!data) return null;

  const s = data.summary;
  const outCats = s.byCategory.filter((c) => c.direction === "out");
  const inCats = s.byCategory.filter((c) => c.direction === "in");
  const donutCats = outCats.slice(0, 8);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <div>
            <CardTitle>Spending split</CardTitle>
            <CardDescription className="mt-1">{monthLabel(month)}</CardDescription>
          </div>
          <CategoryDonut categories={donutCats} />
        </Card>

        <Card>
          <div>
            <CardTitle>All spending categories</CardTitle>
            <CardDescription className="mt-1">
              {outCats.length} categor{outCats.length === 1 ? "y" : "ies"}
            </CardDescription>
          </div>
          <CategoryBars
            categories={outCats}
            transfersCount={s.transfersCount}
            transfersTotal={s.transfersTotal}
          />
        </Card>
      </div>

      {inCats.length > 0 && (
        <Card>
          <CardTitle>Income by category</CardTitle>
          <div>
            {inCats.map((c) => (
              <div
                key={c.category}
                className="flex items-center justify-between border-t py-2.5 text-sm first:border-t-0"
              >
                <span>{c.category}</span>
                <span className="text-in font-semibold tabular-nums">
                  {money(c.amount)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
