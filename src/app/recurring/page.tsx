"use client";

import { RefreshCw } from "lucide-react";

import { useDashboard } from "@/components/dashboard/dashboard-context";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { categoryLabel } from "@/lib/categorize";
import { dayLabel, money } from "@/lib/format";

const CADENCE_LABEL: Record<string, string> = {
  weekly: "Weekly",
  fortnightly: "Every 2 weeks",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export default function RecurringPage() {
  const { data } = useDashboard();
  if (!data) return null;

  const items = data.recurring;
  const monthlyTotal = items.reduce((a, r) => a + r.monthlyEstimate, 0);

  if (items.length === 0) {
    return (
      <Card className="items-center p-10 text-center">
        <CardTitle>No recurring payments detected yet</CardTitle>
        <CardDescription>
          Once you have a few months of history, subscriptions and regular bills
          will show up here automatically.
        </CardDescription>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardDescription>Estimated monthly commitments</CardDescription>
          <div className="text-2xl font-bold tracking-tight">
            {money(monthlyTotal)}
          </div>
        </Card>
        <Card>
          <CardDescription>Recurring payments found</CardDescription>
          <div className="text-2xl font-bold tracking-tight">{items.length}</div>
        </Card>
      </div>

      <Card>
        <div>
          <CardTitle>Subscriptions &amp; regular bills</CardTitle>
          <CardDescription className="mt-1">
            Detected from repeating transactions across your history
          </CardDescription>
        </div>
        <div>
          {items.map((r) => (
            <div
              key={r.key}
              className="flex items-center gap-3.5 border-t py-3.5 first:border-t-0"
            >
              <div className="bg-card-2 text-muted-foreground grid size-9 flex-none place-items-center rounded-full">
                <RefreshCw className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{r.description}</div>
                <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <Badge variant="secondary">{CADENCE_LABEL[r.cadence]}</Badge>
                  <span>{categoryLabel(r.category)}</span>
                  <span>· {r.count} payments</span>
                  {r.lastDate && <span>· last {dayLabel(r.lastDate)}</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold tabular-nums">
                  {money(r.amount)}
                </div>
                <div className="text-muted-foreground text-xs tabular-nums">
                  {Math.abs(r.amount - r.avgAmount) >= 1
                    ? `latest · avg ${money(r.avgAmount)}`
                    : `≈ ${money(r.monthlyEstimate)}/mo`}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
