"use client";

import { ArrowLeftRight, Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { BankLogo } from "@/components/dashboard/bank-logo";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CATEGORIES, categoryLabel } from "@/lib/categorize";
import { dayLabel, money } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Tx } from "@/lib/types";

export function TransactionRow({
  t,
  onSetCategory,
  showDate = true,
}: {
  t: Tx;
  onSetCategory: (id: string, category: string) => void;
  showDate?: boolean;
}) {
  const hasTip = Boolean(t.account || (t.details && t.details.length > 0));
  const name = <span className="truncate text-sm">{t.description}</span>;

  return (
    <div
      className={cn(
        "flex items-center gap-3.5 border-t py-3 first:border-t-0",
        t.is_internal && "opacity-55"
      )}
    >
      <BankLogo
        logo={t.logo ?? null}
        bank={t.bank || t.description || "?"}
        className="size-9 rounded-full"
      />

      <div className="min-w-0 flex-1">
        {hasTip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="block max-w-full cursor-default truncate text-left">
                {name}
              </button>
            </TooltipTrigger>
            <TooltipContent align="start" className="min-w-56">
              {t.account && (
                <div className="flex justify-between gap-4 py-0.5">
                  <span className="text-muted-foreground font-medium">
                    Account
                  </span>
                  <span className="text-right">{t.account}</span>
                </div>
              )}
              {t.details?.map((d) => (
                <div key={d.label} className="flex justify-between gap-4 py-0.5">
                  <span className="text-muted-foreground font-medium">
                    {d.label}
                  </span>
                  <span className="text-right break-words">{d.value}</span>
                </div>
              ))}
            </TooltipContent>
          </Tooltip>
        ) : (
          name
        )}

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {t.bank && (
            <span className="text-muted-foreground text-xs">{t.bank}</span>
          )}
          {t.is_internal ? (
            <Badge variant="secondary">
              <ArrowLeftRight /> Internal transfer
            </Badge>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  title="Click to change category (remembered for similar transactions)"
                  className="border-border bg-card-2 text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs"
                >
                  {categoryLabel(t.category)}
                  <Pencil className="size-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-72">
                {CATEGORIES.map((c) => (
                  <DropdownMenuItem key={c} onSelect={() => onSetCategory(t.id, c)}>
                    {categoryLabel(c)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {showDate && (
        <div className="text-muted-foreground hidden w-16 text-right text-xs sm:block">
          {dayLabel(t.booking_date)}
        </div>
      )}
      <div
        className={cn(
          "text-right font-semibold tabular-nums whitespace-nowrap sm:w-30",
          t.is_internal
            ? "text-muted-foreground"
            : t.direction === "in"
              ? "text-in"
              : "text-out"
        )}
      >
        {t.direction === "in" ? "+" : "−"}
        {money(t.amount, t.currency)}
      </div>
    </div>
  );
}
