"use client";

import { useEffect, useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";

import { useDashboard } from "@/components/dashboard/dashboard-context";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, categoryLabel } from "@/lib/categorize";
import { money, monthLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

function BudgetRow({
  category,
  limit,
  spent,
  onSave,
  onRemove,
}: {
  category: string;
  limit: number;
  spent: number;
  onSave: (v: number) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(limit));
  const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
  const ratio = limit > 0 ? spent / limit : 0;
  const barColor =
    ratio >= 1
      ? "var(--out)"
      : ratio >= 0.8
        ? "var(--chart-3)"
        : "var(--in)";
  const remaining = limit - spent;

  const startEdit = () => {
    setValue(String(limit));
    setEditing(true);
  };
  const save = () => {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0 && n !== limit) onSave(n);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-3 border-t py-3 first:border-t-0">
      <span className="w-40 shrink-0 truncate font-medium">
        {categoryLabel(category)}
      </span>

      <div className="bg-border h-2 flex-1 overflow-hidden rounded-full">
        <span
          className="block h-full rounded-full transition-[width]"
          style={{ width: `${pct}%`, background: barColor }}
        />
      </div>

      {editing ? (
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground text-sm">£</span>
          <input
            autoFocus
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            className="border-input bg-card focus-visible:ring-ring/50 h-8 w-24 rounded-md border px-2 text-sm outline-none focus-visible:ring-[3px]"
          />
        </div>
      ) : (
        <span
          className={cn(
            "w-48 text-right text-xs tabular-nums",
            ratio >= 1 ? "text-out" : "text-muted-foreground"
          )}
        >
          {money(spent)} / {money(limit)}
          {remaining >= 0
            ? ` · ${money(remaining)} left`
            : ` · ${money(-remaining)} over`}
        </span>
      )}

      {editing ? (
        <div className="flex items-center gap-1">
          <button
            onClick={save}
            title="Save"
            className="text-muted-foreground hover:text-in cursor-pointer"
          >
            <Check className="size-4" />
          </button>
          <button
            onClick={() => setEditing(false)}
            title="Cancel"
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <button
            onClick={startEdit}
            title="Edit budget"
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Pencil className="size-4" />
          </button>
          <button
            onClick={onRemove}
            title="Remove budget"
            className="text-muted-foreground hover:text-out cursor-pointer"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function BudgetsPage() {
  const { data, month, setBudget } = useDashboard();
  const [newCat, setNewCat] = useState("");
  const [newAmt, setNewAmt] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAdding(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!data) return null;

  const spentByCat = new Map(
    data.summary.byCategory
      .filter((c) => c.direction === "out")
      .map((c) => [c.category, c.amount])
  );
  const budgets = [...data.budgets].sort((a, b) => a.category.localeCompare(b.category));
  const budgetedTotal = budgets.reduce((a, b) => a + b.limit, 0);
  const spentOfBudgeted = budgets.reduce(
    (a, b) => a + (spentByCat.get(b.category) || 0),
    0
  );
  const budgetedCats = new Set(budgets.map((b) => b.category));
  const available = CATEGORIES.filter((c) => !budgetedCats.has(c));

  const openAdd = () => {
    setNewCat("");
    setNewAmt("");
    setAdding(true);
  };
  const addBudget = () => {
    const amt = Number(newAmt);
    if (!newCat || !Number.isFinite(amt) || amt <= 0) return;
    setBudget(newCat, amt);
    setNewCat("");
    setNewAmt("");
    setAdding(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardDescription>Total budget</CardDescription>
          <div className="text-2xl font-bold tracking-tight">
            {money(budgetedTotal)}
          </div>
        </Card>
        <Card>
          <CardDescription>Spent so far</CardDescription>
          <div className="text-2xl font-bold tracking-tight">
            {money(spentOfBudgeted)}
          </div>
        </Card>
        <Card>
          <CardDescription>Remaining</CardDescription>
          <div
            className={cn(
              "text-2xl font-bold tracking-tight",
              budgetedTotal - spentOfBudgeted < 0 ? "text-out" : "text-in"
            )}
          >
            {money(budgetedTotal - spentOfBudgeted)}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Monthly budgets</CardTitle>
            <CardDescription className="mt-1">
              {monthLabel(month)}
            </CardDescription>
          </div>
          <Button
            variant="gradient"
            size="sm"
            onClick={openAdd}
            disabled={available.length === 0}
          >
            <Plus className="size-4" /> Add budget
          </Button>
        </div>

        {budgets.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No budgets yet. Add one below to start tracking against a limit.
          </p>
        ) : (
          <div>
            {budgets.map((b) => (
              <BudgetRow
                key={b.category}
                category={b.category}
                limit={b.limit}
                spent={spentByCat.get(b.category) || 0}
                onSave={(v) => setBudget(b.category, v)}
                onRemove={() => setBudget(b.category, 0)}
              />
            ))}
          </div>
        )}
      </Card>

      {adding && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setAdding(false)}
          />
          <Card className="relative z-10 w-full max-w-sm gap-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <CardTitle>Add a budget</CardTitle>
              <button
                onClick={() => setAdding(false)}
                aria-label="Close"
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>
            <CardDescription>Monthly limit for {monthLabel(month)}</CardDescription>
            <div className="flex flex-col gap-3">
              <Select value={newCat} onValueChange={setNewCat}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {available.map((c) => (
                    <SelectItem key={c} value={c}>
                      {categoryLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="border-input bg-card flex items-center gap-1.5 rounded-md border px-3">
                <span className="text-muted-foreground text-sm">£</span>
                <input
                  type="number"
                  placeholder="0"
                  value={newAmt}
                  onChange={(e) => setNewAmt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addBudget();
                  }}
                  className="h-9 flex-1 bg-transparent text-sm outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAdding(false)}>
                Cancel
              </Button>
              <Button
                variant="gradient"
                onClick={addBudget}
                disabled={!newCat || !newAmt}
              >
                Add budget
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
