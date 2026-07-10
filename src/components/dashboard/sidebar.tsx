"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutGrid,
  ListOrdered,
  CreditCard,
  PieChart,
  Target,
  RefreshCw,
  Settings,
  LogOut,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type SessionUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export const NAV = [
  { label: "Overview", href: "/", icon: LayoutGrid },
  { label: "Transactions", href: "/transactions", icon: ListOrdered },
  { label: "Budgets", href: "/budgets", icon: Target },
  { label: "Recurring", href: "/recurring", icon: RefreshCw },
  { label: "Categories", href: "/categories", icon: PieChart },
  { label: "Accounts", href: "/accounts", icon: CreditCard },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({ user }: { user?: SessionUser | null }) {
  const pathname = usePathname();

  return (
    <aside className="bg-sidebar border-sidebar-border sticky top-0 hidden h-screen w-58 flex-none flex-col overflow-y-auto border-r px-3.5 py-5 md:flex">
      <div className="flex items-center gap-2.5 px-2 pb-6 text-lg font-bold">
        <span className="grid size-8 place-items-center rounded-lg font-extrabold text-white [background:var(--grad)]">
          £
        </span>
        Spending Tracker
      </div>
      <nav className="flex flex-col gap-0.5">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={label}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-4.5" />
              {label}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="border-sidebar-border mt-auto flex items-center gap-2.5 border-t pt-4">
          {user.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.image}
              alt={user.name || "You"}
              className="size-8 flex-none rounded-full"
            />
          ) : (
            <span className="bg-sidebar-accent grid size-8 flex-none place-items-center rounded-full text-sm font-semibold">
              {(user.name || user.email || "?").charAt(0).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">
              {user.name || "Signed in"}
            </div>
            {user.email && (
              <div className="text-muted-foreground truncate text-xs">
                {user.email}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/signin" })}
            title="Sign out"
            className="text-muted-foreground hover:text-foreground hover:bg-sidebar-accent grid size-8 flex-none place-items-center rounded-lg transition-colors"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      )}
    </aside>
  );
}
