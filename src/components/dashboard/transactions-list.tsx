"use client";

import { useState } from "react";

import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { TransactionRow } from "@/components/dashboard/transaction-row";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { categoryLabel } from "@/lib/categorize";
import { monthLabel } from "@/lib/format";
import type { Tx } from "@/lib/types";

const ALL = "__all__";

export function TransactionsList({
  transactions,
  month,
  onSetCategory,
  title = "Recent transactions",
  description,
  defaultShowAll = false,
  advancedFilters = false,
}: {
  transactions: Tx[];
  month: string;
  onSetCategory: (id: string, category: string) => void;
  title?: string;
  description?: string;
  defaultShowAll?: boolean;
  advancedFilters?: boolean;
}) {
  const [showAll, setShowAll] = useState(defaultShowAll);
  const [category, setCategory] = useState<string>(ALL);
  const [query, setQuery] = useState("");
  const [direction, setDirection] = useState<string>(ALL);
  const [account, setAccount] = useState<string>(ALL);

  // Categories actually present this month (sorted), for the filter dropdown.
  const presentCategories = Array.from(
    new Set(transactions.map((t) => t.category).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));
  const presentAccounts = Array.from(
    new Set(transactions.map((t) => t.account).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b));

  const q = query.trim().toLowerCase();
  const filtered = transactions.filter((t) => {
    if (category !== ALL && t.category !== category) return false;
    if (advancedFilters) {
      if (direction !== ALL && t.direction !== direction) return false;
      if (account !== ALL && t.account !== account) return false;
      if (q && !`${t.description} ${t.account ?? ""}`.toLowerCase().includes(q))
        return false;
    }
    return true;
  });
  const rows = showAll ? filtered : filtered.slice(0, 8);
  const resetPage = () => setShowAll(defaultShowAll);

  return (
    <Card id="transactions">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="mt-1">
            {advancedFilters
              ? `${filtered.length} of ${transactions.length} · ${monthLabel(month)}`
              : (description ?? monthLabel(month))}
          </CardDescription>
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={category}
            onValueChange={(v) => {
              setCategory(v);
              resetPage();
            }}
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {presentCategories.map((c) => (
                <SelectItem key={c} value={c}>
                  {categoryLabel(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filtered.length > 8 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="text-primary cursor-pointer text-sm"
            >
              {showAll ? "Show less" : "View all"}
            </button>
          )}
        </div>
      </div>

      {advancedFilters && (
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="search"
            placeholder="Search description or account…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              resetPage();
            }}
            className="border-input bg-card focus-visible:ring-ring/50 h-9 min-w-56 flex-1 rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]"
          />
          <Select
            value={direction}
            onValueChange={(v) => {
              setDirection(v);
              resetPage();
            }}
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Money in &amp; out</SelectItem>
              <SelectItem value="in">Money in</SelectItem>
              <SelectItem value="out">Money out</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={account}
            onValueChange={(v) => {
              setAccount(v);
              resetPage();
            }}
          >
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All accounts</SelectItem>
              {presentAccounts.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        {rows.length === 0 && (
          <p className="text-muted-foreground py-2 text-sm">
            No transactions match these filters.
          </p>
        )}
        {rows.map((t) => (
          <TransactionRow key={t.id} t={t} onSetCategory={onSetCategory} />
        ))}
      </div>
    </Card>
  );
}
