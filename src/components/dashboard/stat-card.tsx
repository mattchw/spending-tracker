import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function Delta({
  value,
  goodWhenUp,
}: {
  value: number | null;
  goodWhenUp: boolean;
}) {
  if (value === null || !isFinite(value)) {
    return <span className="text-muted-foreground text-xs">— vs last month</span>;
  }
  const up = value >= 0;
  const good = up === goodWhenUp;
  return (
    <span
      className={cn(
        "text-xs font-semibold",
        good ? "text-in" : "text-out"
      )}
    >
      {up ? "+" : ""}
      {value.toFixed(1)}%
      <span className="text-muted-foreground ml-1.5 font-normal">
        vs last month
      </span>
    </span>
  );
}

export function StatCard({
  label,
  icon,
  amount,
  amountClassName,
  children,
}: {
  label: string;
  icon: ReactNode;
  amount: string;
  amountClassName?: string;
  children?: ReactNode;
}) {
  return (
    <Card className="gap-0 p-4.5">
      <div className="text-muted-foreground flex items-center justify-between text-sm">
        {label}
        <span className="opacity-80">{icon}</span>
      </div>
      <div
        className={cn(
          "mt-2 mb-1.5 text-2xl font-bold tracking-tight",
          amountClassName
        )}
      >
        {amount}
      </div>
      {children}
    </Card>
  );
}
