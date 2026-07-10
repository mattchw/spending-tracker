"use client";

import { useDashboard } from "@/components/dashboard/dashboard-context";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATUS: Record<string, { label: string; className: string }> = {
  ok: { label: "Active", className: "border-in/25 bg-in/10 text-in" },
  soon: {
    label: "Expiring soon",
    className: "border-chart-3/30 bg-chart-3/10 text-chart-3",
  },
  expired: {
    label: "Expired",
    className: "border-out/25 bg-out/10 text-out",
  },
};

const fmtDate = (ms: number | null) =>
  ms
    ? new Date(ms).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

export default function SettingsPage() {
  const { data, banksConfigured, busy, connect } = useDashboard();

  const connections = data?.connections ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardTitle>Bank connections</CardTitle>
        <CardDescription>
          {banksConfigured
            ? "Connect a bank via TrueLayer’s secure hosted login. Reconnect an existing bank to backfill older history or renew access."
            : "Add your TrueLayer credentials below, then you can connect banks."}
        </CardDescription>

        {connections.length > 0 && (
          <div className="mt-2">
            {connections.map((c) => {
              const s = STATUS[c.status] ?? STATUS.ok;
              return (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-t py-3 first:border-t-0"
                >
                  <div>
                    <div className="font-medium">{c.provider}</div>
                    <div className="text-muted-foreground mt-0.5 text-xs">
                      Connected {fmtDate(c.connectedAt)}
                      {c.daysLeft !== null &&
                        (c.status === "expired"
                          ? " · access expired"
                          : ` · access renews needed in ${c.daysLeft} day${c.daysLeft === 1 ? "" : "s"}`)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Badge variant="outline" className={s.className}>
                      {s.label}
                    </Badge>
                    {banksConfigured && c.status !== "ok" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={connect}
                        disabled={busy}
                      >
                        Reconnect
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {banksConfigured && (
          <div>
            <Button onClick={connect} disabled={busy} variant="gradient">
              {busy ? "Starting…" : "+ Connect a bank"}
            </Button>
          </div>
        )}
      </Card>

      {!banksConfigured && (
        <Card>
          <CardTitle>⚙️ Setup needed</CardTitle>
          <CardDescription>
            Create a free app at <code>console.truelayer.com</code>, then set{" "}
            <code>TRUELAYER_CLIENT_ID</code> and{" "}
            <code>TRUELAYER_CLIENT_SECRET</code> in <code>.env.local</code> (see{" "}
            <code>README.md</code>) and restart the dev server.
          </CardDescription>
        </Card>
      )}

      <Card>
        <CardTitle>History backfill</CardTitle>
        <CardDescription>
          Banks only return more than 90 days of history right after you
          authenticate. To pull older transactions (up to ~2 years, depending on
          the bank), reconnect that bank from here — the connect flow fetches its
          full available history.
        </CardDescription>
      </Card>
    </div>
  );
}
