import { categoryColor, type Cat } from "@/lib/types";
import { categoryLabel } from "@/lib/categorize";
import { money } from "@/lib/format";

export function CategoryBars({
  categories,
  transfersCount,
  transfersTotal,
}: {
  categories: Cat[];
  transfersCount: number;
  transfersTotal: number;
}) {
  const maxCat = Math.max(1, ...categories.map((c) => c.amount));

  return (
    <div>
      {categories.length === 0 && (
        <p className="text-muted-foreground">Nothing to show yet.</p>
      )}
      {categories.map((c) => (
        <div key={c.category} className="my-3">
          <div className="mb-1.5 flex justify-between text-sm">
            <span>{categoryLabel(c.category)}</span>
            <span className="text-muted-foreground tabular-nums">
              {money(c.amount)}
            </span>
          </div>
          <div className="bg-border h-2 overflow-hidden rounded-full">
            <span
              className="block h-full rounded-full"
              style={{
                width: `${(c.amount / maxCat) * 100}%`,
                background: categoryColor(c.category),
              }}
            />
          </div>
        </div>
      ))}
      {transfersCount > 0 && (
        <p className="text-muted-foreground mt-3.5 text-sm">
          Excludes {transfersCount} internal transfer
          {transfersCount === 1 ? "" : "s"} between your accounts (
          {money(transfersTotal)} moved).
        </p>
      )}
    </div>
  );
}
