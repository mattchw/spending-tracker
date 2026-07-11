"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Menu, X, LogOut } from "lucide-react";

import { NAV, type SessionUser } from "@/components/dashboard/sidebar";
import { cn } from "@/lib/utils";

/**
 * Mobile navigation: a hamburger button (shown only below `md`) that opens a
 * slide-out drawer mirroring the desktop sidebar. The desktop `<Sidebar>` is
 * `hidden md:flex`, so this is the only nav on small screens.
 */
export function MobileNav({ user }: { user?: SessionUser | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer whenever the route changes (i.e. a link was tapped).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent the page behind the drawer from scrolling while it's open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="text-muted-foreground hover:text-foreground hover:bg-sidebar-accent grid size-10 flex-none place-items-center rounded-lg transition-colors"
      >
        <Menu className="size-5.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <aside className="bg-sidebar border-sidebar-border relative flex h-full w-72 max-w-[80vw] flex-col overflow-y-auto border-r px-3.5 py-5">
            <div className="mb-6 flex items-center justify-between px-2">
              <div className="flex items-center gap-2.5 text-lg font-bold">
                <span className="grid size-8 place-items-center rounded-lg font-extrabold text-white [background:var(--grad)]">
                  £
                </span>
                True Spndr
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="text-muted-foreground hover:text-foreground hover:bg-sidebar-accent grid size-8 flex-none place-items-center rounded-lg transition-colors"
              >
                <X className="size-4.5" />
              </button>
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
        </div>
      )}
    </div>
  );
}
